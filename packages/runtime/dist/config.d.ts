export interface RouteHeadConfig {
    title?: string;
    meta?: Array<Record<string, string>>;
    link?: Array<Record<string, string>>;
    script?: Array<Record<string, string>>;
}
export interface LuminConfig {
    /**
     * Application title, injected into the <title> tag.
     */
    title?: string;
    /**
     * Path to the favicon file (e.g. "./favicon.ico" or "/icon.png").
     */
    favicon?: string;
    /**
     * Head metadata (meta tags, link tags, etc.)
     */
    head?: {
        meta?: Array<Record<string, string>>;
        link?: Array<Record<string, string>>;
        script?: Array<Record<string, string>>;
    };
    /**
     * Root element ID to hydrate into. Defaults to 'app'.
     */
    rootId?: string;
    /**
     * Optional path (Vite id) of the root .lumix component for HMR.
     * Example: "/LayoutDemo.lumix" or "/src/App.lumix".
     */
    rootComponent?: string;
    /**
     * Vite specific configuration overrides.
     */
    vite?: any;
    /**
     * Source directory. Defaults to the root of the project.
     */
    srcDir?: string;
    /**
     * Enable or disable semantic type checking during build/dev.
     * Defaults to true in TS projects, can be disabled for JS projects.
     */
    checkTypes?: boolean;
    /**
     * Public directory for static assets. Defaults to 'public'.
     */
    publicDir?: string;
    /**
     * Output directory for build. Defaults to 'dist'.
     */
    outDir?: string;
    /**
     * Build configuration options.
     */
    build?: {
        /**
         * Output directory. Defaults to 'dist'.
         */
        outDir?: string;
        /**
         * Whether to minify the output. Defaults to true in production.
         */
        minify?: boolean | 'terser' | 'esbuild';
        /**
         * Whether to generate sourcemaps. Defaults to false.
         */
        sourcemap?: boolean | 'inline' | 'hidden';
        /**
         * Target browsers for the build. Defaults to 'modules'.
         */
        target?: string | string[];
        /**
         * Chunk size warning limit in kbs. Defaults to 500.
         */
        chunkSizeWarningLimit?: number;
        /**
         * Whether to empty the output directory before building. Defaults to true.
         */
        emptyOutDir?: boolean;
        /**
         * Rollup options for advanced configuration.
         */
        rollupOptions?: any;
    };
    /** Allow extra keys without TS errors, but we'll warn at runtime */
    [key: string]: any;
}
/**
 * Helper function to provide types for the LuminJS config.
 * Validates the config and warns about unknown fields.
 */
export declare function defineConfig(config: LuminConfig): LuminConfig;
