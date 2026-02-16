import { createServer as createViteServer } from "vite";
import type { ViteDevServer } from "vite";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";
import type { LuminConfig, RouteHeadConfig } from "../config.js";

/**
 * Merge config head with route-specific head
 * Route head takes precedence for title
 * Meta/link/script arrays are merged
 */
function mergeHead(configHead: LuminConfig['head'], routeHead: RouteHeadConfig | null): {
  title?: string;
  meta: Array<Record<string, string>>;
  link: Array<Record<string, string>>;
  script: Array<Record<string, string>>;
} {
  const merged = {
    title: routeHead?.title || undefined,
    meta: [...(configHead?.meta || []), ...(routeHead?.meta || [])],
    link: [...(configHead?.link || []), ...(routeHead?.link || [])],
    script: [...(configHead?.script || []), ...(routeHead?.script || [])],
  };
  
  return merged;
}

/**
 * Setup happy-dom for SSR rendering
 */
async function setupHappyDom() {
  const { Window } = await import("happy-dom");
  const window = new Window();
  (globalThis as any).window = window;
  (globalThis as any).document = window.document;
  (globalThis as any).HTMLElement = window.HTMLElement;
  (globalThis as any).Node = window.Node;
  (globalThis as any).Element = window.Element;
  (globalThis as any).Comment = window.Comment;
  (globalThis as any).Text = window.Text;
}

export interface SSRServerOptions {
  cwd: string;
  config: LuminConfig;
  port?: number;
}

/**
 * Create an SSR server for server-side routes
 * This server handles "use server" routes with runtime rendering
 */
export async function createSSRServer(options: SSRServerOptions) {
  const { cwd, config, port = 3001 } = options;
  
  await setupHappyDom();
  
  // Load directives to know which routes are server-side
  const directivesPath = path.join(cwd, ".lumix", "directives.json");
  let directives: { [key: string]: string } = {};
  if (fs.existsSync(directivesPath)) {
    directives = JSON.parse(fs.readFileSync(directivesPath, "utf8"));
  }
  
  // Get server routes
  const serverRoutes = Object.entries(directives)
    .filter(([_, directive]) => directive === "server")
    .map(([path]) => path);
  
  if (serverRoutes.length === 0) {
    console.log("  No server routes found, SSR server not needed");
    return null;
  }
  
  const server = await createViteServer({
    root: cwd,
    server: {
      middlewareMode: true,
      port,
    },
    appType: "custom",
  });
  
  return {
    server,
    middleware: createSSRMiddleware(cwd, config, server, directives),
    port,
  };
}

function createSSRMiddleware(
  cwd: string,
  config: LuminConfig,
  viteServer: ViteDevServer,
  directives: { [key: string]: string }
) {
  return async (req: any, res: any, next: any) => {
    const url = req.url?.split("?")[0] ?? "/";
    
    // Only handle server routes
    const directive = directives[url];
    if (directive !== "server") {
      return next();
    }
    
    try {
      // Load routes
      const routesPath = path.join(cwd, ".lumix", "routes.mjs");
      if (!fs.existsSync(routesPath)) {
        return next();
      }
      
      const { routes } = await viteServer.ssrLoadModule(routesPath);
      const route = routes.find((r: any) => r.path === url);
      
      if (!route) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/html");
        res.end("<h1>404 - Route Not Found</h1>");
        return;
      }
      
      // Load the server bundle for this route
      const serverBundlePath = path.join(cwd, "dist/server", `${route.path === "/" ? "index" : route.path.slice(1).replace(/\//g, "-")}.js`);
      
      if (!fs.existsSync(serverBundlePath)) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/html");
        res.end("<h1>500 - Server bundle not found</h1><p>Run <code>lumix build</code> first</p>");
        return;
      }
      
      // Load and render the component
      const { renderToString } = await import("../dom.js");
      const bundleUrl = pathToFileURL(serverBundlePath).href;
      const mod = await import(bundleUrl);
      const Comp = mod.default ?? mod.Component ?? mod;
      
      if (typeof Comp !== "function") {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/html");
        res.end("<h1>500 - Invalid Component</h1>");
        return;
      }
      
      // Server-side props
      const props = {
        serverTime: new Date().toISOString(),
        userAgent: req.headers['user-agent'] || 'Unknown',
        requestUrl: url,
        method: req.method,
      };
      
      const result = renderToString(Comp, props);
      
      // Calculate safe name for this route
      const safeName = route.path === "/" ? "index" : route.path.slice(1).replace(/\//g, "-");
      
      // Extract head metadata from the compiled source (not the Vite bundle)
      let routeHead: any = null;
      try {
        const compiledPath = path.join(cwd, ".lumix", "compiled", `${safeName}.mjs`);
        if (fs.existsSync(compiledPath)) {
          const compiledUrl = pathToFileURL(compiledPath).href;
          const mod = await import(compiledUrl);
          if (mod.head) {
            routeHead = mod.head;
          }
        }
      } catch (e) {
        // Failed to load head
      }
      
      // Merge config head with route head
      const mergedHead = mergeHead(config.head, routeHead);
      const pageTitle = mergedHead.title || config?.title || "Lumix App";
      
      // Build head section from merged config + route head
      const headParts: string[] = [];
      
      // Favicon
      if (config.favicon) {
        headParts.push(`  <link rel="icon" href="${escapeHtml(config.favicon)}">`);
      }
      
      // Meta tags from merged head
      if (mergedHead.meta.length > 0) {
        for (const meta of mergedHead.meta) {
          const attrs = Object.entries(meta)
            .map(([key, value]) => `${key}="${escapeHtml(String(value))}"`)
            .join(' ');
          headParts.push(`  <meta ${attrs}>`);
        }
      }
      
      // Link tags from merged head
      if (mergedHead.link.length > 0) {
        for (const link of mergedHead.link) {
          const attrs = Object.entries(link)
            .map(([key, value]) => `${key}="${escapeHtml(String(value))}"`)
            .join(' ');
          headParts.push(`  <link ${attrs}>`);
        }
      }
      
      // Generate HTML with styles (with IDs)
      const stylesHtml = result.styles && result.styles.length > 0 
        ? result.styles.map(style => `  <style id="${escapeHtml(style.id)}">${style.content}</style>`).join('\n')
        : '';
      
      // Script tags from merged head (before hydration script)
      if (mergedHead.script.length > 0) {
        for (const script of mergedHead.script) {
          const attrs = Object.entries(script)
            .filter(([key]) => key !== 'innerHTML')
            .map(([key, value]) => `${key}="${escapeHtml(String(value))}"`)
            .join(' ');
          const innerHTML = (script as any).innerHTML || '';
          headParts.push(`  <script ${attrs}>${innerHTML}</script>`);
        }
      }
      
      // Find client script for hydration
      let clientScriptSrc: string | null = null;
      
      // Strategy 1: Try to read manifest
      const manifestPath = path.join(cwd, "dist/client/.vite/manifest.json");
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
          const possibleKeys = [
            `.lumix/entries/${safeName}.js`,
            `lumix/entries/${safeName}.js`,
            `entries/${safeName}.js`,
            `${safeName}.js`
          ];
          
          for (const key of possibleKeys) {
            if (manifest[key]) {
              clientScriptSrc = `/${manifest[key].file}`;
              break;
            }
          }
        } catch (e) {
          // Manifest read failed, continue to fallback
        }
      }
      
      // Strategy 2: Scan assets directory (fallback)
      if (!clientScriptSrc) {
        const assetsDir = path.join(cwd, "dist/client/assets");
        if (fs.existsSync(assetsDir)) {
          const files = fs.readdirSync(assetsDir);
          const matchingFile = files.find(f => 
            f.startsWith(`ssr-${safeName}`) && 
            f.endsWith('.js') && 
            !f.endsWith('.map')
          );
          if (matchingFile) {
            clientScriptSrc = `/assets/${matchingFile}`;
          }
        }
      }
      
      // Generate hydration script
      const hydrationScript = clientScriptSrc 
        ? `\n  <script type="module" src="${clientScriptSrc}"></script>`
        : '';
      
      if (!clientScriptSrc) {
        console.warn(`[lumix ssr] Warning: No client script found for ${route.path}, page will not be interactive`);
      }
      
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <meta name="lumix-directive" content="server">
  <meta name="lumix-route" content="${route.path}">
  <meta name="lumix-timestamp" content="${new Date().toISOString()}">
${headParts.join('\n')}
${stylesHtml}
</head>
<body>
  <div id="${config?.rootId ?? "app"}">${result.html}</div>${hydrationScript}
</body>
</html>`;
      
      res.setHeader("Content-Type", "text/html");
      res.end(html);
      
    } catch (error) {
      console.error("SSR Error:", error);
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/html");
      res.end(`<h1>500 - SSR Error</h1><pre>${(error as Error).message}</pre>`);
    }
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
