export function h(tag, props, ...children) {
    if (typeof tag === "function") {
        return tag(props || {}, ...children);
    }
    const el = document.createElement(tag);
    if (props) {
        for (const [key, value] of Object.entries(props)) {
            if (key.startsWith("on") && typeof value === "function") {
                const eventName = key.slice(2).toLowerCase();
                el.addEventListener(eventName, value);
            }
            else if (typeof value?._subscribe === "function") {
                // Reactive attribute
                const sig = value;
                const update = (v) => {
                    if (typeof v === "boolean") {
                        if (v)
                            el.setAttribute(key, "");
                        else
                            el.removeAttribute(key);
                    }
                    else {
                        el.setAttribute(key, String(v));
                    }
                };
                update(sig());
                sig._subscribe(update);
            }
            else {
                el.setAttribute(key, String(value));
            }
        }
    }
    for (const child of children.flat()) {
        if (child === null || child === undefined)
            continue;
        if (typeof child?._subscribe === "function") {
            // Reactive text node
            const sig = child;
            const textNode = document.createTextNode(String(sig()));
            sig._subscribe((v) => {
                textNode.textContent = String(v);
            });
            el.appendChild(textNode);
        }
        else if (child instanceof HTMLElement || child instanceof Node) {
            el.appendChild(child);
        }
        else {
            el.appendChild(document.createTextNode(String(child)));
        }
    }
    return el;
}
export function hydrate(root, component, props) {
    while (root.firstChild)
        root.removeChild(root.firstChild);
    root.appendChild(component(props));
}
