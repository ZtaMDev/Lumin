/// <reference path="../vinxi.d.ts" />
import { createServer } from "vite";
import lumix from "../../../vite-plugin-lumix/dist/index.js";
import pc from "picocolors";
import { loadConfig, findConfigPath } from "./loader.js";
import path from "path";
import fs from "fs";
import { __dirname } from "./utils.js";
import { VERSION } from "./constants.js";
function escapeHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
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
 * Parse directive from .lumix file using proper parsing instead of regex
 * Supported directives:
 * - "use prerender" -> PIR (Progressive Instant Rendering) - default
 * - "use server" -> SSR (Server-Side Rendering)
 * - "use static" -> SSG (Static Site Generation) - future islands architecture
 */
function parseDirectiveFromLumix(lumixContent, routePath) {
    // Extract script section
    const scriptMatch = lumixContent.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    if (!scriptMatch) {
        return "prerender"; // No script section, default to prerender (PIR)
    }
    const scriptContent = scriptMatch[1];
    // Parse the JavaScript content to find directives
    try {
        // Simple tokenizer to find string literals at the beginning
        const lines = scriptContent.split('\n');
        let foundDirective = null;
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
            }
            else if (line.startsWith('"use prerender";') || line.startsWith("'use prerender';")) {
                foundDirective = "prerender";
                directiveCount++;
            }
            else if (line.startsWith('"use static";') || line.startsWith("'use static';")) {
                foundDirective = "static";
                directiveCount++;
            }
            else if (line.startsWith('"use server"') || line.startsWith("'use server'")) {
                foundDirective = "server";
                directiveCount++;
            }
            else if (line.startsWith('"use prerender"') || line.startsWith("'use prerender'")) {
                foundDirective = "prerender";
                directiveCount++;
            }
            else if (line.startsWith('"use static"') || line.startsWith("'use static'")) {
                foundDirective = "static";
                directiveCount++;
            }
            else {
                // If we hit a non-directive, non-comment, non-empty line, stop looking
                // Directives must be at the top
                break;
            }
        }
        // Validate directive count
        if (directiveCount > 1) {
            throw new Error(`Multiple directives found. Only one directive per component is allowed.`);
        }
        return foundDirective || "prerender";
    }
    catch (error) {
        throw new Error(`Failed to parse directive: ${error.message}`);
    }
}
async function generateDirectivesForDev(cwd) {
    try {
        // Read routes
        const routesPath = path.join(cwd, ".lumix", "routes.mjs");
        if (!fs.existsSync(routesPath))
            return;
        const routesContent = fs.readFileSync(routesPath, "utf8");
        const routesMatch = routesContent.match(/export const routes = (\[.*\]);/s);
        if (!routesMatch)
            return;
        const routes = JSON.parse(routesMatch[1]);
        const routeDirectives = {};
        for (const route of routes) {
            const lumixPath = path.join(cwd, route.file.replace(/^\//, ""));
            if (fs.existsSync(lumixPath)) {
                const lumixContent = fs.readFileSync(lumixPath, "utf8");
                try {
                    const directive = parseDirectiveFromLumix(lumixContent, route.path);
                    routeDirectives[route.path] = directive;
                }
                catch (error) {
                    console.warn(`[lumix dev] Warning in ${route.path}: ${error.message}, using default 'prerender'`);
                    routeDirectives[route.path] = "prerender";
                }
            }
        }
        // Store directives info for the dev server
        const directivesPath = path.join(cwd, ".lumix", "directives.json");
        fs.writeFileSync(directivesPath, JSON.stringify(routeDirectives, null, 2), "utf8");
        console.log(pc.dim("  Generated directives for dev mode"));
    }
    catch (error) {
        console.warn("Failed to generate directives:", error.message);
    }
}
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
async function startSSGDevServer(cwd, config) {
    const { ensureLumixRoutesFile } = await import("../vinxi.js");
    ensureLumixRoutesFile(cwd, config);
    // Generate directives for dev mode
    await generateDirectivesForDev(cwd);
    // Setup DOM for SSR
    await setupHappyDom();
    // Load directives to determine rendering mode per route
    const directivesPath = path.join(cwd, ".lumix", "directives.json");
    let directives = {};
    // Cache for pre-rendered static pages (SSG behavior)
    const staticPagesCache = new Map();
    // Error deduplication - track last error per file to avoid spam
    const lastErrors = new Map();
    const ERROR_DEDUPE_TIME = 5000; // 5 seconds - increased to reduce spam
    const server = await createServer({
        root: cwd,
        base: "/",
        mode: "development",
        clearScreen: false,
        logLevel: "warn",
        customLogger: {
            info: (msg) => {
                if (msg.includes('.lumix/'))
                    return;
                console.log(msg);
            },
            warn: (msg) => console.warn(msg),
            error: (msg) => console.error(msg),
            warnOnce: (msg) => console.warn(msg),
            hasWarned: false,
            clearScreen: () => { },
            hasErrorLogged: () => false,
        },
        resolve: {
            alias: {
                "lumix-js": path.resolve(__dirname, "../index.js"),
                "/src": path.resolve(cwd, config?.srcDir ?? "src"),
                ...config.vite?.resolve?.alias,
            },
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
                            // Trigger HMR full reload
                            server.ws.send({
                                type: 'full-reload',
                                path: '*'
                            });
                        }
                    });
                    // Watch config file for changes
                    const configPath = findConfigPath(cwd);
                    if (configPath) {
                        server.watcher.add(configPath);
                        let configChangeTimeout = null;
                        server.watcher.on('change', async (file) => {
                            if (file === configPath) {
                                // Debounce config changes
                                if (configChangeTimeout)
                                    clearTimeout(configChangeTimeout);
                                configChangeTimeout = setTimeout(async () => {
                                    console.log(pc.yellow(`\n  [lumix] Config changed, restarting server...\n`));
                                    try {
                                        // Close current server
                                        await server.close();
                                        // Reload config
                                        const newConfig = await loadConfig(cwd);
                                        // Restart server with new config
                                        await startSSGDevServer(cwd, newConfig);
                                        console.log(pc.green(`  [lumix] Server restarted successfully\n`));
                                    }
                                    catch (error) {
                                        console.error(pc.red(`  [lumix] Failed to restart server: ${error.message}\n`));
                                    }
                                }, 300);
                            }
                        });
                    }
                    server.middlewares.use(async (req, res, next) => {
                        const url = req.url?.split("?")[0] ?? "/";
                        if (url.includes(".") ||
                            url.startsWith("/api") ||
                            url.startsWith("/@") ||
                            url.startsWith("/node_modules") ||
                            url.startsWith("/packages") ||
                            url.includes("__vite") ||
                            req.headers.accept?.includes("application/json") ||
                            req.headers.accept?.includes("text/javascript") ||
                            req.headers.accept?.includes("application/javascript")) {
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
                            const route = routes.find((r) => r.path === url) ?? routes.find((r) => r.path === "/");
                            if (!route) {
                                res.statusCode = 404;
                                res.setHeader("Content-Type", "text/html");
                                res.end("<h1>404 - Page Not Found</h1>");
                                return;
                            }
                            const detectedDirective = directives[route.path] || "prerender";
                            // PIR/SSG: Check cache for prerendered and static routes
                            if ((detectedDirective === "prerender" || detectedDirective === "static") && staticPagesCache.has(route.path)) {
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
                            let js;
                            try {
                                js = await compile({ input: lumixPath, bundle: false, checkTypes: false });
                                // Clear error for this file if compilation succeeds
                                if (lastErrors.has(lumixPath)) {
                                    lastErrors.delete(lumixPath);
                                    console.log(pc.green(`  [lumix] Error fixed in ${route.file}`));
                                }
                            }
                            catch (compileError) {
                                // Read file content for error display
                                const lumixContent = fs.readFileSync(lumixPath, "utf8");
                                let frame = "";
                                // Generate code frame
                                if (compileError.luminLoc) {
                                    const lines = lumixContent.split("\n");
                                    const lineIdx = compileError.luminLoc.line - 1;
                                    if (lineIdx >= 0 && lineIdx < lines.length) {
                                        const start = Math.max(0, lineIdx - 2);
                                        const end = Math.min(lines.length, lineIdx + 3);
                                        frame = lines
                                            .slice(start, end)
                                            .map((l, i) => {
                                            const curr = start + i;
                                            const isErrorLine = curr === lineIdx;
                                            const lineNum = (curr + 1).toString().padStart(3, " ");
                                            const prefix = isErrorLine ? " > " : "   ";
                                            let out = `${prefix}${lineNum} | ${l}`;
                                            if (isErrorLine) {
                                                const pad = " ".repeat(3 + 3 + 3 + compileError.luminLoc.column - 1);
                                                out += `\n${pad}^`;
                                            }
                                            return out;
                                        })
                                            .join("\n");
                                    }
                                }
                                // Deduplicate error logging
                                const now = Date.now();
                                const lastError = lastErrors.get(lumixPath);
                                const shouldLog = !lastError ||
                                    lastError.message !== compileError.message ||
                                    (now - lastError.timestamp) > ERROR_DEDUPE_TIME;
                                if (shouldLog) {
                                    lastErrors.set(lumixPath, { message: compileError.message, timestamp: now });
                                    // Log to console
                                    console.error(`\n${pc.red(pc.bold('[vite-plugin-lumix]'))} ${pc.red(compileError.message || 'Compilation error')}\n` +
                                        `${pc.dim(`file: ${route.file}:${compileError.luminLoc?.line || 0}:${compileError.luminLoc?.column || 0}`)}\n` +
                                        (frame ? `\n${frame}\n` : ""));
                                }
                                // Format error HTML for browser
                                let errorHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compilation Error</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 2rem;
      max-width: 900px;
      margin: 0 auto;
      background: #1a1a1a;
      color: #e0e0e0;
    }
    h1 {
      color: #ff6b6b;
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }
    .error-message {
      background: #2d2d2d;
      padding: 1rem;
      border-radius: 6px;
      border-left: 4px solid #ff6b6b;
      margin: 1rem 0;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    .file-info {
      color: #888;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
    .code-frame {
      background: #1e1e1e;
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      line-height: 1.6;
      margin: 1rem 0;
    }
    .code-frame .line {
      display: block;
      white-space: pre;
    }
    .code-frame .error-line {
      background: rgba(255, 107, 107, 0.1);
      color: #ff6b6b;
    }
    .code-frame .line-number {
      color: #666;
      margin-right: 1rem;
      user-select: none;
    }
    .code-frame .error-marker {
      color: #ff6b6b;
    }
  </style>
</head>
<body>
  <h1>⚠️ Compilation Error</h1>
  <div class="file-info">File: ${route.file}</div>
  <div class="error-message">${escapeHtml(compileError.message || 'Unknown compilation error')}</div>`;
                                // Generate code frame if location info is available
                                if (compileError.luminLoc && frame) {
                                    const lines = lumixContent.split("\n");
                                    const lineIdx = compileError.luminLoc.line - 1;
                                    if (lineIdx >= 0 && lineIdx < lines.length) {
                                        const start = Math.max(0, lineIdx - 2);
                                        const end = Math.min(lines.length, lineIdx + 3);
                                        const frameLines = lines
                                            .slice(start, end)
                                            .map((l, i) => {
                                            const curr = start + i;
                                            const isErrorLine = curr === lineIdx;
                                            const lineNum = (curr + 1).toString().padStart(3, " ");
                                            const prefix = isErrorLine ? " > " : "   ";
                                            let html = `<span class="line ${isErrorLine ? 'error-line' : ''}"><span class="line-number">${prefix}${lineNum} |</span> ${escapeHtml(l)}</span>`;
                                            if (isErrorLine) {
                                                const pad = " ".repeat(3 + 3 + 3 + compileError.luminLoc.column - 1);
                                                html += `\n<span class="line error-marker">${pad}^</span>`;
                                            }
                                            return html;
                                        })
                                            .join("\n");
                                        errorHtml += `\n  <div class="code-frame">${frameLines}</div>`;
                                    }
                                }
                                errorHtml += `
  <script type="module" src="/@vite/client"></script>
  <script type="module">
    // Auto-reload when file is fixed via HMR
    if (import.meta.hot) {
      import.meta.hot.on('vite:beforeUpdate', () => {
        console.log('[lumix] Error fixed, reloading...');
        window.location.reload();
      });
      
      import.meta.hot.on('vite:beforeFullReload', () => {
        console.log('[lumix] Error fixed, reloading...');
        window.location.reload();
      });
    }
  </script>
</body>
</html>`;
                                res.statusCode = 500;
                                res.setHeader("Content-Type", "text/html");
                                res.end(errorHtml);
                                return;
                            }
                            const tempDir = path.join(cwd, ".lumix", "dev-ssr");
                            if (!fs.existsSync(tempDir))
                                fs.mkdirSync(tempDir, { recursive: true });
                            const safeName = route.path === "/" ? "index" : route.path.slice(1).replace(/\//g, "-");
                            const tempPath = path.join(tempDir, `${safeName}.mjs`);
                            fs.writeFileSync(tempPath, js, "utf8");
                            let Comp;
                            let routeHead = null;
                            try {
                                const mod = await server.ssrLoadModule(tempPath);
                                Comp = mod.default ?? mod.Component ?? mod;
                                // Extract head metadata from module
                                if (mod.head) {
                                    routeHead = mod.head;
                                }
                                if (typeof Comp !== "function") {
                                    throw new Error("Invalid component export: expected a function");
                                }
                            }
                            catch (ssrError) {
                                // Handle SSR module loading errors (runtime errors, parse errors, etc.)
                                const now = Date.now();
                                const lastError = lastErrors.get(lumixPath);
                                const shouldLog = !lastError ||
                                    lastError.message !== ssrError.message ||
                                    (now - lastError.timestamp) > ERROR_DEDUPE_TIME;
                                if (shouldLog) {
                                    lastErrors.set(lumixPath, { message: ssrError.message, timestamp: now });
                                    // Log to console
                                    console.error(`\n${pc.red(pc.bold('[lumix-ssr]'))} ${pc.red(ssrError.message || 'SSR module error')}\n` +
                                        `${pc.dim(`file: ${route.file}`)}\n` +
                                        (ssrError.frame ? `\n${ssrError.frame}\n` : "") +
                                        (ssrError.stack ? `\n${pc.dim(ssrError.stack)}\n` : ""));
                                }
                                // Send error HTML to browser
                                const errorHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSR Error</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 2rem;
      max-width: 900px;
      margin: 0 auto;
      background: #1a1a1a;
      color: #e0e0e0;
    }
    h1 {
      color: #ff6b6b;
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }
    .error-message {
      background: #2d2d2d;
      padding: 1rem;
      border-radius: 6px;
      border-left: 4px solid #ff6b6b;
      margin: 1rem 0;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .file-info {
      color: #888;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
    .stack-trace {
      background: #1e1e1e;
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      font-family: 'Courier New', monospace;
      font-size: 0.75rem;
      line-height: 1.6;
      margin: 1rem 0;
      color: #888;
    }
  </style>
</head>
<body>
  <h1>⚠️ SSR Module Error</h1>
  <div class="file-info">File: ${route.file}</div>
  <div class="error-message">${escapeHtml(ssrError.message || 'Unknown SSR error')}</div>
  ${ssrError.frame ? `<div class="error-message">${escapeHtml(ssrError.frame)}</div>` : ''}
  ${ssrError.stack ? `<div class="stack-trace">${escapeHtml(ssrError.stack)}</div>` : ''}
  <script type="module" src="/@vite/client"></script>
  <script type="module">
    if (import.meta.hot) {
      import.meta.hot.on('vite:beforeUpdate', () => {
        console.log('[lumix] Error fixed, reloading...');
        window.location.reload();
      });
      
      import.meta.hot.on('vite:beforeFullReload', () => {
        console.log('[lumix] Error fixed, reloading...');
        window.location.reload();
      });
    }
  </script>
</body>
</html>`;
                                res.statusCode = 500;
                                res.setHeader("Content-Type", "text/html");
                                res.end(errorHtml);
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
                            // Merge config head with route head
                            const mergedHead = mergeHead(config.head, routeHead);
                            const pageTitle = mergedHead.title || config?.title || "Lumix App";
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
                            // Styles with IDs
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

// HMR: Reload on .lumix file changes
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('[lumix] Hot reload triggered');
    window.location.reload();
  });
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
                            const cacheStatus = (detectedDirective === "prerender" || detectedDirective === "static") ? "MISS" : "BYPASS";
                            const renderMode = detectedDirective === "server" ? "SSR" : detectedDirective === "prerender" ? "PIR" : "SSG";
                            const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <meta name="lumix-directive" content="${detectedDirective}">
  <meta name="lumix-route" content="${route.path}">
  <meta name="lumix-timestamp" content="${new Date().toISOString()}">
${headParts.join('\n')}
${stylesHtml}
  <script type="module" src="/@vite/client"></script>
  <script type="module" src="/.lumix/dev-route-${safeName}.js"></script>
</head>
<body>
  <div id="${config?.rootId ?? "app"}">${result.html}</div>
</body>
</html>`;
                            // PIR/SSG: Cache prerendered and static pages
                            if (detectedDirective === "prerender" || detectedDirective === "static") {
                                staticPagesCache.set(route.path, html);
                            }
                            res.setHeader("Content-Type", "text/html");
                            res.setHeader("X-Lumix-Cache", cacheStatus);
                            res.end(html);
                        }
                        catch (error) {
                            console.error("Dev Render Error:", error);
                            res.statusCode = 500;
                            res.setHeader("Content-Type", "text/html");
                            res.end(`<h1>500 - Render Error</h1><pre>${error.message}</pre>`);
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
        ...config.vite,
    });
    await server.listen();
    const port = server.config.server.port;
    console.log(`  ${pc.green("➜")}  ${pc.bold("Local:")}   ${pc.cyan(`http://localhost:${port}/`)} ${pc.dim("(PIR/SSR Dev)")}`);
    console.log(`  ${pc.dim("  PIR routes cached, SSR routes dynamic")}`);
    console.log(`  ${pc.green("➜")}  ${pc.dim("Ready in")} ${pc.white(Math.round(performance.now()))}ms\n`);
}
async function startServer(cwd) {
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
        if (config.mode === "pir" || config.mode === "ssg") {
            // PIR/SSR Development Server
            await startSSGDevServer(cwd, config);
            return;
        }
        let server = await startServer(cwd);
        const port = server.config.server.port;
        console.log(`  ${pc.green("➜")}  ${pc.bold("Local:")}   ${pc.cyan(`http://localhost:${port}/`)}`);
        console.log(`  ${pc.green("➜")}  ${pc.dim("Ready in")} ${pc.white(Math.round(performance.now()))}ms\n`);
        // Watch config file for changes
        const configPath = findConfigPath(cwd);
        if (configPath) {
            let debounce = null;
            fs.watch(configPath, () => {
                if (debounce)
                    return;
                debounce = setTimeout(async () => {
                    debounce = null;
                    console.log(`\n  ${pc.yellow("↻")}  ${pc.dim("Config changed, restarting...")}`);
                    try {
                        await server.close();
                        server = await startServer(cwd);
                        const newPort = server.config.server.port;
                        console.log(`  ${pc.green("➜")}  ${pc.bold("Local:")}   ${pc.cyan(`http://localhost:${newPort}/`)}`);
                        console.log(`  ${pc.green("➜")}  ${pc.dim("Restarted successfully")}\n`);
                    }
                    catch (e) {
                        console.error(pc.red(`  ✗  Restart failed: ${e.message}\n`));
                    }
                }, 300);
            });
        }
    }
    catch (e) {
        console.error(pc.red(pc.bold("\n  Failed to start server:")));
        console.error(pc.red(`  ${e.message}\n`));
        process.exit(1);
    }
}
