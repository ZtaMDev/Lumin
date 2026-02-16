import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";
import type { LuminConfig } from "../config.js";
import type { RenderToStringResult } from "../dom.js";

export interface PrerenderOptions {
  cwd: string;
  config: LuminConfig;
  staticRoutes: any[];
  manifest: any;
  outDir?: string;
  rootId?: string;
  title?: string;
}

/**
 * Setup happy-dom as global document/window so lumix-js renderToString works in Node.
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

/**
 * Prerender static routes to HTML files with per-route code splitting.
 * Each route gets its own HTML file with only the JS it needs.
 */
export async function prerender(options: PrerenderOptions): Promise<void> {
  const {
    cwd,
    config,
    staticRoutes,
    manifest,
    outDir = "dist/client",
    rootId = config.rootId ?? "app",
    title = config.title ?? "Lumix",
  } = options;

  await setupHappyDom();

  const { renderToString } = await import("../dom.js");
  const distRoot = path.join(cwd, outDir);

  for (const route of staticRoutes) {
    console.log(`[lumix prerender] Rendering ${route.path} (static)`);
    
    // Load the compiled component
    const url = pathToFileURL(route.compiledPath).href;
    let Comp: (props?: any) => any;
    
    try {
      const mod = await import(url);
      Comp = mod.default ?? mod.Component ?? mod;
    } catch (e) {
      console.warn(`[lumix prerender] Skip ${route.path}: import failed`, (e as Error).message);
      continue;
    }

    if (typeof Comp !== "function") {
      console.warn(`[lumix prerender] Skip ${route.path}: no component export`);
      continue;
    }

    let result: RenderToStringResult;
    try {
      result = renderToString(Comp, {});
    } catch (e) {
      console.warn(`[lumix prerender] Skip ${route.path}: render failed`, (e as Error).message);
      continue;
    }

    // Find the client script for this specific route
    let clientScriptSrc: string | null = null;
    
    // Strategy 1: Try to find in manifest (if available)
    if (manifest && Object.keys(manifest).length > 0) {
      const possibleKeys = [
        `.lumix/entries/${route.safeName}.js`,
        `lumix/entries/${route.safeName}.js`,
        `entries/${route.safeName}.js`,
        `${route.safeName}.js`
      ];
      
      for (const key of possibleKeys) {
        if (manifest[key]) {
          // The manifest.file already includes the path, just add leading slash
          clientScriptSrc = `/${manifest[key].file}`;
          console.log(`[lumix prerender] Found script via manifest for ${route.path}: ${clientScriptSrc}`);
          break;
        }
      }
    }
    
    // Strategy 2: Scan assets directory directly (fallback)
    if (!clientScriptSrc) {
      const assetsDir = path.join(distRoot, 'assets');
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        // Look for files that match the route name pattern
        const matchingFile = files.find(f => 
          f.startsWith(route.safeName) && 
          f.endsWith('.js') && 
          !f.endsWith('.map')
        );
        if (matchingFile) {
          clientScriptSrc = `/assets/${matchingFile}`;
          console.log(`[lumix prerender] Found script via filesystem for ${route.path}: ${clientScriptSrc}`);
        }
      }
    }
    
    if (!clientScriptSrc) {
      console.warn(`[lumix prerender] Warning: No client script found for ${route.path}, page will not be interactive`);
    }

    const htmlPath = route.path === "/" 
      ? path.join(distRoot, "index.html") 
      : path.join(distRoot, route.path.slice(1), "index.html");
    
    const dir = path.dirname(htmlPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Include captured styles in the head
    const stylesHtml = result.styles && result.styles.length > 0 
      ? result.styles.map(style => `  <style>${style}</style>`).join('\n')
      : '';

    // Generate hydration script - always hydrate for interactivity
    let hydrationScript = '';
    if (clientScriptSrc) {
      hydrationScript = `
  <script type="module" src="${escapeHtml(clientScriptSrc)}"></script>`;
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="lumix-directive" content="static">
  <meta name="lumix-route" content="${escapeHtml(route.path)}">
${stylesHtml}
</head>
<body>
  <div id="${escapeHtml(rootId)}">${result.html}</div>${hydrationScript}
</body>
</html>`;

    fs.writeFileSync(htmlPath, fullHtml, "utf8");
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
