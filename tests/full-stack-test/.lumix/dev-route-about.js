
import { hydrate } from "lumix-js";
import Component from "./dev-ssr/about.mjs";

function hydrateComponent() {
  const root = document.getElementById("app");
  if (!root) {
    console.warn("Lumix Dev: Root element not found");
    return;
  }
  
  hydrate(root, Component);
  console.log("Lumix Dev: Route /about hydrated (server mode)");
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrateComponent);
} else {
  hydrateComponent();
}

document.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link || link.target === '_blank' || !link.href) return;
  
  const url = new URL(link.href);
  if (url.origin !== window.location.origin) return;
  
  e.preventDefault();
  window.location.href = url.pathname;
});
