export type ControlBranch = {
  cond?: () => any;
  body: () => any | any[];
};

/**
 * Reactive If/Else helper
 * @param condition Initial condition for the first branch
 * @param branches List of branches with optional conditions and bodies
 */
export function __if(condition: () => any, branches: ControlBranch[]) {
  return () => {
    if (condition()) return branches[0].body();
    for (let i = 1; i < branches.length; i++) {
      const b = branches[i];
      if (!b.cond || b.cond()) return b.body();
    }
    return [];
  };
}

/**
 * Reactive For loop helper
 * @param list Closure returning the array to iterate over
 * @param render Closure to render each item
 * @param keyFn Optional closure to extract a unique key from each item
 */
export function __for<T>(
  list: () => T[],
  render: (item: T, index: number) => any | any[],
  keyFn?: (item: T) => any,
) {
  const cache = new Map<any, any>();

  return () => {
    const items = list() || [];
    if (!keyFn) return items.map((item, index) => render(item, index));

    const newNodes = items.map((item, index) => {
      const key = keyFn(item);
      if (cache.has(key)) return cache.get(key);
      const rendered = render(item, index);
      cache.set(key, rendered);
      return rendered;
    });

    // Cleanup cache for items no longer present
    const itemKeys = new Set(items.map(keyFn));
    for (const key of cache.keys()) {
      if (!itemKeys.has(key)) {
        cache.delete(key);
      }
    }

    return newNodes;
  };
}
