import { preview as vitePreview } from "vite";
import pc from "picocolors";
import { loadConfig } from "./loader.js";
import path from "path";
import fs from "fs";
import { VERSION } from "./constants.js";
export async function preview() {
    const cwd = process.cwd();
    const config = await loadConfig(cwd);
    console.log("");
    console.log(`  ${pc.bold(pc.cyan("⚡ LumixJS"))} ${pc.dim(`v${VERSION}`)}`);
    console.log(pc.dim("  Previewing production build...\n"));
    const isPir = config.mode === "pir" || config.mode === "ssg"; // Support both for backward compatibility
    // For PIR mode, check for client build output
    const outDir = isPir ? path.join(cwd, "dist/client") : path.join(cwd, "dist");
    if (!fs.existsSync(outDir)) {
        console.error(pc.red(`  Run lumix build first. No ${isPir ? 'dist/client' : 'dist'} found.\n`));
        process.exit(1);
    }
    try {
        // Check if there are server routes that need SSR
        let ssrServer = null;
        if (isPir) {
            const serverDir = path.join(cwd, "dist/server");
            if (fs.existsSync(serverDir)) {
                console.log(pc.dim("  Starting SSR server for server routes...\n"));
                const { createSSRServer } = await import("./ssr-server.js");
                ssrServer = await createSSRServer({
                    cwd,
                    config,
                    port: 3001,
                });
                if (ssrServer) {
                    console.log(`  ${pc.green("➜")}  ${pc.bold("SSR Server online")}`);
                }
            }
        }
        const server = await vitePreview({
            root: cwd,
            base: "/",
            build: {
                outDir: isPir ? "dist/client" : "dist",
            },
            preview: {
                port: 4173,
                strictPort: false,
                ...config.vite?.preview,
            },
            plugins: [
                {
                    name: "lumix-preview-handler",
                    configurePreviewServer(server) {
                        // Add SSR middleware if available
                        if (ssrServer) {
                            server.middlewares.use(ssrServer.middleware);
                        }
                        server.middlewares.use((req, res, next) => {
                            const url = req.url?.split("?")[0] ?? "/";
                            // Skip asset requests
                            if (url.includes(".") || url.startsWith("/assets")) {
                                return next();
                            }
                            // Handle route requests
                            if (url === "/") {
                                // Root route
                                const indexPath = path.join(outDir, "index.html");
                                if (fs.existsSync(indexPath)) {
                                    req.url = "/index.html";
                                }
                            }
                            else {
                                // Other routes - try to find their index.html
                                const routePath = path.join(outDir, url.slice(1), "index.html");
                                if (fs.existsSync(routePath)) {
                                    req.url = url.endsWith("/") ? url + "index.html" : url + "/index.html";
                                }
                                else {
                                    // If PIR mode and route not found, it might be a server route
                                    if (isPir) {
                                        // Check if this is a server route
                                        const directivesPath = path.join(cwd, ".lumix", "directives.json");
                                        if (fs.existsSync(directivesPath)) {
                                            const directives = JSON.parse(fs.readFileSync(directivesPath, "utf8"));
                                            if (directives[url] === "server") {
                                                // Let SSR middleware handle it
                                                return next();
                                            }
                                        }
                                        res.statusCode = 404;
                                        res.setHeader("Content-Type", "text/html");
                                        res.end(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>404 - Not Found</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto; }
    h1 { color: #dc2626; }
    p { color: #6b7280; }
    code { background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>404 - Route Not Found</h1>
  <p>The route <code>${url}</code> was not found in the static build.</p>
  <p><a href="/">← Back to home</a></p>
</body>
</html>`);
                                        return;
                                    }
                                    // Fallback to root for SPA routing
                                    const rootIndexPath = path.join(outDir, "index.html");
                                    if (fs.existsSync(rootIndexPath)) {
                                        req.url = "/index.html";
                                    }
                                }
                            }
                            next();
                        });
                    },
                },
            ],
        });
        const address = server.resolvedUrls?.local?.[0] ?? "http://localhost:4173/";
        console.log(`  ${pc.green("➜")}  ${pc.bold("Preview:")}  ${pc.cyan(address)}`);
        if (isPir) {
            console.log(`  ${pc.dim("  Serving PIR client build from")} ${pc.white("dist/client")}`);
            if (ssrServer) {
                console.log(`  ${pc.dim("  SSR routes available via SSR server")}`);
            }
        }
        console.log(`  ${pc.green("➜")}  ${pc.dim("press")} ${pc.bold("Ctrl+C")} ${pc.dim("to stop")}\n`);
    }
    catch (e) {
        console.error(pc.red(pc.bold("\n  Preview failed!")));
        console.error(pc.red(`  ${e.message}\n`));
        process.exit(1);
    }
}
