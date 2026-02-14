// ─── Types ─────────────────────────────────────────────────
export type Subscriber<T> = (value: T) => void;
export type Unsubscribe = () => void;
export type CleanupFn = () => void;

export interface Signal<T> {
  (): T;
  (next: T): T;
  readonly value: T;
  _subscribe(fn: Subscriber<T>): Unsubscribe;
  _peek(): T;
}

export interface ReadonlySignal<T> {
  (): T;
  readonly value: T;
  _subscribe(fn: Subscriber<T>): Unsubscribe;
  _peek(): T;
}

// ─── Internals ─────────────────────────────────────────────
interface EffectNode {
  execute: () => void;
  deps: Set<Set<EffectNode>>;
  cleanup: CleanupFn | void;
}

let activeEffect: EffectNode | null = null;
let batchDepth = 0;
const pendingEffects = new Set<EffectNode>();

function runEffect(node: EffectNode) {
  // Cleanup previous run
  if (node.cleanup) node.cleanup();

  // Remove this effect from all its previous dependency sets
  for (const depSet of node.deps) {
    depSet.delete(node);
  }
  node.deps.clear();

  // Run with tracking
  const prev = activeEffect;
  activeEffect = node;
  try {
    node.cleanup = node.execute() as any;
  } finally {
    activeEffect = prev;
  }
}

function notify(subscribers: Set<EffectNode>) {
  for (const node of [...subscribers]) {
    if (batchDepth > 0) {
      pendingEffects.add(node);
    } else {
      runEffect(node);
    }
  }
}

// ─── signal() ──────────────────────────────────────────────
export function signal<T>(initialValue: T): Signal<T> {
  let value = initialValue;
  const subscribers = new Set<EffectNode>();

  function readWrite(next?: T): T {
    if (arguments.length === 0) {
      // Track dependency
      if (activeEffect) {
        subscribers.add(activeEffect);
        activeEffect.deps.add(subscribers);
      }
      return value;
    } else {
      const newVal = next as T;
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
    set(v: T) {
      readWrite(v);
    },
    enumerable: true,
  });

  (readWrite as any)._subscribe = (fn: Subscriber<T>): Unsubscribe => {
    const node: EffectNode = {
      execute: () => fn(value),
      deps: new Set(),
      cleanup: undefined,
    };
    subscribers.add(node);
    return () => {
      subscribers.delete(node);
      for (const depSet of node.deps) depSet.delete(node);
    };
  };

  (readWrite as any)._peek = (): T => value;

  return readWrite as Signal<T>;
}

// ─── effect() ──────────────────────────────────────────────
export function effect(fn: () => void | CleanupFn): Unsubscribe {
  const node: EffectNode = {
    execute: fn,
    deps: new Set(),
    cleanup: undefined,
  };

  runEffect(node);

  return () => {
    if (node.cleanup) node.cleanup();
    for (const depSet of node.deps) {
      depSet.delete(node);
    }
    node.deps.clear();
  };
}

// ─── computed() ────────────────────────────────────────────
export function computed<T>(fn: () => T): ReadonlySignal<T> {
  const inner = signal<T>(undefined as T);
  effect(() => {
    inner(fn());
  });

  // Return read-only wrapper
  function readOnly(): T {
    return inner();
  }

  Object.defineProperty(readOnly, "value", {
    get() {
      return inner();
    },
    enumerable: true,
  });

  (readOnly as any)._subscribe = inner._subscribe;
  (readOnly as any)._peek = inner._peek;

  return readOnly as ReadonlySignal<T>;
}

// ─── batch() ───────────────────────────────────────────────
export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      const effects = [...pendingEffects];
      pendingEffects.clear();
      for (const node of effects) {
        runEffect(node);
      }
    }
  }
}

// ─── untrack() ─────────────────────────────────────────────
export function untrack<T>(fn: () => T): T {
  const prev = activeEffect;
  activeEffect = null;
  try {
    return fn();
  } finally {
    activeEffect = prev;
  }
}
