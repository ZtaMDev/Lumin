let activeEffect = null;
function runEffect(node) {
  if (node.cleanup)
    node.cleanup();
  for (const depSet of node.deps) {
    depSet.delete(node);
  }
  node.deps.clear();
  const prev = activeEffect;
  activeEffect = node;
  try {
    node.cleanup = node.execute();
  } finally {
    activeEffect = prev;
  }
}
function notify(subscribers) {
  for (const node of [...subscribers]) {
    {
      runEffect(node);
    }
  }
}
function signal(initialValue) {
  let value = initialValue;
  const subscribers = /* @__PURE__ */ new Set();
  function readWrite(next) {
    if (arguments.length === 0) {
      if (activeEffect) {
        subscribers.add(activeEffect);
        activeEffect.deps.add(subscribers);
      }
      return value;
    } else {
      const newVal = next;
      if (!Object.is(value, newVal)) {
        value = newVal;
        notify(subscribers);
      }
      return value;
    }
  }
  Object.defineProperty(readWrite, "value", {
    get() {
      return readWrite();
    },
    set(v) {
      readWrite(v);
    },
    enumerable: true
  });
  readWrite._subscribe = (fn) => {
    const node = {
      execute: () => fn(value),
      deps: /* @__PURE__ */ new Set(),
      cleanup: void 0
    };
    subscribers.add(node);
    return () => {
      subscribers.delete(node);
      for (const depSet of node.deps)
        depSet.delete(node);
    };
  };
  readWrite._peek = () => value;
  return readWrite;
}
function effect(fn) {
  const node = {
    execute: fn,
    deps: /* @__PURE__ */ new Set(),
    cleanup: void 0
  };
  runEffect(node);
  return () => {
    if (node.cleanup)
      node.cleanup();
    for (const depSet of node.deps) {
      depSet.delete(node);
    }
    node.deps.clear();
  };
}
function setupBind(el, sig, domProp, event, transform) {
  effect(() => {
    const v = sig();
    el[domProp] = v;
  });
  el.addEventListener(event, () => {
    const raw = el[domProp];
    sig(raw);
  });
}
function bindValue(el, sig) {
  const tag = el.tagName.toLowerCase();
  const event = tag === "select" ? "change" : "input";
  setupBind(el, sig, "value", event);
}
function bindChecked(el, sig) {
  setupBind(el, sig, "checked", "change");
}
function bindNumeric(el, sig) {
  effect(() => {
    el.value = String(sig());
  });
  el.addEventListener("input", () => {
    const n = el.valueAsNumber;
    if (!Number.isNaN(n))
      sig(n);
  });
}
function bindGroup(el, sig) {
  effect(() => {
    el.checked = el.value === sig();
  });
  el.addEventListener("change", () => {
    if (el.checked) {
      sig(el.value);
    }
  });
}
function bindSelected(el, sig) {
  const select = el;
  effect(() => {
    const selected = sig();
    for (const opt of Array.from(select.options)) {
      opt.selected = selected.includes(opt.value);
    }
  });
  select.addEventListener("change", () => {
    const values = [];
    for (const opt of Array.from(select.selectedOptions)) {
      values.push(opt.value);
    }
    sig(values);
  });
}
function bind(el, property, sig) {
  const tag = el.tagName.toLowerCase();
  const type = el.type?.toLowerCase() || "";
  switch (property) {
    case "value":
      if (tag === "input" && (type === "number" || type === "range")) {
        bindNumeric(el, sig);
      } else {
        bindValue(el, sig);
      }
      break;
    case "checked":
      bindChecked(el, sig);
      break;
    case "group":
      bindGroup(el, sig);
      break;
    case "selected":
      bindSelected(el, sig);
      break;
    default:
      setupBind(el, sig, property, "input");
      break;
  }
}
function withHooks(fn) {
  const hooks = { mount: [], destroy: [] };
  try {
    const result = fn();
    return { result, ...hooks };
  } finally {
  }
}
function runHooks(hooks) {
  for (const hook of hooks) {
    try {
      hook();
    } catch (e) {
      console.error("Error in hook:", e);
    }
  }
}
function h(tag, props, ...children) {
  if (typeof tag === "function") {
    const { result, mount, destroy } = withHooks(() => tag(props || {}, ...children));
    const roots = Array.isArray(result) ? result : [result];
    for (const r of roots) {
      if (r instanceof HTMLElement) {
        if (mount.length > 0) {
          setTimeout(() => runHooks(mount), 0);
        }
        if (destroy.length > 0) {
          r._luminDestroy = destroy;
        }
      }
    }
    return result;
  }
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith("bind:")) {
        const property = key.slice(5);
        if (typeof value === "function" && "_peek" in value) {
          bind(el, property, value);
        }
        continue;
      }
      if (key.startsWith("on") && typeof value === "function") {
        const eventName = key.slice(2).toLowerCase();
        el.addEventListener(eventName, value);
      } else if (typeof value === "function") {
        effect(() => {
          const v = value();
          if (key === "value" || key === "checked" || key === "disabled" || key === "selected") {
            el[key] = v;
          } else if (typeof v === "boolean") {
            if (v)
              el.setAttribute(key, "");
            else
              el.removeAttribute(key);
          } else {
            el.setAttribute(key, String(v));
          }
        });
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === void 0)
      continue;
    if (typeof child === "function") {
      const startMarker = document.createComment("cf-start");
      const endMarker = document.createComment("cf-end");
      el.appendChild(startMarker);
      el.appendChild(endMarker);
      let prevNodes = [];
      effect(() => {
        let v = child();
        let newNodes = [];
        const items = Array.isArray(v) ? v.flat(Infinity) : [v];
        for (let item of items) {
          if (item === null || item === void 0)
            continue;
          while (typeof item === "function") {
            item = item();
          }
          if (item instanceof Node) {
            newNodes.push(item);
          } else {
            newNodes.push(document.createTextNode(String(item)));
          }
        }
        const newNodeSet = new Set(newNodes);
        for (const node of prevNodes) {
          if (!newNodeSet.has(node)) {
            unmount(node);
            if (node.parentNode === el) {
              el.removeChild(node);
            }
          }
        }
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
function Fragment(_props, ...children) {
  return children.flat(Infinity);
}
function unmount(node) {
  if (node instanceof HTMLElement) {
    const hooks = node._luminDestroy;
    if (hooks)
      runHooks(hooks);
  }
  node.childNodes.forEach(unmount);
}
function hydrate(root2, component, props) {
  while (root2.firstChild)
    root2.removeChild(root2.firstChild);
  const out = h(component, {});
  const nodes = Array.isArray(out) ? out : [out];
  for (const n of nodes) {
    if (n === null || n === void 0)
      continue;
    if (n instanceof Node)
      root2.appendChild(n);
    else
      root2.appendChild(document.createTextNode(String(n)));
  }
}
function about(props = {}) {
  "use server";
  const serverTime = (/* @__PURE__ */ new Date()).toISOString();
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "Server-Side";
  const count = signal(0);
  if (typeof document !== "undefined") {
    const styleId = "lumix-style-about";
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style");
      s.id = styleId;
      s.textContent = `
  .page { 
    padding: 2rem; 
    font-family: system-ui, sans-serif; 
    max-width: 640px;
    margin: 0 auto;
  }
  
  h1 { 
    color: #059669; 
  }
  
  .nav {
    margin-top: 2rem;
    padding: 1rem;
    background: #f0fdf4;
    border-radius: 8px;
  }
  
  .nav a {
    color: #059669;
    text-decoration: none;
    font-weight: 500;
  }
  
  .nav a:hover {
    text-decoration: underline;
  }
  
  button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: #059669;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }
  
  strong {
    color: #059669;
  }
  
  span {
    font-weight: bold;
    color: #059669;
  }
  
  code {
    background: #f0fdf4;
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    color: #059669;
  }
`;
      document.head.appendChild(s);
    }
  }
  return h(Fragment, null, h("div", {
    "class": "page"
  }, [
    `
  `,
    h("h1", null, [
      `About (Server-Side Rendering)`
    ]),
    `
  `,
    h("p", null, [
      `Esta página usa `,
      h("code", null, [
        `"use server"`
      ]),
      ` para SSR dinámico.`
    ]),
    `
  `,
    h("p", null, [
      h("strong", null, [
        `Comportamiento SSR:`
      ]),
      ` El timestamp cambia en cada recarga porque se renderiza en el servidor en cada request.`
    ]),
    `
  `,
    h("p", null, [
      `Server timestamp: `,
      h("strong", null, [
        () => serverTime
      ])
    ]),
    `
  `,
    h("p", null, [
      `User agent: `,
      h("strong", null, [
        () => userAgent
      ])
    ]),
    `
  `,
    h("p", null, [
      `Interactive counter (hidratado en cliente): `,
      h("span", null, [
        () => count()
      ])
    ]),
    `
  `,
    h("button", {
      "onclick": () => count(count() + 1)
    }, [
      `Increment`
    ]),
    `
  
  `,
    h("nav", {
      "class": "nav"
    }, [
      `
    `,
      h("a", {
        "href": "/"
      }, [
        `← Volver a Home (Static)`
      ]),
      `
  `
    ]),
    `
`
  ]), `

`);
}
const root = document.getElementById("app");
if (root) {
  hydrate(root, about);
}
export {
  about as default
};
