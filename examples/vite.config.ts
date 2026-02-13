import { defineConfig } from "vite";
import lumin from "vite-plugin-lumin";

export default defineConfig({
  plugins: [lumin()],
  resolve: {
    alias: {
      "@luminjs/runtime": "../packages/runtime/src/index.ts",
    },
  },
  // We alias runtime to src/index.ts to use the source directly in dev,
  // or we can let it resolve to dist if built.
  // Using src is better for live editing the runtime.
  server: {
    port: 3000,
  },
});
