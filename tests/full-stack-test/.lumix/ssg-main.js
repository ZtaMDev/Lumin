import { hydrate } from "lumix-js";
import Component0 from "./compiled/index.mjs";
import Component1 from "./compiled/about.mjs";

const components = {
  "c0": Component0,
  "c1": Component1,
};


// Secure routes mapping with directives - no file paths exposed
const routes = [{"path":"/","id":"c0","directive":"static"},{"path":"/about","id":"c1","directive":"server"}];

// Islands Architecture Support
export async function hydrateIsland(element, componentPath, props) {
  // Find component by path instead of file path
  const route = routes.find(r => r.path === componentPath);
  if (!route) {
    console.warn("Route not found for island:", componentPath);
    return;
  }
  
  const Component = components[route.id];
  if (!Component) {
    console.warn("Component not found for island:", route.id);
    return;
  }
  
  // Hydrate the island
  hydrate(element, Component, props);
}

// Client-side routing (only for current page, no route discovery)
function getCurrentPath() {
  return window.location.pathname.replace(/\/$/, "") || "/";
}

function findCurrentRoute() {
  const currentPath = getCurrentPath();
  return routes.find((r) => r.path === currentPath);
}

// Only hydrate if this is a SPA navigation (no islands present)
if (!window.__LUMIX_ISLANDS__ || window.__LUMIX_ISLANDS__.length === 0) {
  const currentRoute = findCurrentRoute();
  if (currentRoute) {
    const root = document.getElementById("app");
    if (root) {
      const Component = components[currentRoute.id];
      if (Component) {
        hydrate(root, Component);
      }
    }
  }
  
  // Handle client-side navigation (only for known routes)
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a || a.target === "_blank" || a.hasAttribute("download") || !a.href) return;
    
    const url = new URL(a.href);
    if (url.origin !== window.location.origin) return;
    
    // Only navigate to known routes (security check)
    const targetRoute = routes.find(r => r.path === url.pathname);
    if (!targetRoute) return;
    
    e.preventDefault();
    window.history.pushState({}, "", url.pathname);
    
    // Navigate to the new route
    const root = document.getElementById("app");
    if (root) {
      const Component = components[targetRoute.id];
      if (Component) {
        while (root.firstChild) root.removeChild(root.firstChild);
        hydrate(root, Component);
      }
    }
  });
  
  // Handle back/forward navigation
  window.addEventListener("popstate", () => {
    const currentRoute = findCurrentRoute();
    if (currentRoute) {
      const root = document.getElementById("app");
      if (root) {
        const Component = components[currentRoute.id];
        if (Component) {
          while (root.firstChild) root.removeChild(root.firstChild);
          hydrate(root, Component);
        }
      }
    }
  });
}
