const VALID_KEYS = new Set([
  "title",
  "favicon",
  "head",
  "rootId",
  "vite",
  "srcDir",
  "checkTypes",
  "rootComponent",
]);

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

  /** Allow extra keys without TS errors, but we'll warn at runtime */
  [key: string]: any;
}

/**
 * Helper function to provide types for the LuminJS config.
 * Validates the config and warns about unknown fields.
 */
export function defineConfig(config: LuminConfig): LuminConfig {
  const unknown = Object.keys(config).filter((k) => !VALID_KEYS.has(k));
  if (unknown.length > 0) {
    console.warn(
      `\x1b[33m[lumix] Warning: Unknown config field(s): ${unknown.map((k) => `"${k}"`).join(", ")}.\x1b[0m`,
    );
    console.warn(
      `\x1b[33m[lumix] Valid fields are: ${[...VALID_KEYS].join(", ")}.\x1b[0m`,
    );
  }
  return config;
}
