
import { hydrate } from "lumix-js";

// Import the compiled component for hydration
import Component from "./dev-ssr/index.mjs";

// Islands Architecture - Hydrate the entire component as an island
function hydrateIsland() {
  const root = document.getElementById("app");
  if (!root) {
    console.warn("Lumix SSG Dev: Root element not found");
    return;
  }
  
  // Clear the static content and hydrate with the interactive component
  hydrate(root, Component);
  console.log("Lumix SSG Dev: Component island hydrated");
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrateIsland);
} else {
  hydrateIsland();
}
