import { build as viteBuild } from "vite";
import lumin from "vite-plugin-lumin";
import pc from "picocolors";
import { loadConfig } from "./loader.js";
import path from "path";
import fs from "fs-extra";
import { __dirname } from "./utils.js";

export async function build() {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  console.log("");
  console.log(`  ${pc.bold(pc.cyan("⚡ LuminJS"))} ${pc.dim("v0.1.0")}`);
  console.log(pc.dim("  Building for production...\n"));

  const indexPath = path.join(cwd, "index.html");
  const hasIndex = fs.existsSync(indexPath);
  let tempIndex = false;

  try {
    if (!hasIndex) {
      tempIndex = true;
      // Auto-detect entry: main.ts > main.js
      const entry = fs.existsSync(path.join(cwd, "main.ts"))
        ? "/main.ts"
        : "/main.js";

      const defaultHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <div id="${config?.rootId || "app"}"></div>
  <script type="module" src="${entry}"></script>
</body>
</html>
      `.trim();
      fs.writeFileSync(indexPath, defaultHtml);
    }

    await viteBuild({
      root: cwd,
      base: "/",
      plugins: [lumin(config), ...(config.vite?.plugins || [])],
      build: {
        outDir: "dist",
        emptyOutDir: true,
        ...config.vite?.build,
      },
      resolve: {
        alias: {
          luminjs: path.resolve(__dirname, "../index.js"),
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
  } finally {
    if (tempIndex && fs.existsSync(indexPath)) {
      fs.removeSync(indexPath);
    }
  }
}
