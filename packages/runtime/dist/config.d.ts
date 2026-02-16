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
     * Meta-framework mode. Use "ssg" for the full-stack meta-framework template.
     * Omit or use default for SPA (blank/blank-ts).
     */
    mode?: "spa" | "ssg";
    /**
     * File-based router config (used when mode is "vinxi-ssg").
     */
    router?: {
        pagesDir?: string;
        apiDir?: string;
    };
    /**
     * SSG options (used when mode is "vinxi-ssg").
     */
    ssg?: {
        enabled?: boolean;
    };
    /**
     * Development server options.
     */
    dev?: {
        /**
         * Show the dev indicator overlay with route info and rendering mode.
         * Defaults to false.
         */
        showIndicator?: boolean;
    };
    /** Allow extra keys without TS errors, but we'll warn at runtime */
    [key: string]: any;
}
/**
 * Helper function to provide types for the LuminJS config.
 * Validates the config and warns about unknown fields.
 */
export declare function defineConfig(config: LuminConfig): LuminConfig;
