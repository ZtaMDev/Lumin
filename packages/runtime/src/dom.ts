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

    // Attach hooks for single element or Fragment(array) roots.
    const roots = Array.isArray(result) ? result : [result];
    for (const r of roots) {
      if (r instanceof HTMLElement) {
        if (mount.length > 0) {
          setTimeout(() => runHooks(mount), 0);
        }
        if (destroy.length > 0) {
          (r as any)._luminDestroy = destroy;
        }
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

          // Unwrap nested functions
          while (typeof item === "function") {
            item = item();
          }

          if (item instanceof Node) {
            newNodes.push(item);
          } else {
            // Convert to string, handling primitives properly
            const textValue = item === null || item === undefined ? '' : String(item);
            newNodes.push(document.createTextNode(textValue));
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
      // Handle primitives - convert to string properly
      const textValue = child === null || child === undefined ? '' : String(child);
      el.appendChild(document.createTextNode(textValue));
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
  component: (props?: any) => any,
  props?: any,
) {
  while (root.firstChild) root.removeChild(root.firstChild);
  const out = h(component, props || {});
  const nodes = Array.isArray(out) ? out : [out];
  for (const n of nodes) {
    if (n === null || n === undefined) continue;
    if (n instanceof Node) root.appendChild(n);
    else root.appendChild(document.createTextNode(String(n)));
  }
}

export function mount(
  root: HTMLElement,
  component: (props?: any) => any,
  props?: any,
) {
  const start = document.createComment("lumix-root-start");
  const end = document.createComment("lumix-root-end");

  while (root.firstChild) root.removeChild(root.firstChild);
  root.appendChild(start);
  root.appendChild(end);

  let currentNodes: Node[] = [];
  let currentComponent = component;
  let currentProps = props;

  const render = () => {
    for (const node of currentNodes) {
      unmount(node);
      if (node.parentNode) node.parentNode.removeChild(node);
    }
    currentNodes = [];

    const out = h(currentComponent, currentProps || {});
    const nodes = Array.isArray(out) ? out : [out];
    for (const n of nodes) {
      if (n === null || n === undefined) continue;
      const node = n instanceof Node ? n : document.createTextNode(String(n));
      root.insertBefore(node, end);
      currentNodes.push(node);
    }
  };

  render();

  return {
    update(nextComponent: (props?: any) => any) {
      currentComponent = nextComponent;
      render();
    },
    destroy() {
      for (const node of currentNodes) {
        unmount(node);
        if (node.parentNode) node.parentNode.removeChild(node);
      }
      currentNodes = [];
      if (start.parentNode) start.parentNode.removeChild(start);
      if (end.parentNode) end.parentNode.removeChild(end);
    },
  };
}

// ─── SSG / Islands (plan: meta-framework) ───────────────────

export interface IslandDescriptor {
  id: string;
  componentPath: string;
  props: any;
  selector: string;
}

export interface RenderToStringResult {
  html: string;
  islands: IslandDescriptor[];
  styles?: Array<{ id: string; content: string }>;
}

/**
 * Render a Lumix component to HTML (for SSG/SSR).
 * Requires a DOM implementation (e.g. happy-dom in Node).
 * Islands are marked for later hydration; full island detection is TODO.
 * Captures styles injected during rendering for SSG.
 */
export function renderToString(
  Comp: (props?: any) => any,
  props?: any,
): RenderToStringResult {
  if (typeof document === "undefined" || !document.createElement) {
    throw new Error(
      "[lumix] renderToString requires a DOM (e.g. use happy-dom in Node)",
    );
  }

  // Capture styles injected during rendering with their IDs
  const capturedStyles: Array<{ id: string; content: string }> = [];
  const detectedIslands: IslandDescriptor[] = [];
  let islandCounter = 0;
  
  const originalCreateElement = document.createElement.bind(document);
  const originalAppendChild = document.head.appendChild.bind(document.head);

  // Override createElement to capture style elements and detect islands
  document.createElement = function(tagName: string) {
    const element = originalCreateElement(tagName);
    
    if (tagName.toLowerCase() === 'style') {
      // Track the ID and content separately
      let styleId = '';
      let styleContent = '';
      
      // Override id property
      const originalIdDescriptor = Object.getOwnPropertyDescriptor(element, 'id') || 
                                   Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'id');
      
      Object.defineProperty(element, 'id', {
        get() { return styleId; },
        set(value: string) {
          styleId = value;
          if (originalIdDescriptor && originalIdDescriptor.set) {
            originalIdDescriptor.set.call(element, value);
          }
        },
        configurable: true
      });
      
      // Override textContent property
      const originalTextContentDescriptor = Object.getOwnPropertyDescriptor(element, 'textContent') || 
                                            Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'textContent');
      
      Object.defineProperty(element, 'textContent', {
        get() { return styleContent; },
        set(value: string) {
          styleContent = value;
          if (originalTextContentDescriptor && originalTextContentDescriptor.set) {
            originalTextContentDescriptor.set.call(element, value);
          }
          // Capture the style when both id and content are set
          if (value && styleId) {
            const existing = capturedStyles.find(s => s.id === styleId);
            if (!existing) {
              capturedStyles.push({ id: styleId, content: value });
            }
          }
        },
        configurable: true
      });
    }
    
    return element;
  } as any;

  // Override appendChild to capture when styles are added to head
  document.head.appendChild = function(node: Node) {
    if (node.nodeName === 'STYLE') {
      const styleElement = node as HTMLStyleElement;
      const content = styleElement.textContent;
      const id = styleElement.id;
      
      if (content && id) {
        const existing = capturedStyles.find(s => s.id === id);
        if (!existing) {
          capturedStyles.push({ id, content });
        }
      }
      // Don't actually append to head during SSR - we'll include in final HTML
      return node;
    }
    return originalAppendChild(node);
  } as any;

  // Track if we're rendering an interactive component (has signals/effects)
  let hasInteractivity = false;
  const originalEffect = (globalThis as any).effect;
  
  // Override effect to detect interactivity
  if (typeof originalEffect === 'function') {
    (globalThis as any).effect = function(...args: any[]) {
      hasInteractivity = true;
      return originalEffect.apply(this, args);
    };
  }

  try {
    const container = document.createElement("div");
    const out = h(Comp, props || {});
    const nodes = Array.isArray(out) ? out : [out];
    for (const n of nodes) {
      if (n === null || n === undefined) continue;
      if (n instanceof Node) container.appendChild(n);
      else container.appendChild(document.createTextNode(String(n)));
    }

    let html = container.innerHTML;

    // Remove any style tags from the rendered HTML since we'll include them in head
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // If the component has interactivity, mark it as an island
    if (hasInteractivity) {
      const islandId = `lumix-island-${islandCounter++}`;
      
      // Wrap the HTML content with island markers
      html = `<div data-lumix-island="${islandId}" data-lumix-component="${Comp.name || 'Component'}">${html}</div>`;
      
      detectedIslands.push({
        id: islandId,
        componentPath: '', // Will be filled by the build process
        props: props || {},
        selector: `[data-lumix-island="${islandId}"]`
      });
    }

    return {
      html,
      islands: detectedIslands,
      styles: capturedStyles,
    };
  } finally {
    // Restore original functions
    document.createElement = originalCreateElement;
    document.head.appendChild = originalAppendChild;
    
    // Restore original effect
    if (originalEffect) {
      (globalThis as any).effect = originalEffect;
    }
  }
}

/**
 * Hydrate a single island node (for use with window.__LUMIX_ISLANDS__).
 */
export async function hydrateIsland(
  el: HTMLElement,
  componentPath: string,
  props: any,
) {
  const mod = await import(/* @vite-ignore */ componentPath);
  const Comp = mod?.default;
  if (!Comp) return;
  hydrate(el, Comp, props);
}
