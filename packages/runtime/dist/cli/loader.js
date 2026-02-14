import { bundleRequire } from "bundle-require";
import path from "path";
import fs from "fs";
const CONFIG_FILES = [
    "lumix.config.mjs",
    "lumix.config.js",
    "lumix.config.ts",
    "lumix.config.mts",
];
/**
 * Find the config file path in the given directory.
 */
export function findConfigPath(cwd) {
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
export async function loadConfig(cwd = process.cwd()) {
    const configPath = findConfigPath(cwd);
    if (!configPath) {
        return {};
    }
    const { mod } = await bundleRequire({
        filepath: configPath,
    });
    return mod.default || mod;
}
