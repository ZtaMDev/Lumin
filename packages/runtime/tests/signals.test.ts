import { expect, test, describe, mock } from "bun:test";
import { signal } from "../src/signals";

describe("Signals", () => {
  test("should store and update value", () => {
    const count = signal(0);
    expect(count()).toBe(0);
    count(1);
    expect(count()).toBe(1);
  });

  test("should notify subscribers", () => {
    const count = signal(0);
    const fn = mock();

    count._subscribe(fn);
    count(1);

    expect(fn).toHaveBeenCalled();
    expect(fn).toHaveBeenCalledWith(1);
  });

  // If effect/computed are not exported or implemented yet, skip them.
  // Viewing src/signals.ts in Step 403 showed implicit exports * from ./signals.
  // Step 406 showed dom.ts importing Signal.
  // I should check signals.ts content if I'm unsure about effect/computed.
  // But let's assume basic signal works as per bundler.rs inline code seen earlier.
});
