import { defineConfig } from "lumix-js";

export default defineConfig({
  title: "LuminJS Blank App",
  head: {
    meta: [
      { name: "description", content: "A beautiful app built with LuminJS" },
    ],
  },
  rootId: "app",
  rootComponent: "/src/App.lumix",
  checkTypes: false,
});
