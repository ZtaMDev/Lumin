/// <reference path="../vinxi.d.ts" />
import { createServer, type ViteDevServer } from "vite";
import lumix from "../../../vite-plugin-lumix/dist/index.js";
import pc from "picocolors";
import { loadConfig, findConfigPath } from "./loader.js";
import path from "path";
import fs from "fs";
import { __dirname } from "./utils.js";
import { VERSION } from "./constants.js";

/**
 * Parse directive from .lumix file using proper parsing instead of regex
 */
function parseDirectiveFromLumix(lumixContent: string, routePath: string): string {
  // Extract script section
  const scriptMatch = lumixContent.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    return "static"; // No script section, default to static
  }
  
  const scriptContent = scriptMatch[1];
  
  // Parse the JavaScript content to find directives
  try {
    // Simple tokenizer to find string literals at the beginning
    const lines = scriptContent.split('\n');
    let foundDirective: string | null = null;
    let directiveCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('//') || line.startsWith('/*')) {
        continue;
      }
      
      // Check if this line contains a directive
      if (line.startsWith('"use server";') || line.startsWith("'use server';")) {
        foundDirective = "server";
        directiveCount++;
      } else if (line.startsWith('"use static";') || line.startsWith("'use static';")) {
        foundDirective = "static";
        directiveCount++;
      } else if (line.startsWith('"use server"') || line.startsWith("'use server'")) {
        foundDirective = "server";
        directiveCount++;
      } else if (line.startsWith('"use static"') || line.startsWith("'use static'")) {
        foundDirective = "static";
        directiveCount++;
      } else {
        // If we hit a non-directive, non-comment, non-empty line, stop looking
        // Directives must be at the top
        break;
      }
    }
    
    // Validate directive count
    if (directiveCount > 1) {
      throw new Error(`Multiple directives found. Only one directive per component is allowed.`);
    }
    
    return foundDirective || "static";
    
  } catch (error) {
    throw new Error(`Failed to parse directive: ${(error as Error).message}`);
  }
}

async function generateDirectivesForDev(cwd: string) {
  try {
    // Read routes
    const routesPath = path.join(cwd, ".lumix", "routes.mjs");
    if (!fs.existsSync(routesPath)) return;
    
    const routesContent = fs.readFileSync(routesPath, "utf8");
    const routesMatch = routesContent.match(/export const routes = (\[.*\]);/s);
    if (!routesMatch) return;
    
    const routes = JSON.parse(routesMatch[1]);
    const routeDirectives: { [key: string]: string } = {};
    
    for (const route of routes) {
      const lumixPath = path.join(cwd, route.file.replace(/^\//, ""));
      
      if (fs.existsSync(lumixPath)) {
        const lumixContent = fs.readFileSync(lumixPath, "utf8");
        
        try {
          const directive = parseDirectiveFromLumix(lumixContent, route.path);
          routeDirectives[route.path] = directive;
        } catch (error) {
          console.warn(`[lumix dev] Warning in ${route.path}: ${(error as Error).message}, using default 'static'`);
          routeDirectives[route.path] = "static";
        }
      }
    }
    
    // Store directives info for the dev server
    const directivesPath = path.join(cwd, ".lumix", "directives.json");
    fs.writeFileSync(directivesPath, JSON.stringify(routeDirectives, null, 2), "utf8");
    
    console.log(pc.dim("  Generated directives for dev mode"));
  } catch (error) {
    console.warn("Failed to generate directives:", (error as Error).message);
  }
}

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

async function startSSGDevServer(cwd: string, config: any) {
  const { ensureLumixRoutesFile } = await import("../vinxi.js");
  ensureLumixRoutesFile(cwd, config);
  
  // Generate directives for dev mode
  await generateDirectivesForDev(cwd);
  
  // Setup DOM for SSR
  await setupHappyDom();
  
  // Load directives to determine rendering mode per route
  const directivesPath = path.join(cwd, ".lumix", "directives.json");
  let directives: { [key: string]: string } = {};
  
  // Cache for pre-rendered static pages (SSG behavior)
  const staticPagesCache = new Map<string, string>();
  
  const server = await createServer({
    root: cwd,
    base: "/",
    mode: "development",
    clearScreen: false,
    logLevel: "warn",
    customLogger: {
      info: (msg) => {
        if (msg.includes('.lumix/')) return;
        console.log(msg);
      },
      warn: (msg) => console.warn(msg),
      error: (msg) => console.error(msg),
      warnOnce: (msg) => console.warn(msg),
      hasWarned: false,
      clearScreen: () => {},
      hasErrorLogged: () => false,
    },
    plugins: [
      lumix(config),
      {
        name: "lumix-dev-renderer",
        configureServer(server) {
          // Watch for file changes to invalidate static cache
          server.watcher.on('change', (file) => {
            if (file.endsWith('.lumix')) {
              staticPagesCache.clear();
              const fileName = path.basename(file);
              console.log(pc.cyan(`  [lumix] Detected change: ${fileName} - Page will reload`));
            }
          });
          
          server.middlewares.use(async (req, res, next) => {
            const url = req.url?.split("?")[0] ?? "/";
            
            if (
              url.includes(".") || 
              url.startsWith("/api") || 
              url.startsWith("/@") || 
              url.startsWith("/node_modules") ||
              url.startsWith("/packages") ||
              url.includes("__vite") ||
              req.headers.accept?.includes("application/json") ||
              req.headers.accept?.includes("text/javascript") ||
              req.headers.accept?.includes("application/javascript")
            ) {
              return next();
            }
            
            if (!req.headers.accept?.includes("text/html")) {
              return next();
            }
            
            try {
              if (fs.existsSync(directivesPath)) {
                directives = JSON.parse(fs.readFileSync(directivesPath, "utf8"));
              }
              
              const routesPath = path.join(cwd, ".lumix", "routes.mjs");
              if (!fs.existsSync(routesPath)) {
                return next();
              }
              
              const { routes } = await server.ssrLoadModule(routesPath);
              const route = routes.find((r: any) => r.path === url) ?? routes.find((r: any) => r.path === "/");
              
              if (!route) {
                res.statusCode = 404;
                res.setHeader("Content-Type", "text/html");
                res.end("<h1>404 - Page Not Found</h1>");
                return;
              }
              
              const detectedDirective = directives[route.path] || "static";
              
              // SSG: Check cache for static routes
              if (detectedDirective === "static" && staticPagesCache.has(route.path)) {
                res.setHeader("Content-Type", "text/html");
                res.setHeader("X-Lumix-Cache", "HIT");
                res.end(staticPagesCache.get(route.path));
                return;
              }
              
              const { compile } = await import("@lumix-js/compiler");
              const { renderToString } = await import("../dom.js");
              
              const lumixPath = path.join(cwd, route.file.replace(/^\//, ""));
              if (!fs.existsSync(lumixPath)) {
                res.statusCode = 404;
                res.setHeader("Content-Type", "text/html");
                res.end("<h1>404 - Component Not Found</h1>");
                return;
              }
              
              const js = await compile({ input: lumixPath, bundle: false, checkTypes: false });
              
              const tempDir = path.join(cwd, ".lumix", "dev-ssr");
              if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
              
              const safeName = route.path === "/" ? "index" : route.path.slice(1).replace(/\//g, "-");
              const tempPath = path.join(tempDir, `${safeName}.mjs`);
              fs.writeFileSync(tempPath, js, "utf8");
              
              const mod = await server.ssrLoadModule(tempPath);
              const Comp = mod.default ?? mod.Component ?? mod;
              
              if (typeof Comp !== "function") {
                res.statusCode = 500;
                res.setHeader("Content-Type", "text/html");
                res.end("<h1>500 - Invalid Component</h1>");
                return;
              }
              
              // SSR: Add dynamic server-side props
              let props = {};
              if (detectedDirective === "server") {
                props = {
                  serverTime: new Date().toISOString(),
                  userAgent: req.headers['user-agent'] || 'Unknown',
                  requestUrl: url,
                  method: req.method,
                };
              }
              
              const result = renderToString(Comp, props);
              
              const stylesHtml = result.styles && result.styles.length > 0 
                ? result.styles.map(style => `  <style>${style}</style>`).join('\n')
                : '';
              
              const hydrationScript = `
import { hydrate } from "lumix-js";
import Component from "./dev-ssr/${safeName}.mjs";

function hydrateComponent() {
  const root = document.getElementById("${config?.rootId ?? "app"}");
  if (!root) {
    console.warn("Lumix Dev: Root element not found");
    return;
  }
  
  hydrate(root, Component);
  console.log("Lumix Dev: Route ${route.path} hydrated (${detectedDirective} mode)");
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrateComponent);
} else {
  hydrateComponent();
}

document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link || link.target === '_blank' || !link.href) return;
  
  const url = new URL(link.href);
  if (url.origin !== window.location.origin) return;
  
  e.preventDefault();
  window.location.href = url.pathname;
});
`;
              
              const hydrationEntryPath = path.join(cwd, ".lumix", `dev-route-${safeName}.js`);
              fs.writeFileSync(hydrationEntryPath, hydrationScript, "utf8");
              
              const cacheStatus = detectedDirective === "static" ? "MISS" : "BYPASS";
              const renderMode = detectedDirective === "static" ? "SSG (cached)" : "SSR (dynamic)";
              
              // Dev indicator (only if enabled in config)
              const showIndicator = config?.dev?.showIndicator ?? false;
              const devIndicator = showIndicator ? `
  <div id="lumix-dev-info" style="position: fixed; bottom: 10px; right: 10px; background: ${detectedDirective === 'server' ? '#059669' : '#4f46e5'}; color: white; padding: 8px 12px; border-radius: 4px; font-size: 12px; z-index: 9999; font-family: monospace; cursor: move; user-select: none; box-shadow: 0 2px 8px rgba(0,0,0,0.2); transition: all 0.3s ease;">
    <div id="lumix-content" style="display: flex; align-items: center; gap: 8px;">
      <span id="lumix-text">${renderMode} • ${route.path} • ${new Date().toLocaleTimeString()}</span>
      <button id="lumix-toggle" style="background: rgba(255,255,255,0.2); border: none; color: white; cursor: pointer; padding: 2px 6px; border-radius: 3px; font-size: 10px;">Hide</button>
    </div>
  </div>
  <script>
    (function() {
      const indicator = document.getElementById('lumix-dev-info');
      const content = document.getElementById('lumix-content');
      const toggleBtn = document.getElementById('lumix-toggle');
      const text = document.getElementById('lumix-text');
      let isDragging = false;
      let isHidden = false;
      let currentX, currentY, initialX, initialY;
      let xOffset = 0, yOffset = 0;
      
      // Load saved position and state
      const savedPos = localStorage.getItem('lumix-indicator-pos');
      const savedState = localStorage.getItem('lumix-indicator-hidden');
      
      if (savedPos) {
        const { x, y } = JSON.parse(savedPos);
        indicator.style.right = 'auto';
        indicator.style.bottom = 'auto';
        indicator.style.left = x + 'px';
        indicator.style.top = y + 'px';
        xOffset = x;
        yOffset = y;
      }
      
      if (savedState === 'true') {
        isHidden = true;
        applyHiddenState();
      }
      
      function applyHiddenState() {
        if (isHidden) {
          // Convert to circle
          text.style.display = 'none';
          toggleBtn.textContent = '👁';
          toggleBtn.style.background = 'transparent';
          toggleBtn.style.padding = '0';
          indicator.style.padding = '8px';
          indicator.style.borderRadius = '50%';
          indicator.style.width = '32px';
          indicator.style.height = '32px';
          content.style.justifyContent = 'center';
        } else {
          // Restore full state
          text.style.display = 'inline';
          toggleBtn.textContent = 'Hide';
          toggleBtn.style.background = 'rgba(255,255,255,0.2)';
          toggleBtn.style.padding = '2px 6px';
          indicator.style.padding = '8px 12px';
          indicator.style.borderRadius = '4px';
          indicator.style.width = 'auto';
          indicator.style.height = 'auto';
          content.style.justifyContent = 'flex-start';
        }
      }
      
      // Toggle visibility
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isHidden = !isHidden;
        applyHiddenState();
        localStorage.setItem('lumix-indicator-hidden', isHidden.toString());
      });
      
      // Drag functionality - works in both states
      indicator.addEventListener('mousedown', dragStart);
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', dragEnd);
      
      function dragStart(e) {
        if (e.target === toggleBtn && !isHidden) return;
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        isDragging = true;
        indicator.style.cursor = 'grabbing';
      }
      
      function drag(e) {
        if (!isDragging) return;
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        
        indicator.style.right = 'auto';
        indicator.style.bottom = 'auto';
        indicator.style.left = currentX + 'px';
        indicator.style.top = currentY + 'px';
      }
      
      function dragEnd() {
        if (isDragging) {
          localStorage.setItem('lumix-indicator-pos', JSON.stringify({ x: xOffset, y: yOffset }));
          indicator.style.cursor = 'move';
        }
        isDragging = false;
      }
    })();
  </script>` : '';
              
              const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config?.title ?? "Lumix App"}</title>
  <meta name="lumix-directive" content="${detectedDirective}">
  <meta name="lumix-route" content="${route.path}">
  <meta name="lumix-timestamp" content="${new Date().toISOString()}">
${stylesHtml}
  <script type="module" src="/@vite/client"></script>
  <script type="module" src="/.lumix/dev-route-${safeName}.js"></script>
</head>
<body>
  <div id="${config?.rootId ?? "app"}">${result.html}</div>${devIndicator}
</body>
</html>`;
              
              // SSG: Cache static pages
              if (detectedDirective === "static") {
                staticPagesCache.set(route.path, html);
              }
              
              res.setHeader("Content-Type", "text/html");
              res.setHeader("X-Lumix-Cache", cacheStatus);
              res.end(html);
              
            } catch (error) {
              console.error("Dev Render Error:", error);
              res.statusCode = 500;
              res.setHeader("Content-Type", "text/html");
              res.end(`<h1>500 - Render Error</h1><pre>${(error as Error).message}</pre>`);
            }
          });
        }
      },
      ...(config.vite?.plugins || [])
    ],
    server: {
      port: 3000,
      ...config.vite?.server,
    },
    resolve: {
      alias: {
        "lumix-js": path.resolve(__dirname, "../index.js"),
        ...config.vite?.resolve?.alias,
      },
    },
    ...config.vite,
  });

  await server.listen();
  const port = server.config.server.port;
  console.log(
    `  ${pc.green("➜")}  ${pc.bold("Local:")}   ${pc.cyan(`http://localhost:${port}/`)} ${pc.dim("(SSG/SSR Dev)")}`,
  );
  console.log(
    `  ${pc.dim("  Static routes cached (SSG), Server routes dynamic (SSR)")}`,
  );
  console.log(
    `  ${pc.green("➜")}  ${pc.dim("Ready in")} ${pc.white(Math.round(performance.now()))}ms\n`,
  );
}

async function startServer(cwd: string) {
  const config = await loadConfig(cwd);

  const server = await createServer({
    root: cwd,
    base: "/",
    mode: "development",
    plugins: [lumix(config), ...(config.vite?.plugins || [])],
    server: {
      port: 3000,
      ...config.vite?.server,
    },
    resolve: {
      alias: {
        "lumix-js": path.resolve(__dirname, "../index.js"),
        ...config.vite?.resolve?.alias,
      },
    },
    ...config.vite,
  });

  await server.listen();
  return server;
}

export async function dev() {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  console.log("");
  console.log(`  ${pc.bold(pc.cyan("⚡ LumixJS"))} ${pc.dim(`v${VERSION}`)}`);
  console.log(pc.dim("  Starting development server...\n"));

  try {
    if (config.mode === "ssg") {
      // SSG Development Server - like Astro
      await startSSGDevServer(cwd, config);
      return;
    }

    let server = await startServer(cwd);
    const port = server.config.server.port;
    console.log(
      `  ${pc.green("➜")}  ${pc.bold("Local:")}   ${pc.cyan(`http://localhost:${port}/`)}`,
    );
    console.log(
      `  ${pc.green("➜")}  ${pc.dim("Ready in")} ${pc.white(Math.round(performance.now()))}ms\n`,
    );

    // Watch config file for changes
    const configPath = findConfigPath(cwd);
    if (configPath) {
      let debounce: ReturnType<typeof setTimeout> | null = null;

      fs.watch(configPath, () => {
        if (debounce) return;
        debounce = setTimeout(async () => {
          debounce = null;
          console.log(
            `\n  ${pc.yellow("↻")}  ${pc.dim("Config changed, restarting...")}`,
          );
          try {
            await server.close();
            server = await startServer(cwd);
            const newPort = server.config.server.port;
            console.log(
              `  ${pc.green("➜")}  ${pc.bold("Local:")}   ${pc.cyan(`http://localhost:${newPort}/`)}`,
            );
            console.log(
              `  ${pc.green("➜")}  ${pc.dim("Restarted successfully")}\n`,
            );
          } catch (e: any) {
            console.error(pc.red(`  ✗  Restart failed: ${e.message}\n`));
          }
        }, 300);
      });
    }
  } catch (e: any) {
    console.error(pc.red(pc.bold("\n  Failed to start server:")));
    console.error(pc.red(`  ${e.message}\n`));
    process.exit(1);
  }
}
