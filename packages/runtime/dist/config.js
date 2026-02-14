const VALID_KEYS = new Set([
    "title",
    "favicon",
    "head",
    "rootId",
    "vite",
    "srcDir",
    "checkTypes",
]);
/**
 * Helper function to provide types for the LuminJS config.
 * Validates the config and warns about unknown fields.
 */
export function defineConfig(config) {
    const unknown = Object.keys(config).filter((k) => !VALID_KEYS.has(k));
    if (unknown.length > 0) {
        console.warn(`\x1b[33m[lumin] Warning: Unknown config field(s): ${unknown.map((k) => `"${k}"`).join(", ")}.\x1b[0m`);
        console.warn(`\x1b[33m[lumin] Valid fields are: ${[...VALID_KEYS].join(", ")}.\x1b[0m`);
    }
    return config;
}
