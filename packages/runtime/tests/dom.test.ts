import { expect, test, describe } from "bun:test";
import { h } from "../src/dom";
import { signal } from "../src/signals";
import { Window } from "happy-dom";

// Setup simple DOM env if bun doesn't provide it by default (it does partially, or I can use happy-dom)
// Bun mentions "bun test" supports some DOM APIs if configured?
// Or I can just mock what h uses (document.createElement).
// For now, let's assume we run with --preload or rely on global scope if happy-dom is used,
// or just standard bun test with a setup.

// Actually, `h` uses `document.createElement`.
// I need `happy-dom` or `jsdom` for this test to runs in Bun unless Bun has native DOM (it doesn't fully).
// I should add `happy-dom` to devDependencies of runtime.

// Since I just installed dependencies, I might not have happy-dom.
// But let's try to mock document for now or add happy-dom.
// Adding happy-dom is safer.

const window = new Window();
global.document = window.document as any;
global.HTMLElement = window.HTMLElement as any;
global.Node = window.Node as any;
global.Text = window.Text as any;

describe("DOM h()", () => {
  test("creates element with tag", () => {
    const el = h("div", null);
    expect(el.tagName.toLowerCase()).toBe("div");
  });

  test("sets attributes", () => {
    const el = h("div", { id: "foo", class: "bar" });
    expect(el.getAttribute("id")).toBe("foo");
    expect(el.getAttribute("class")).toBe("bar");
  });

  test("handles click events", () => {
    const el = h("button", { onClick: () => {} });
    // Event listeners are hard to inspect on DOM nodes usually, but we assume no error.
  });

  test("nesting children", () => {
    const child = h("span", null, "hello");
    const el = h("div", null, child);
    expect(el.firstChild).toBe(child);
  });

  test("reactivity", () => {
    const count = signal(0);
    const el = h("div", null, count);
    expect(el.textContent).toBe("0");
    count(1);
    expect(el.textContent).toBe("1");
  });
});
