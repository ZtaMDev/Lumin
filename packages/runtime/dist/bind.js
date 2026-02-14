import { effect } from "./signals";
// ─── Core bind helper ──────────────────────────────────────
function setupBind(el, sig, domProp, event, transform) {
    // Signal → DOM
    effect(() => {
        const v = sig();
        el[domProp] = v;
    });
    // DOM → Signal
    el.addEventListener(event, () => {
        const raw = el[domProp];
        sig(transform ? transform(raw) : raw);
    });
}
// ─── bindValue ─────────────────────────────────────────────
/** Two-way binding for text inputs, textareas, and selects */
export function bindValue(el, sig) {
    const tag = el.tagName.toLowerCase();
    const event = tag === "select" ? "change" : "input";
    setupBind(el, sig, "value", event);
}
// ─── bindChecked ───────────────────────────────────────────
/** Two-way binding for checkboxes */
export function bindChecked(el, sig) {
    setupBind(el, sig, "checked", "change");
}
// ─── bindNumeric ───────────────────────────────────────────
/** Two-way binding for number/range inputs */
export function bindNumeric(el, sig) {
    // Signal → DOM
    effect(() => {
        el.value = String(sig());
    });
    // DOM → Signal (using valueAsNumber)
    el.addEventListener("input", () => {
        const n = el.valueAsNumber;
        if (!Number.isNaN(n))
            sig(n);
    });
}
// ─── bindGroup ─────────────────────────────────────────────
/** Two-way binding for radio button groups */
export function bindGroup(el, sig) {
    // Signal → DOM
    effect(() => {
        el.checked = el.value === sig();
    });
    // DOM → Signal
    el.addEventListener("change", () => {
        if (el.checked) {
            sig(el.value);
        }
    });
}
// ─── bindSelected ──────────────────────────────────────────
/** Two-way binding for `<select multiple>` */
export function bindSelected(el, sig) {
    const select = el;
    // Signal → DOM
    effect(() => {
        const selected = sig();
        for (const opt of Array.from(select.options)) {
            opt.selected = selected.includes(opt.value);
        }
    });
    // DOM → Signal
    select.addEventListener("change", () => {
        const values = [];
        for (const opt of Array.from(select.selectedOptions)) {
            values.push(opt.value);
        }
        sig(values);
    });
}
// ─── Auto-detect bind ──────────────────────────────────────
/** Automatically detect input type and apply the right bind */
export function bind(el, property, sig) {
    const tag = el.tagName.toLowerCase();
    const type = el.type?.toLowerCase() || "";
    switch (property) {
        case "value":
            if (tag === "input" && (type === "number" || type === "range")) {
                bindNumeric(el, sig);
            }
            else {
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
            // Generic: treat as a property bind
            setupBind(el, sig, property, "input");
            break;
    }
}
