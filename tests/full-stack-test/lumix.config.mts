import { defineConfig } from "lumix-js";

export default defineConfig({
  title: "Lumix App",
  rootId: "app",
  srcDir: "src",
  mode: "ssg",
  router: {
    pagesDir: "src/routes",
    apiDir: "src/routes.api",
  },
  head: {
    meta: [{ name: "description", content: "Lumix full-stack meta-framework" }],
  },
  dev: {
    showIndicator: true, // Enable dev indicator (drag & drop, hide/show)
  },
});
