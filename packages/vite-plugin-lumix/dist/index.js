import { compile } from "@lumix-js/compiler";
function normalizePath(p) {
    return p.replace(/\\/g, "/");
}
export default function lumix(config) {
    let isBuild = false;
    return {
        name: "vite-plugin-lumix",
        enforce: "pre",
        configResolved(resolvedConfig) {
            isBuild = resolvedConfig.command === "build";
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
                // HMR: keep it safe in ESM.
                // We avoid auto-mounting at module evaluation time (it can clear the app multiple times).
                // Instead, on update we re-hydrate the app root with the updated module.
                if (!isBuild) {
                    const rootId = config?.rootId || "app";
                    const configuredRoot = config?.rootComponent;
                    const normalizedId = normalizePath(id);
                    const normalizedRoot = configuredRoot
                        ? normalizePath(configuredRoot)
                        : "/src/App.lumix";
                    const isRootModule = normalizedId.endsWith(normalizedRoot);
                    js += `\n\nif (import.meta.hot) {\n`;
                    js += `  globalThis.__lumix_hmr ||= { rootId: ${JSON.stringify(rootId)}, rootModuleId: null, ping: null, _t: null, _busy: false };\n`;
                    js += `  if (${isRootModule ? "true" : "false"}) {\n`;
                    js += `    // Store the root module id (Vite specifier) so we can re-import it with cache-busting on child updates.\n`;
                    js += `    globalThis.__lumix_hmr.rootModuleId = "/@fs/" + ${JSON.stringify(normalizedId)};\n`;
                    js += `    globalThis.__lumix_hmr.ping ||= () => {\n`;
                    js += `      try {\n`;
                    js += `        if (globalThis.__lumix_hmr._busy) return;\n`;
                    js += `        const rootEl = document.getElementById(globalThis.__lumix_hmr.rootId);\n`;
                    js += `        if (!rootEl) return;\n`;
                    js += `        const mid = globalThis.__lumix_hmr.rootModuleId;\n`;
                    js += `        if (!mid) return;\n`;
                    js += `        globalThis.__lumix_hmr._busy = true;\n`;
                    js += `        // Force fresh evaluation of the root module so updated child imports are picked up.\n`;
                    js += `        import(/* @vite-ignore */ (mid + '?t=' + Date.now())).then((m2) => {\n`;
                    js += `          const comp = (m2 && m2.default) ? m2.default : null;\n`;
                    js += `          if (!comp) return;\n`;
                    js += `          import(\"lumix-js\").then(({ hydrate }) => hydrate(rootEl, comp));\n`;
                    js += `        }).finally(() => { globalThis.__lumix_hmr._busy = false; });\n`;
                    js += `      } catch (e) {}\n`;
                    js += `    };\n`;
                    js += `  }\n`;
                    js += `  import.meta.hot.accept((m) => {\n`;
                    js += `    try {\n`;
                    js += `      // If root updated, refresh the stored root URL.\n`;
                    js += `      if (${isRootModule ? "true" : "false"}) {\n`;
                    js += `        globalThis.__lumix_hmr.rootModuleId = "/@fs/" + ${JSON.stringify(normalizedId)};\n`;
                    js += `      }\n`;
                    js += `      if (globalThis.__lumix_hmr && globalThis.__lumix_hmr.ping) {\n`;
                    js += `        clearTimeout(globalThis.__lumix_hmr._t);\n`;
                    js += `        globalThis.__lumix_hmr._t = setTimeout(() => globalThis.__lumix_hmr.ping(), 25);\n`;
                    js += `      }\n`;
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
            return () => {
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
