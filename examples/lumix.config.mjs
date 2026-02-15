import { defineConfig } from "lumix-js";

export default defineConfig({
  title: "LumixJS Feature Demos",
  head: {
    meta: [
      {
        name: "description",
        content:
          "Demos of LumixJS features like Slots, Props, and Control Flow",
      },
    ],
    link: [{ rel: "icon", href: "/favicon.ico" }],
  },
  rootId: "app",
  rootComponent: "/LayoutDemo.lumix",
  checkTypes: false,
});
