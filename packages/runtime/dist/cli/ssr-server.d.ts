import type { ViteDevServer } from "vite";
import type { LuminConfig } from "../config.js";
export interface SSRServerOptions {
    cwd: string;
    config: LuminConfig;
    port?: number;
}
/**
 * Create an SSR server for server-side routes
 * This server handles "use server" routes with runtime rendering
 */
export declare function createSSRServer(options: SSRServerOptions): Promise<{
    server: ViteDevServer;
    middleware: (req: any, res: any, next: any) => Promise<any>;
    port: number;
} | null>;
