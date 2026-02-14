import { compile } from "@luminjs/compiler";
export default function lumin(config) {
    return {
        name: "vite-plugin-lumin",
        enforce: "pre",
        async transform(code, id) {
            if (!id.endsWith(".lumin"))
                return;
            try {
                const js = await compile({
                    input: id,
                    bundle: false,
                });
                return {
                    code: js,
                    map: null,
                };
            }
            catch (e) {
                const error = new Error(e.message);
                error.id = id;
                error.plugin = "vite-plugin-lumin";
                if (e.luminLoc) {
                    error.loc = {
                        file: id,
                        line: e.luminLoc.line,
                        column: e.luminLoc.column,
                    };
                }
                else {
                    const errorMsg = e.stderr || e.stdout || e.message || "Unknown error";
                    const lines = errorMsg.split("\n");
                    const specificError = lines.find((line) => line.trim().startsWith("error:")) ||
                        errorMsg;
                    error.message = specificError;
                    error.loc = { file: id };
                }
                throw error;
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
                        const physicalPath = path.join(server.config.root, "index.html");
                        if (!fs.existsSync(physicalPath)) {
                            let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <div id="${config?.rootId || "app"}"></div>
  <script type="module" src="/main.js"></script>
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
            if (file.endsWith(".lumin")) {
                return modules;
            }
        },
    };
}
