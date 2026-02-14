import { Signal, effect } from "./signals.js";
import { bind } from "./bind.js";
import { withHooks, runHooks } from "./lifecycle.js";

export type AttrValue = string | number | boolean | (() => any) | Signal<any>;

export interface Props {
  [key: string]: AttrValue;
}

export function h(
  tag: string | ((props: Props, ...children: any[]) => any),
  props: Props | null,
  ...children: any[]
): any {
  if (typeof tag === "function") {
    const { result, mount, destroy } = withHooks(() =>
      tag(props || {}, ...children),
    );

    // If it's a component that returns a single element, we can attach hooks to it
    if (result instanceof HTMLElement) {
      if (mount.length > 0) {
        // Simple trick: use MutationObserver or just run on next tick if added
        setTimeout(() => runHooks(mount), 0);
      }
      if (destroy.length > 0) {
        (result as any)._luminDestroy = destroy;
      }
    }
    return result;
  }

  const el = document.createElement(tag);

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      // ── bind: directive ──────────────────────────────
      if (key.startsWith("bind:")) {
        const property = key.slice(5); // "bind:value" → "value"
        if (typeof value === "function" && "_peek" in value) {
          // It's a Signal — set up two-way binding
          bind(el, property, value as Signal<any>);
        }
        continue;
      }

      // ── Event handlers ───────────────────────────────
      if (key.startsWith("on") && typeof value === "function") {
        const eventName = key.slice(2).toLowerCase();
        el.addEventListener(eventName, value as EventListener);
      }
      // ── Reactive attribute (Signal or closure) ───────
      else if (typeof value === "function") {
        effect(() => {
          const v = (value as Function)();
          if (
            key === "value" ||
            key === "checked" ||
            key === "disabled" ||
            key === "selected"
          ) {
            // DOM properties not attributes
            (el as any)[key] = v;
          } else if (typeof v === "boolean") {
            if (v) el.setAttribute(key, "");
            else el.removeAttribute(key);
          } else {
            el.setAttribute(key, String(v));
          }
        });
      }
      // ── Static attribute ─────────────────────────────
      else {
        el.setAttribute(key, String(value));
      }
    }
  }

  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined) continue;

    if (typeof child === "function") {
      // Reactive block (Signal, closure, or control flow helper)
      const startMarker = document.createComment("cf-start");
      const endMarker = document.createComment("cf-end");
      el.appendChild(startMarker);
      el.appendChild(endMarker);

      let prevNodes: Node[] = [];

      effect(() => {
        let v = (child as Function)();

        // Normalize to array of nodes
        let newNodes: Node[] = [];
        const items = Array.isArray(v) ? v.flat(Infinity) : [v];

        for (let item of items) {
          if (item === null || item === undefined) continue;

          while (typeof item === "function") {
            item = item();
          }

          if (item instanceof Node) {
            newNodes.push(item);
          } else {
            newNodes.push(document.createTextNode(String(item)));
          }
        }

        // --- Improved Reconciliation ---
        const newNodeSet = new Set(newNodes);

        // 1. Remove and unmount only nodes that are NOT in the new set
        for (const node of prevNodes) {
          if (!newNodeSet.has(node)) {
            unmount(node);
            if (node.parentNode === el) {
              el.removeChild(node);
            }
          }
        }

        // 2. Insert or move nodes
        // insertBefore naturally handles moves (reaches same state if already correctly positioned)
        for (const node of newNodes) {
          el.insertBefore(node, endMarker);
        }

        prevNodes = newNodes;
      });
    } else if (child instanceof Node) {
      el.appendChild(child);
    } else {
      el.appendChild(document.createTextNode(String(child)));
    }
  }

  return el;
}

export function Fragment(_props: any, ...children: any[]) {
  return children.flat(Infinity);
}

function unmount(node: Node) {
  if (node instanceof HTMLElement) {
    const hooks = (node as any)._luminDestroy;
    if (hooks) runHooks(hooks);
  }
  node.childNodes.forEach(unmount);
}

export function hydrate(
  root: HTMLElement,
  component: (props?: any) => HTMLElement,
  props?: any,
) {
  while (root.firstChild) root.removeChild(root.firstChild);
  const el = h(component, props || {});
  root.appendChild(el);
}
