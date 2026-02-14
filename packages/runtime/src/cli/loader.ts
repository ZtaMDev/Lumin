import { bundleRequire } from "bundle-require";
import path from "path";
import fs from "fs";
import type { LuminConfig } from "../config.js";

const CONFIG_FILES = [
  "lumin.config.mjs",
  "lumin.config.js",
  "lumin.config.ts",
  "lumin.config.mts",
];

/**
 * Find the config file path in the given directory.
 */
export function findConfigPath(cwd: string): string | undefined {
  for (const file of CONFIG_FILES) {
    const fullPath = path.resolve(cwd, file);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return undefined;
}

/**
 * Load and return the LuminJS config from the project directory.
 */
export async function loadConfig(
  cwd: string = process.cwd(),
): Promise<LuminConfig> {
  const configPath = findConfigPath(cwd);

  if (!configPath) {
    return {};
  }

  const { mod } = await bundleRequire({
    filepath: configPath,
  });

  return mod.default || mod;
}
