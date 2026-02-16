import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";
/**
 * Merge config head with route-specific head
 * Route head takes precedence for title
 * Meta/link/script arrays are merged
 */
function mergeHead(configHead, routeHead) {
    const merged = {
        title: routeHead?.title || undefined,
        meta: [...(configHead?.meta || []), ...(routeHead?.meta || [])],
        link: [...(configHead?.link || []), ...(routeHead?.link || [])],
        script: [...(configHead?.script || []), ...(routeHead?.script || [])],
    };
    return merged;
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
 * Prerender static routes to HTML files with per-route code splitting.
 * Each route gets its own HTML file with only the JS it needs.
 */
export async function prerender(options) {
    const { cwd, config, staticRoutes, manifest, outDir = "dist/client", rootId = config.rootId ?? "app", title = config.title ?? "Lumix", } = options;
    await setupHappyDom();
    const { renderToString } = await import("../dom.js");
    const distRoot = path.join(cwd, outDir);
    for (const route of staticRoutes) {
        console.log(`[lumix prerender] Rendering ${route.path} (PIR)`);
        // Load the compiled component
        const url = pathToFileURL(route.compiledPath).href;
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
        // Merge config head with route head
        const mergedHead = mergeHead(config.head, route.head || null);
        const pageTitle = mergedHead.title || title;
        // Find the client script for this specific route
        let clientScriptSrc = null;
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
                const matchingFile = files.find(f => f.startsWith(route.safeName) &&
                    f.endsWith('.js') &&
                    !f.endsWith('.map'));
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
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        // Build head section from merged config + route head
        const headParts = [];
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
        // Include captured styles with their IDs in the head
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
                const innerHTML = script.innerHTML || '';
                headParts.push(`  <script ${attrs}>${innerHTML}</script>`);
            }
        }
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
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="lumix-directive" content="pir">
  <meta name="lumix-route" content="${escapeHtml(route.path)}">
${headParts.join('\n')}
${stylesHtml}
</head>
<body>
  <div id="${escapeHtml(rootId)}">${result.html}</div>${hydrationScript}
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
