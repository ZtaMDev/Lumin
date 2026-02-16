import type { LuminConfig } from "../config.js";
export interface PrerenderOptions {
    cwd: string;
    config: LuminConfig;
    staticRoutes: any[];
    manifest: any;
    outDir?: string;
    rootId?: string;
    title?: string;
}
/**
 * Prerender static routes to HTML files with per-route code splitting.
 * Each route gets its own HTML file with only the JS it needs.
 */
export declare function prerender(options: PrerenderOptions): Promise<void>;
