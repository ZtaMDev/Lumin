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
            const textValue = item === null || item === void 0 ? "" : String(item);
            newNodes.push(document.createTextNode(textValue));
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
      const textValue = child === null || child === void 0 ? "" : String(child);
      el.appendChild(document.createTextNode(textValue));
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
function MainLayout(props = {}) {
  if (typeof document !== "undefined") {
    const styleId = "lumix-style-mainlayout";
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style");
      s.id = styleId;
      s.textContent = `
  * {
    box-sizing: border-box;
    font-family: system-ui
  }
  
  body {
    margin: 0;
    background: #0a0a0f;
    color: #e4e4e7;
  }
  
  .layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  .header {
    background: rgba(15, 15, 20, 0.8);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding: 1rem 0;
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
  }
  
  .header .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
  }
  
  .logo svg {
    color: #8b5cf6;
  }
  
  .logo img {
    display: block;
  }
  
  .nav {
    display: flex;
    gap: 0.5rem;
  }
  
  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #a1a1aa;
    text-decoration: none;
    font-weight: 500;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    transition: all 0.2s;
  }
  
  .nav-link:hover {
    color: #fff;
    background: rgba(139, 92, 246, 0.1);
  }
  
  .nav-link svg {
    width: 18px;
    height: 18px;
  }
  
  .nav-link img {
    display: block;
    filter: brightness(0) saturate(100%) invert(67%) sepia(6%) saturate(289%) hue-rotate(202deg) brightness(93%) contrast(87%);
  }
  
  .nav-link:hover img {
    filter: brightness(0) saturate(100%) invert(100%);
  }
  
  .main {
    flex: 1;
    padding: 3rem 0;
  }
  
  .footer {
    background: rgba(15, 15, 20, 0.6);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding: 2rem 0;
    text-align: center;
    color: #71717a;
    font-size: 0.875rem;
  }
  
  .footer p {
    margin: 0;
  }
`;
      document.head.appendChild(s);
    }
  }
  return h(Fragment, null, h("div", {
    "class": "layout"
  }, [
    `
  `,
    h("header", {
      "class": "header"
    }, [
      `
    `,
      h("div", {
        "class": "container"
      }, [
        `
      `,
        h("div", {
          "class": "logo"
        }, [
          `
        `,
          h("img", {
            "src": "/icons/logo.svg",
            "alt": "Lumix",
            "width": "32",
            "height": "32"
          }),
          `
        `,
          h("span", null, [
            `Lumix`
          ]),
          `
      `
        ]),
        `
      `,
        h("nav", {
          "class": "nav"
        }, [
          `
        `,
          h("a", {
            "href": "/",
            "class": "nav-link"
          }, [
            `
          `,
            h("img", {
              "src": "/icons/home.svg",
              "alt": "",
              "width": "20",
              "height": "20"
            }),
            `
          `,
            h("span", null, [
              `Home`
            ]),
            `
        `
          ]),
          `
        `,
          h("a", {
            "href": "/about",
            "class": "nav-link"
          }, [
            `
          `,
            h("img", {
              "src": "/icons/info.svg",
              "alt": "",
              "width": "20",
              "height": "20"
            }),
            `
          `,
            h("span", null, [
              `About`
            ]),
            `
        `
          ]),
          `
      `
        ]),
        `
    `
      ]),
      `
  `
    ]),
    `
  
  `,
    h("main", {
      "class": "main"
    }, [
      `
    `,
      h("div", {
        "class": "container"
      }, [
        `
      `,
        props.children ? props.children() : [],
        `
    `
      ]),
      `
  `
    ]),
    `
  
  `,
    h("footer", {
      "class": "footer"
    }, [
      `
    `,
      h("div", {
        "class": "container"
      }, [
        `
      `,
        props.slots?.footer ? props.slots.footer() : [
          h("p", null, [
            `Built with Lumix • A modern web framework`
          ])
        ],
        `
    `
      ]),
      `
  `
    ]),
    `
`
  ]), `

`);
}
function Counter(props = {}) {
  let { initialCount = 0, label = "Count" } = props;
  const count = signal(initialCount);
  function increment() {
    count(count() + 1);
  }
  function decrement() {
    count(count() - 1);
  }
  function reset() {
    count(initialCount);
  }
  if (typeof document !== "undefined") {
    const styleId = "lumix-style-counter";
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style");
      s.id = styleId;
      s.textContent = `
  .counter {
    background: rgba(24, 24, 27, 0.6);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 16px;
    padding: 2.5rem;
    text-align: center;
    backdrop-filter: blur(12px);
  }
  
  .counter h3 {
    margin: 0 0 1.5rem 0;
    color: #e4e4e7;
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: 0.025em;
  }
  
  .display {
    font-size: 4rem;
    font-weight: 700;
    background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 1.5rem 0;
    font-variant-numeric: tabular-nums;
  }
  
  .buttons {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 2rem;
  }
  
  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 10px;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  
  .btn-primary {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }
  
  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4);
  }
  
  .btn-secondary {
    background: rgba(63, 63, 70, 0.6);
    color: #e4e4e7;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .btn-secondary:hover {
    background: rgba(82, 82, 91, 0.6);
  }
  
  .btn:active {
    transform: translateY(0);
  }
`;
      document.head.appendChild(s);
    }
  }
  return h(Fragment, null, h("div", {
    "class": "counter"
  }, [
    `
  `,
    h("h3", null, [
      () => label
    ]),
    `
  `,
    h("div", {
      "class": "display"
    }, [
      () => count()
    ]),
    `
  `,
    h("div", {
      "class": "buttons"
    }, [
      `
    `,
      h("button", {
        "onclick": decrement,
        "class": "btn btn-secondary"
      }, [
        `-`
      ]),
      `
    `,
      h("button", {
        "onclick": reset,
        "class": "btn btn-secondary"
      }, [
        `Reset`
      ]),
      `
    `,
      h("button", {
        "onclick": increment,
        "class": "btn btn-primary"
      }, [
        `+`
      ]),
      `
  `
    ]),
    `
`
  ]), `

`);
}
function about(props = {}) {
  "use server";
  const serverTime = (/* @__PURE__ */ new Date()).toISOString();
  signal(0);
  if (typeof document !== "undefined") {
    const styleId = "lumix-style-about";
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style");
      s.id = styleId;
      s.textContent = `
  .page {
    font-family: system-ui, -apple-system, sans-serif;
  }
  
  .hero {
    text-align: center;
    margin-bottom: 4rem;
  }
  
  .hero-logo {
    display: block;
    margin: 0 auto 2rem;
    opacity: 0.9;
  }
  
  h1 {
    font-size: 3.5rem;
    margin: 0 0 1rem 0;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  
  .subtitle {
    font-size: 1.25rem;
    color: #a1a1aa;
    margin: 0;
    font-weight: 400;
  }
  
  .info-card {
    background: rgba(24, 24, 27, 0.6);
    border: 1px solid rgba(16, 185, 129, 0.2);
    border-radius: 16px;
    padding: 2rem;
    margin: 3rem 0;
    backdrop-filter: blur(12px);
  }
  
  .card-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1.5rem;
  }
  
  .card-icon svg {
    color: white;
  }
  
  .card-icon img {
    display: block;
    filter: brightness(0) saturate(100%) invert(100%);
  }
  
  .info-card h2 {
    margin: 0 0 1rem 0;
    color: #e4e4e7;
    font-size: 1.5rem;
    font-weight: 700;
  }
  
  .info-card p {
    color: #a1a1aa;
    line-height: 1.6;
    margin: 0 0 1.5rem 0;
  }
  
  .info-card ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .info-card li {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: #d4d4d8;
  }
  
  .info-card li svg {
    color: #10b981;
    flex-shrink: 0;
  }
  
  .info-card li img {
    flex-shrink: 0;
    filter: brightness(0) saturate(100%) invert(64%) sepia(98%) saturate(1000%) hue-rotate(115deg) brightness(96%) contrast(89%);
  }
  
  .server-info {
    background: rgba(24, 24, 27, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 2rem;
    margin: 3rem 0;
  }
  
  .server-info h3 {
    margin: 0 0 1.5rem 0;
    color: #e4e4e7;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .info-grid {
    display: grid;
    gap: 1rem;
  }
  
  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: rgba(39, 39, 42, 0.6);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .info-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: #a1a1aa;
  }
  
  .info-label svg {
    color: #10b981;
  }
  
  .info-label img {
    filter: brightness(0) saturate(100%) invert(64%) sepia(98%) saturate(1000%) hue-rotate(115deg) brightness(96%) contrast(89%);
  }
  
  .info-value {
    font-family: 'Courier New', monospace;
    color: #10b981;
    font-weight: 500;
    font-size: 0.875rem;
  }
  
  .hint {
    margin: 1.5rem 0 0 0;
    padding: 1rem;
    background: rgba(234, 179, 8, 0.1);
    border-radius: 12px;
    border: 1px solid rgba(234, 179, 8, 0.2);
    color: #fbbf24;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .hint svg {
    flex-shrink: 0;
  }
  
  .hint img {
    flex-shrink: 0;
    filter: brightness(0) saturate(100%) invert(79%) sepia(61%) saturate(1000%) hue-rotate(359deg) brightness(102%) contrast(97%);
  }
  
  .demo-section {
    margin: 4rem 0;
  }
  
  .demo-section h2 {
    text-align: center;
    margin-bottom: 1rem;
    color: #e4e4e7;
    font-size: 2rem;
    font-weight: 700;
  }
  
  .demo-description {
    text-align: center;
    margin-bottom: 2rem;
    color: #a1a1aa;
  }
`;
      document.head.appendChild(s);
    }
  }
  return h(Fragment, null, h(MainLayout, {
    "children": () => [
      `
  `,
      h("div", {
        "class": "page"
      }, [
        `
    `,
        h("div", {
          "class": "hero"
        }, [
          `
      `,
          h("img", {
            "src": "/icons/logo.svg",
            "alt": "Lumix",
            "class": "hero-logo",
            "width": "80",
            "height": "80"
          }),
          `
      `,
          h("h1", null, [
            `About`
          ]),
          `
      `,
          h("p", {
            "class": "subtitle"
          }, [
            `Server-Side Rendering in action`
          ]),
          `
    `
        ]),
        `
    
    `,
        h("div", {
          "class": "info-card ssr"
        }, [
          `
      `,
          h("div", {
            "class": "card-icon"
          }, [
            `
        `,
            h("img", {
              "src": "/icons/monitor.svg",
              "alt": "",
              "width": "24",
              "height": "24"
            }),
            `
      `
          ]),
          `
      `,
          h("h2", null, [
            `Server-Side Rendering (SSR)`
          ]),
          `
      `,
          h("p", null, [
            `This page is rendered on the server for every request, then hydrated on the client for interactivity.`
          ]),
          `
      `,
          h("ul", null, [
            `
        `,
            h("li", null, [
              `
          `,
              h("img", {
                "src": "/icons/check.svg",
                "alt": "",
                "width": "16",
                "height": "16"
              }),
              `
          Dynamic server-side data
        `
            ]),
            `
        `,
            h("li", null, [
              `
          `,
              h("img", {
                "src": "/icons/check.svg",
                "alt": "",
                "width": "16",
                "height": "16"
              }),
              `
          Fresh content on every request
        `
            ]),
            `
        `,
            h("li", null, [
              `
          `,
              h("img", {
                "src": "/icons/check.svg",
                "alt": "",
                "width": "16",
                "height": "16"
              }),
              `
          Client-side hydration
        `
            ]),
            `
      `
          ]),
          `
    `
        ]),
        `
    
    `,
        h("div", {
          "class": "server-info"
        }, [
          `
      `,
          h("h3", null, [
            `Server Information`
          ]),
          `
      `,
          h("div", {
            "class": "info-grid"
          }, [
            `
        `,
            h("div", {
              "class": "info-item"
            }, [
              `
          `,
              h("div", {
                "class": "info-label"
              }, [
                `
            `,
                h("img", {
                  "src": "/icons/clock.svg",
                  "alt": "",
                  "width": "16",
                  "height": "16"
                }),
                `
            `,
                h("span", null, [
                  `Server Time`
                ]),
                `
          `
              ]),
              `
          `,
              h("span", {
                "class": "info-value"
              }, [
                () => serverTime
              ]),
              `
        `
            ]),
            `
        `,
            h("div", {
              "class": "info-item"
            }, [
              `
          `,
              h("div", {
                "class": "info-label"
              }, [
                `
            `,
                h("img", {
                  "src": "/icons/box.svg",
                  "alt": "",
                  "width": "16",
                  "height": "16"
                }),
                `
            `,
                h("span", null, [
                  `Rendering Mode`
                ]),
                `
          `
              ]),
              `
          `,
              h("span", {
                "class": "info-value"
              }, [
                `SSR (Dynamic)`
              ]),
              `
        `
            ]),
            `
      `
          ]),
          `
      `,
          h("div", {
            "class": "hint"
          }, [
            `
        `,
            h("img", {
              "src": "/icons/help-circle.svg",
              "alt": "",
              "width": "16",
              "height": "16"
            }),
            `
        `,
            h("span", null, [
              `Reload this page to see the timestamp update`
            ]),
            `
      `
          ]),
          `
    `
        ]),
        `
    
    `,
        h("div", {
          "class": "demo-section"
        }, [
          `
      `,
          h("h2", null, [
            `Client-Side Interactivity`
          ]),
          `
      `,
          h("p", {
            "class": "demo-description"
          }, [
            `Even though this page is server-rendered, it's fully interactive on the client:`
          ]),
          `
      `,
          h(Counter, {
            "initialCount": 10,
            "label": "SSR Counter"
          }),
          `
    `
        ]),
        `
  `
      ]),
      `
`
    ]
  }), `

`);
}
const root = document.getElementById("app");
if (root) {
  hydrate(root, about);
}
export {
  about as default
};
