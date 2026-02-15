import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";
/**
 * Get routes from .lumix/routes.mjs (must exist; call ensureLumixRoutesFile first).
 */
async function getRoutes(cwd) {
    const routesPath = path.join(cwd, ".lumix", "routes.mjs");
    if (!fs.existsSync(routesPath))
        return [];
    const url = pathToFileURL(routesPath).href;
    const mod = await import(url);
    return mod.routes ?? [];
}
/**
 * Setup happy-dom as global document/window so lumix-js renderToString works in Node.
 */
async function setupHappyDom() {
    const { Window } = await import("happy-dom");
    const window = new Window();
    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.HTMLElement = window.HTMLElement;
    globalThis.Node = window.Node;
    globalThis.Element = window.Element;
    globalThis.Comment = window.Comment;
    globalThis.Text = window.Text;
}
/**
 * Prerender all routes to static HTML files (SSG like Astro).
 * Requires happy-dom and @lumix-js/compiler. Call after Vite client build.
 */
export async function prerender(options) {
    const { cwd, config, clientScriptSrc, outDir = "dist", rootId = config.rootId ?? "app", title = config.title ?? "Lumix", } = options;
    await setupHappyDom();
    const { renderToString } = await import("../dom.js");
    const { compile } = await import("@lumix-js/compiler");
    const routes = await getRoutes(cwd);
    if (routes.length === 0)
        return;
    // Load directives information
    const directivesPath = path.join(cwd, ".lumix", "directives.json");
    let directives = {};
    if (fs.existsSync(directivesPath)) {
        directives = JSON.parse(fs.readFileSync(directivesPath, "utf8"));
    }
    const pagesDir = config?.router?.pagesDir ?? path.join(config?.srcDir ?? "src", "routes");
    const ssrDir = path.join(cwd, ".lumix", "ssr");
    if (!fs.existsSync(ssrDir))
        fs.mkdirSync(ssrDir, { recursive: true });
    const distRoot = path.join(cwd, outDir);
    for (const route of routes) {
        const directive = directives[route.path] || "static";
        console.log(`[lumix prerender] Processing ${route.path} with "${directive}" directive`);
        // Skip server-side rendered routes in static build (they need a server)
        if (directive === "server") {
            console.log(`[lumix prerender] Skipping ${route.path}: "use server" requires runtime server`);
            continue;
        }
        const lumixPath = path.join(cwd, route.file.replace(/^\//, "").replace(/\//g, path.sep));
        if (!fs.existsSync(lumixPath))
            continue;
        let js;
        try {
            js = await compile({ input: lumixPath, bundle: false, checkTypes: false });
        }
        catch (e) {
            console.warn(`[lumix prerender] Skip ${route.path}: compile failed`, e.message);
            continue;
        }
        const safeName = route.path === "/" ? "index" : route.path.slice(1).replace(/\//g, "-");
        const ssrPath = path.join(ssrDir, `${safeName}.mjs`);
        fs.writeFileSync(ssrPath, js, "utf8");
        const url = pathToFileURL(ssrPath).href;
        let Comp;
        try {
            const mod = await import(url);
            Comp = mod.default ?? mod.Component ?? mod;
        }
        catch (e) {
            console.warn(`[lumix prerender] Skip ${route.path}: import failed`, e.message);
            continue;
        }
        if (typeof Comp !== "function") {
            console.warn(`[lumix prerender] Skip ${route.path}: no component export`);
            continue;
        }
        let result;
        try {
            result = renderToString(Comp, {});
        }
        catch (e) {
            console.warn(`[lumix prerender] Skip ${route.path}: render failed`, e.message);
            continue;
        }
        const htmlPath = route.path === "/" ? path.join(distRoot, "index.html") : path.join(distRoot, route.path.slice(1), "index.html");
        const dir = path.dirname(htmlPath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        // Include captured styles in the head
        const stylesHtml = result.styles && result.styles.length > 0
            ? result.styles.map(style => `  <style>${style}</style>`).join('\n')
            : '';
        // Generate islands hydration script if there are islands
        let islandsScript = '';
        if (result.islands && result.islands.length > 0) {
            // Update island descriptors with route path instead of file path (security)
            const updatedIslands = result.islands.map(island => ({
                ...island,
                componentPath: route.path // Use route path instead of file path
            }));
            islandsScript = `
  <script type="module">
    // Islands hydration for ${route.path} (${directive})
    import { hydrateIsland } from "${escapeHtml(clientScriptSrc)}";
    
    // Islands data (secure - no file paths exposed)
    window.__LUMIX_ISLANDS__ = ${JSON.stringify(updatedIslands)};
    
    // Hydrate all islands on this page
    document.addEventListener('DOMContentLoaded', () => {
      window.__LUMIX_ISLANDS__.forEach(async (island) => {
        const element = document.querySelector(island.selector);
        if (element) {
          await hydrateIsland(element, island.componentPath, island.props);
        }
      });
    });
  </script>`;
        }
        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="lumix-directive" content="${directive}">
${stylesHtml}
</head>
<body>
  <div id="${escapeHtml(rootId)}">${result.html}</div>
  <script type="module" src="${escapeHtml(clientScriptSrc)}"></script>${islandsScript}
</body>
</html>`;
        fs.writeFileSync(htmlPath, fullHtml, "utf8");
    }
}
function escapeHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
