import type { LuminConfig } from "../config.js";
export interface PrerenderOptions {
    cwd: string;
    config: LuminConfig;
    clientScriptSrc: string;
    outDir?: string;
    rootId?: string;
    title?: string;
}
/**
 * Prerender all routes to static HTML files (SSG like Astro).
 * Requires happy-dom and @lumix-js/compiler. Call after Vite client build.
 */
export declare function prerender(options: PrerenderOptions): Promise<void>;
