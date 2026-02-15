import path from "path";
import fs from "fs";
import { bundleRequire } from "bundle-require";
import type { LuminConfig } from "./config.js";

const CONFIG_FILES = [
  "lumix.config.mjs",
  "lumix.config.js",
  "lumix.config.ts",
  "lumix.config.mts",
];

export interface VinxiAppConfig {
  routers: Array<Record<string, unknown>>;
}

function scanRoutes(root: string, pagesDir: string): Array<{ path: string; file: string }> {
  const dir = path.join(root, pagesDir);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  const routes: Array<{ path: string; file: string }> = [];
  function walk(dirPath: string, prefix: string[]) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const e of entries) {
      const rel = [...prefix, e.name];
      if (e.isDirectory()) walk(path.join(dirPath, e.name), rel);
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

/**
 * Ensure .lumix/routes.mjs exists in the project (for full-stack/SSG).
 * Call from CLI before starting Vinxi so the file exists before Vite resolves imports.
 */
export function ensureLumixRoutesFile(cwd: string, config: LuminConfig): string {
  const pagesDir = config?.router?.pagesDir ?? path.join(config?.srcDir ?? "src", "routes");
  const routes = scanRoutes(cwd, pagesDir);
  const outDir = path.join(cwd, ".lumix");
  const outPath = path.join(outDir, "routes.mjs");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, `export const routes = ${JSON.stringify(routes)};\n`, "utf8");
  return outPath;
}

/**
 * Load lumix config from the given directory (default: cwd).
 */
async function loadLumixConfig(cwd: string = process.cwd()): Promise<LuminConfig> {
  for (const file of CONFIG_FILES) {
    const fullPath = path.resolve(cwd, file);
    if (fs.existsSync(fullPath)) {
      const { mod } = await bundleRequire({ filepath: fullPath });
      return mod.default || mod || {};
    }
  }
  return {};
}

/**
 * Returns Vinxi app config (routers) for use with createApp().
 * Use in vinxi.config.mts: export default createApp(await createLumixVinxiRouters());
 */
export async function createLumixVinxiRouters(
  cwd: string = process.cwd(),
): Promise<VinxiAppConfig> {
  const config = await loadLumixConfig(cwd);
  // Dynamic import so template projects (which have vite-plugin-lumix) resolve it
  const lumixPlugin = (await import("vite-plugin-lumix")).default;

  const routers: Array<Record<string, unknown>> = [
    {
      name: "public",
      type: "static",
      dir: "./public",
      base: "/",
    },
    {
      name: "lumix",
      type: "spa",
      handler: "./index.html",
      base: "/",
      root: cwd,
      plugins: () => [lumixPlugin(config)],
    },
  ];

  return { routers };
}
