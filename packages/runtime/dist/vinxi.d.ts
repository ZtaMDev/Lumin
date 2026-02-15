import type { LuminConfig } from "./config.js";
export interface VinxiAppConfig {
    routers: Array<Record<string, unknown>>;
}
/**
 * Ensure .lumix/routes.mjs exists in the project (for full-stack/SSG).
 * Call from CLI before starting Vinxi so the file exists before Vite resolves imports.
 */
export declare function ensureLumixRoutesFile(cwd: string, config: LuminConfig): string;
/**
 * Returns Vinxi app config (routers) for use with createApp().
 * Use in vinxi.config.mts: export default createApp(await createLumixVinxiRouters());
 */
export declare function createLumixVinxiRouters(cwd?: string): Promise<VinxiAppConfig>;
