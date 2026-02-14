import { preview as vitePreview } from "vite";
import lumin from "../../../vite-plugin-lumix/dist/index.js";
import pc from "picocolors";
import { loadConfig } from "./loader.js";
import path from "path";
import { __dirname } from "./utils.js";

export async function preview() {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  console.log("");
  console.log(`  ${pc.bold(pc.cyan("⚡ LumixJS"))} ${pc.dim("v0.1.0")}`);
  console.log(pc.dim("  Previewing production build...\n"));

  try {
    const server = await vitePreview({
      root: cwd,
      base: "/",
      plugins: [lumin(config), ...(config.vite?.plugins || [])],
      preview: {
        port: 4173,
        ...config.vite?.preview,
      },
      resolve: {
        alias: {
          "lumix-js": path.resolve(__dirname, "../index.js"),
          ...config.vite?.resolve?.alias,
        },
      },
      ...config.vite,
    });

    const address = server.resolvedUrls?.local?.[0] || `http://localhost:4173/`;

    console.log(
      `  ${pc.green("➜")}  ${pc.bold("Preview:")}  ${pc.cyan(address)}`,
    );
    console.log(
      `  ${pc.green("➜")}  ${pc.dim("press")} ${pc.bold("Ctrl+C")} ${pc.dim("to stop")}\n`,
    );
  } catch (e: any) {
    console.error(pc.red(pc.bold("\n  Preview failed!")));
    console.error(pc.red(`  ${e.message}\n`));
    process.exit(1);
  }
}
