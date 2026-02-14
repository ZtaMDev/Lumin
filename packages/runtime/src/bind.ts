import { Signal, effect } from "./signals";

// ─── Core bind helper ──────────────────────────────────────
function setupBind(
  el: HTMLElement,
  sig: Signal<any>,
  domProp: string,
  event: string,
  transform?: (v: any) => any,
) {
  // Signal → DOM
  effect(() => {
    const v = sig();
    (el as any)[domProp] = v;
  });

  // DOM → Signal
  el.addEventListener(event, () => {
    const raw = (el as any)[domProp];
    sig(transform ? transform(raw) : raw);
  });
}

// ─── bindValue ─────────────────────────────────────────────
/** Two-way binding for text inputs, textareas, and selects */
export function bindValue(el: HTMLElement, sig: Signal<string>) {
  const tag = el.tagName.toLowerCase();
  const event = tag === "select" ? "change" : "input";
  setupBind(el, sig, "value", event);
}

// ─── bindChecked ───────────────────────────────────────────
/** Two-way binding for checkboxes */
export function bindChecked(el: HTMLElement, sig: Signal<boolean>) {
  setupBind(el, sig, "checked", "change");
}

// ─── bindNumeric ───────────────────────────────────────────
/** Two-way binding for number/range inputs */
export function bindNumeric(el: HTMLElement, sig: Signal<number>) {
  // Signal → DOM
  effect(() => {
    (el as any).value = String(sig());
  });

  // DOM → Signal (using valueAsNumber)
  el.addEventListener("input", () => {
    const n = (el as any).valueAsNumber;
    if (!Number.isNaN(n)) sig(n);
  });
}

// ─── bindGroup ─────────────────────────────────────────────
/** Two-way binding for radio button groups */
export function bindGroup(el: HTMLElement, sig: Signal<string>) {
  // Signal → DOM
  effect(() => {
    (el as any).checked = (el as any).value === sig();
  });

  // DOM → Signal
  el.addEventListener("change", () => {
    if ((el as any).checked) {
      sig((el as any).value);
    }
  });
}

// ─── bindSelected ──────────────────────────────────────────
/** Two-way binding for `<select multiple>` */
export function bindSelected(el: HTMLElement, sig: Signal<string[]>) {
  const select = el as HTMLSelectElement;

  // Signal → DOM
  effect(() => {
    const selected = sig();
    for (const opt of Array.from(select.options)) {
      opt.selected = selected.includes(opt.value);
    }
  });

  // DOM → Signal
  select.addEventListener("change", () => {
    const values: string[] = [];
    for (const opt of Array.from(select.selectedOptions)) {
      values.push(opt.value);
    }
    sig(values);
  });
}

// ─── Auto-detect bind ──────────────────────────────────────
/** Automatically detect input type and apply the right bind */
export function bind(el: HTMLElement, property: string, sig: Signal<any>) {
  const tag = el.tagName.toLowerCase();
  const type = (el as HTMLInputElement).type?.toLowerCase() || "";

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
      // Generic: treat as a property bind
      setupBind(el, sig, property, "input");
      break;
  }
}
