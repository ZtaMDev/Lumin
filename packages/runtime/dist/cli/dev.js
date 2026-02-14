import { createServer } from "vite";
import lumix from "../../../vite-plugin-lumix/dist/index.js";
import pc from "picocolors";
import { loadConfig, findConfigPath } from "./loader.js";
import path from "path";
import fs from "fs";
import { __dirname } from "./utils.js";
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
    console.log("");
    console.log(`  ${pc.bold(pc.cyan("⚡ LumixJS"))} ${pc.dim("v0.1.0")}`);
    console.log(pc.dim("  Starting development server...\n"));
    try {
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
