import { defineConfig } from "lumix-js";

export default defineConfig({
  title: "Lumix App",
  rootId: "app",
  srcDir: "src",
  mode: "pir", // Progressive Instant Rendering (PIR) mode
  router: {
    pagesDir: "src/routes",
  },
  head: {
    meta: [{ name: "description", content: "Lumix full-stack meta-framework with PIR" }],
  },
});
