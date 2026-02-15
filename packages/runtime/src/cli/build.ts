import { build as viteBuild } from "vite";
import lumix from "../../../vite-plugin-lumix/dist/index.js";
import pc from "picocolors";
import { loadConfig } from "./loader.js";
import path from "path";
import fs from "fs-extra";
import { __dirname } from "./utils.js";
import { VERSION } from "./constants.js";

export async function build() {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  console.log("");
  console.log(`  ${pc.bold(pc.cyan("⚡ LumixJS"))} ${pc.dim(`v${VERSION}`)}`);
  console.log(pc.dim("  Building for production...\n"));

  const indexPath = path.join(cwd, "index.html");
  const hasIndex = fs.existsSync(indexPath);

  try {
    // Auto-detect JS entry module: main.ts > main.js
    const entryModule = fs.existsSync(path.join(cwd, "main.ts"))
      ? path.join(cwd, "main.ts")
      : path.join(cwd, "main.js");

    // If there is no physical index.html, emit one directly into dist/index.html
    // after the JS build is generated.
    const htmlEmitPlugin = !hasIndex
      ? {
          name: "lumix-html-index-emitter",
          generateBundle(this: any, _opts: any, bundle: any) {
            // Find the main entry chunk (the one corresponding to main.ts/js)
            const chunks = Object.values(bundle) as any[];
            const entryChunk =
              chunks.find(
                (c) => c.type === "chunk" && c.isEntry && c.facadeModuleId?.endsWith("main.ts"),
              ) ||
              chunks.find((c) => c.type === "chunk" && c.isEntry);
            const jsFile = entryChunk?.fileName;
            if (!jsFile) return;
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <div id="${config?.rootId || "app"}"></div>
  <script type="module" src="/${jsFile}"></script>
</body>
</html>`;
            this.emitFile({
              type: "asset",
              fileName: "index.html",
              source: html,
            });
          },
        }
      : null;

    await viteBuild({
      root: cwd,
      base: "/",
      plugins: [
        ...(htmlEmitPlugin ? [htmlEmitPlugin as any] : []),
        lumix(config),
        ...(config.vite?.plugins || []),
      ],
      build: {
        outDir: "dist",
        emptyOutDir: true,
        // If there is no index.html, tell Vite/Rollup to use the JS entry module
        // instead of the default HTML entry. The HTML file will be emitted by
        // htmlEmitPlugin as dist/index.html.
        ...(hasIndex
          ? {}
          : {
              rollupOptions: {
                input: entryModule,
              },
            }),
        ...config.vite?.build,
      },
      resolve: {
        alias: {
          "lumix-js": path.resolve(__dirname, "../index.js"),
          ...config.vite?.resolve?.alias,
        },
      },
      ...config.vite,
    });

    console.log(pc.green(pc.bold("\n  Build completed successfully!")));
    console.log(pc.dim(`  Output directory: ${pc.white("./dist")}\n`));
  } catch (e: any) {
    console.error(pc.red(pc.bold("\n  Build failed!")));
    console.error(pc.red(`  ${e.message}\n`));
    process.exit(1);
  }
}
