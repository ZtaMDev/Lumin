import { Signal, effect } from "./signals";
import { bind } from "./bind";

export type AttrValue = string | number | boolean | (() => any) | Signal<any>;

export interface Props {
  [key: string]: AttrValue;
}

export function h(
  tag: string | ((props: Props, ...children: any[]) => HTMLElement),
  props: Props | null,
  ...children: any[]
): HTMLElement {
  if (typeof tag === "function") {
    return tag(props || {}, ...children);
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
      // Reactive text node (Signal or closure)
      const textNode = document.createTextNode("");
      el.appendChild(textNode);
      effect(() => {
        const v = (child as Function)();
        textNode.textContent = String(v ?? "");
      });
    } else if (child instanceof Node) {
      el.appendChild(child);
    } else {
      el.appendChild(document.createTextNode(String(child)));
    }
  }

  return el;
}

export function hydrate(
  root: HTMLElement,
  component: (props?: any) => HTMLElement,
  props?: any,
) {
  while (root.firstChild) root.removeChild(root.firstChild);
  root.appendChild(component(props));
}
