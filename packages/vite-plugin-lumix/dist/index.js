import { compile } from "@lumix-js/compiler";
import path from "path";
import fs from "fs";
function normalizePath(p) {
    return p.replace(/\\/g, "/");
}
const ROUTES_VIRTUAL_ID = "virtual:lumix/routes";
const ROUTES_GENERATED_FILE = ".lumix/routes.mjs";
function scanRoutes(root, pagesDir) {
    const dir = path.join(root, pagesDir);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory())
        return [];
    const routes = [];
    function walk(dirPath, prefix) {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const e of entries) {
            const rel = [...prefix, e.name];
            if (e.isDirectory())
                walk(path.join(dirPath, e.name), rel);
            else if (e.name.endsWith(".lumix")) {
                const segs = rel
                    .slice(0, -1)
                    .concat(path.basename(e.name, ".lumix"))
                    .map((s) => s.replace(/^\[([^\]]+)\]$/, ":$1"));
                const pathSegs = segs[segs.length - 1] === "index" ? segs.slice(0, -1) : segs;
                const routePath = "/" + pathSegs.join("/") || "/";
                const filePath = "/" + path.join(pagesDir, ...rel).replace(/\\/g, "/");
                routes.push({ path: routePath, file: filePath });
            }
        }
    }
    walk(dir, []);
    return routes.sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : a.path.localeCompare(b.path)));
}
function writeRoutesFile(root, pagesDir) {
    const routes = scanRoutes(root, pagesDir);
    const outDir = path.join(root, ".lumix");
    const outPath = path.join(outDir, "routes.mjs");
    if (!fs.existsSync(outDir))
        fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, `export const routes = ${JSON.stringify(routes)};\n`, "utf8");
    return outPath;
}
export default function lumix(config) {
    let isBuild = false;
    let resolvedRoot = "";
    let routesFilePath = "";
    /** Resolved main entry module id for HMR (e.g. "/main.ts"). No rootComponent needed. */
    let mainEntryId = null;
    return {
        name: "vite-plugin-lumix",
        enforce: "pre",
        config(viteConfig) {
            const root = viteConfig?.root ?? process.cwd();
            const pagesDir = config?.router?.pagesDir ?? path.join(config?.srcDir ?? "src", "routes");
            const outPath = writeRoutesFile(root, pagesDir);
            const existing = viteConfig?.resolve?.alias;
            const existingArr = Array.isArray(existing)
                ? existing
                : existing && typeof existing === "object"
                    ? Object.entries(existing).map(([find, replacement]) => ({ find, replacement }))
                    : [];
            return {
                resolve: {
                    alias: [
                        ...existingArr,
                        { find: "virtual:lumix/routes", replacement: outPath },
                        { find: ".lumix/routes", replacement: outPath },
                    ],
                },
            };
        },
        configResolved(resolvedConfig) {
            resolvedRoot = resolvedConfig.root;
            isBuild = resolvedConfig.command === "build";
            const pagesDir = config?.router?.pagesDir ?? path.join(config?.srcDir ?? "src", "routes");
            routesFilePath = writeRoutesFile(resolvedRoot, pagesDir);
            if (!isBuild) {
                const root = resolvedConfig.root;
                const srcDir = config?.srcDir ?? ".";
                const base = path.join(root, srcDir);
                if (fs.existsSync(path.join(base, "main.ts")))
                    mainEntryId = "/" + path.join(srcDir, "main.ts").replace(/\\/g, "/");
                else if (fs.existsSync(path.join(base, "main.js")))
                    mainEntryId = "/" + path.join(srcDir, "main.js").replace(/\\/g, "/");
                else if (fs.existsSync(path.join(root, "main.ts")))
                    mainEntryId = "/main.ts";
                else if (fs.existsSync(path.join(root, "main.js")))
                    mainEntryId = "/main.js";
            }
        },
        buildStart() {
            const root = this.config?.root ?? process.cwd();
            const pagesDir = config?.router?.pagesDir ?? path.join(config?.srcDir ?? "src", "routes");
            writeRoutesFile(root, pagesDir);
        },
        resolveId(id) {
            if (id === ROUTES_VIRTUAL_ID && routesFilePath)
                return routesFilePath;
            return null;
        },
        async transform(code, id) {
            if (!id.endsWith(".lumix"))
                return;
            try {
                let js = await compile({
                    input: id,
                    bundle: false,
                    checkTypes: config?.checkTypes,
                });
                // HMR: on any .lumix update, re-import the main entry so it re-runs and re-hydrates with updated components.
                // No rootComponent config needed — the entry (main.ts/js) already calls hydrate(root, App).
                if (!isBuild && mainEntryId) {
                    js += `\n\nif (import.meta.hot) {\n`;
                    js += `  import.meta.hot.accept((m) => {\n`;
                    js += `    try {\n`;
                    js += `      import(/* @vite-ignore */ ${JSON.stringify(mainEntryId)} + '?t=' + Date.now()).then(() => {}).catch(() => {});\n`;
                    js += `    } catch (e) {\n`;
                    js += `      console.error('[lumix-hmr] failed to apply update', e);\n`;
                    js += `      import.meta.hot.invalidate();\n`;
                    js += `    }\n`;
                    js += `  });\n`;
                    js += `}\n`;
                }
                return {
                    code: js,
                    map: null,
                };
            }
            catch (e) {
                const error = new Error(e.message);
                error.id = id;
                error.plugin = "vite-plugin-lumix";
                // Generate code frame for better Vite error display
                let frame = "";
                if (e.luminLoc) {
                    error.loc = {
                        file: id,
                        line: e.luminLoc.line,
                        column: e.luminLoc.column,
                    };
                    const lines = code.split("\n");
                    const lineIdx = e.luminLoc.line - 1;
                    if (lineIdx >= 0 && lineIdx < lines.length) {
                        const start = Math.max(0, lineIdx - 2);
                        const end = Math.min(lines.length, lineIdx + 3);
                        frame = lines
                            .slice(start, end)
                            .map((l, i) => {
                            const curr = start + i;
                            const prefix = curr === lineIdx ? " > " : "   ";
                            const lineNum = (curr + 1).toString().padStart(3, " ");
                            let out = `${prefix}${lineNum} | ${l}`;
                            if (curr === lineIdx) {
                                const pad = " ".repeat(3 + 3 + 3 + e.luminLoc.column - 1);
                                out += `\n${pad}^`;
                            }
                            return out;
                        })
                            .join("\n");
                        error.frame = frame;
                    }
                }
                else {
                    const errorMsg = e.stderr || e.stdout || e.message || "Unknown error";
                    const lines = errorMsg.split("\n");
                    const specificError = lines.find((line) => line.trim().startsWith("error:")) ||
                        errorMsg;
                    error.message = specificError;
                    error.loc = { file: id };
                }
                if (isBuild) {
                    // In production build, we want a hard failure
                    this.error(error);
                }
                // In development, to avoid duplicate Vite logs, we log it once ourselves
                // and return a module that throws in the browser.
                console.error(`\n\x1b[31m[vite-plugin-lumix] ${error.message}\x1b[0m\n` +
                    `\x1b[2mfile: ${id}:${error.loc?.line || 0}:${error.loc?.column || 0}\x1b[0m\n` +
                    (frame ? `\n${frame}\n` : ""));
                return {
                    code: `throw new Error(${JSON.stringify(`[lumix] ${error.message}\n\n${frame}`)}); export default {};`,
                    map: { mappings: "" },
                };
            }
        },
        transformIndexHtml(html) {
            if (!config)
                return html;
            let headTags = "";
            if (config.title) {
                headTags += `  <title>${config.title}</title>\n`;
            }
            if (config.favicon) {
                headTags += `  <link rel="icon" href="${config.favicon}">\n`;
            }
            if (config.head) {
                if (config.head.meta) {
                    for (const m of config.head.meta) {
                        const attrs = Object.entries(m)
                            .map(([k, v]) => `${k}="${v}"`)
                            .join(" ");
                        headTags += `  <meta ${attrs}>\n`;
                    }
                }
                if (config.head.link) {
                    for (const l of config.head.link) {
                        const attrs = Object.entries(l)
                            .map(([k, v]) => `${k}="${v}"`)
                            .join(" ");
                        headTags += `  <link ${attrs}>\n`;
                    }
                }
                if (config.head.script) {
                    for (const s of config.head.script) {
                        const attrs = Object.entries(s)
                            .map(([k, v]) => `${k}="${v}"`)
                            .join(" ");
                        headTags += `  <script ${attrs}></script>\n`;
                    }
                }
            }
            // Inject into head
            if (html.includes("</head>")) {
                return html.replace("</head>", `${headTags}</head>`);
            }
            return html;
        },
        configureServer(server) {
            const pagesDir = config?.router?.pagesDir ?? path.join(config?.srcDir ?? "src", "routes");
            return () => {
                const watcher = server?.watcher;
                if (watcher && resolvedRoot) {
                    const routesDir = path.join(resolvedRoot, pagesDir);
                    if (fs.existsSync(routesDir)) {
                        watcher.on("change", (file) => {
                            if (file.endsWith(".lumix"))
                                writeRoutesFile(resolvedRoot, pagesDir);
                        });
                        watcher.add(routesDir);
                    }
                }
                server.middlewares.use(async (req, res, next) => {
                    const url = req.url || "";
                    if (url === "/" || url === "/index.html") {
                        const fs = await import("fs");
                        const path = await import("path");
                        const root = server.config.root;
                        const physicalPath = path.join(root, "index.html");
                        if (!fs.existsSync(physicalPath)) {
                            // Auto-detect entry: main.ts > main.js
                            const entry = fs.existsSync(path.join(root, "main.ts"))
                                ? "/main.ts"
                                : "/main.js";
                            let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <div id="${config?.rootId || "app"}"></div>
  <script type="module" src="${entry}"></script>
</body>
</html>`;
                            // Let Vite process it (injects HMR client, runs transformIndexHtml hooks)
                            html = await server.transformIndexHtml(url, html);
                            res.statusCode = 200;
                            res.setHeader("Content-Type", "text/html");
                            res.end(html);
                            return;
                        }
                    }
                    next();
                });
            };
        },
        handleHotUpdate({ file, server, modules }) {
            if (file.endsWith(".lumix")) {
                return modules;
            }
        },
    };
}
