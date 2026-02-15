import { hydrate } from "lumix-js";
// @ts-ignore - Generated routes file
import { routes } from "../.lumix/routes.mjs";

const root = document.getElementById("app")!;
if (!root) throw new Error("Missing #app");

function getPathname(): string {
  return window.location.pathname.replace(/\/$/, "") || "/";
}

function findRoute(pathname: string): (typeof routes)[0] | undefined {
  return routes.find((r:any) => r.path === pathname) ?? routes.find((r:any) => r.path === "/");
}

async function render() {
  const pathname = getPathname();
  const route = findRoute(pathname);
  if (!route) {
    root.innerHTML = "<p>Not found</p>";
    return;
  }
  const mod = await import(/* @vite-ignore */ route.file);
  const Comp = mod?.default;
  if (!Comp) return;
  while (root.firstChild) root.removeChild(root.firstChild);
  hydrate(root, Comp);
}

render();

window.addEventListener("popstate", render);

document.addEventListener("click", (e) => {
  const a = (e.target as Element).closest("a");
  if (!a || a.target === "_blank" || a.hasAttribute("download") || !a.href) return;
  const url = new URL(a.href);
  if (url.origin !== window.location.origin) return;
  e.preventDefault();
  window.history.pushState({}, "", url.pathname);
  render();
});
