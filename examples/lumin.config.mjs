import { defineConfig } from "luminjs";

export default defineConfig({
  title: "LuminJS Feature Demos",
  head: {
    meta: [
      {
        name: "description",
        content:
          "Demos of LuminJS features like Slots, Props, and Control Flow",
      },
    ],
    link: [{ rel: "icon", href: "/favicon.ico" }],
  },
  rootId: "app",
  checkTypes: false,
});
