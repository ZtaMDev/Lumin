import type { LuminConfig } from "../config.js";
/**
 * Find the config file path in the given directory.
 */
export declare function findConfigPath(cwd: string): string | undefined;
/**
 * Load and return the LuminJS config from the project directory.
 */
export declare function loadConfig(cwd?: string): Promise<LuminConfig>;
