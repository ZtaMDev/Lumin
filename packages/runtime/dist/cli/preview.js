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
    const outDir = path.join(cwd, "dist");
    if (!fs.existsSync(outDir)) {
        console.error(pc.red("  Run lumix build first. No dist/ found.\n"));
        process.exit(1);
    }
    try {
        const server = await vitePreview({
            root: cwd,
            base: "/",
            build: {
                outDir: "dist",
            },
            preview: {
                port: 4173,
                strictPort: false,
                ...config.vite?.preview,
            },
            plugins: [
                {
                    name: "lumix-preview-fallback",
                    configurePreviewServer(server) {
                        server.middlewares.use((req, res, next) => {
                            const url = req.url?.split("?")[0] ?? "/";
                            // Handle SPA fallback for routes that don't have corresponding files
                            if (!url.includes(".") && url !== "/") {
                                const tryPath = path.join(outDir, url.slice(1), "index.html");
                                if (fs.existsSync(tryPath)) {
                                    req.url = url.endsWith("/") ? url + "index.html" : url + "/index.html";
                                }
                                else {
                                    // Fallback to root index.html for SPA routing
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
        console.log(`  ${pc.green("➜")}  ${pc.dim("press")} ${pc.bold("Ctrl+C")} ${pc.dim("to stop")}\n`);
    }
    catch (e) {
        console.error(pc.red(pc.bold("\n  Preview failed!")));
        console.error(pc.red(`  ${e.message}\n`));
        process.exit(1);
    }
}
