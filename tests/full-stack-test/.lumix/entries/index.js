import { hydrate } from "lumix-js";
import Component from "../compiled/index.mjs";

// Hydrate this specific route
const root = document.getElementById("app");
if (root) {
  hydrate(root, Component);
}

// Export for dynamic imports
export default Component;
