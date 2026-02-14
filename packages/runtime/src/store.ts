import { signal, effect, batch, Signal, Unsubscribe } from "./signals.js";

// ─── Types ─────────────────────────────────────────────────
export type StoreListener<T> = (state: T, key?: string) => void;

export interface Store<T extends Record<string, any>> {
  /** Read a key reactively */
  get<K extends keyof T>(key: K): T[K];
  /** Write a key and notify subscribers */
  set<K extends keyof T>(key: K, value: T[K]): void;
  /** Update multiple keys in a batch */
  update(partial: Partial<T>): void;
  /** Reset to initial state */
  reset(): void;
  /** Get an immutable snapshot */
  snapshot(): Readonly<T>;
  /** Subscribe to all changes */
  subscribe(fn: StoreListener<T>): Unsubscribe;
  /** Get underlying signal for a key */
  signal<K extends keyof T>(key: K): Signal<T[K]>;
  /** Reactive proxy — read/write with `store.state.key` */
  readonly state: T;
}

export interface PersistOptions {
  /** Storage key for persistence */
  key: string;
  /** Storage backend — defaults to localStorage */
  storage?: Storage;
  /** Custom serializer — defaults to JSON.stringify */
  serialize?: (value: any) => string;
  /** Custom deserializer — defaults to JSON.parse */
  deserialize?: (value: string) => any;
  /** Keys to include (whitelist). If omitted, all keys are persisted. */
  include?: string[];
  /** Keys to exclude (blacklist). */
  exclude?: string[];
}

// ─── store() ───────────────────────────────────────────────
export function store<T extends Record<string, any>>(
  initialState: T,
): Store<T> {
  const initial = structuredClone(initialState);
  const signals = new Map<string, Signal<any>>();
  const listeners = new Set<StoreListener<T>>();

  function getSignal<K extends keyof T>(key: K): Signal<T[K]> {
    const k = key as string;
    if (!signals.has(k)) {
      signals.set(k, signal(initial[key]));
    }
    return signals.get(k)! as Signal<T[K]>;
  }

  function get<K extends keyof T>(key: K): T[K] {
    return getSignal(key)();
  }

  function set<K extends keyof T>(key: K, value: T[K]): void {
    getSignal(key)(value);
    notifyListeners(key as string);
  }

  function update(partial: Partial<T>): void {
    batch(() => {
      for (const [key, value] of Object.entries(partial)) {
        getSignal(key as keyof T)(value as any);
      }
    });
    for (const key of Object.keys(partial)) {
      notifyListeners(key);
    }
  }

  function reset(): void {
    batch(() => {
      for (const [key, value] of Object.entries(initial)) {
        getSignal(key as keyof T)(structuredClone(value));
      }
    });
    notifyListeners();
  }

  function snapshot(): Readonly<T> {
    const snap = {} as any;
    // Include all keys from initial state
    for (const key of Object.keys(initial)) {
      const sig = signals.get(key);
      snap[key] = sig ? sig._peek() : initial[key];
    }
    return Object.freeze(snap);
  }

  function subscribe(fn: StoreListener<T>): Unsubscribe {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function notifyListeners(key?: string) {
    const state = snapshot();
    for (const fn of listeners) {
      fn(state, key);
    }
  }

  // Reactive proxy
  const stateProxy = new Proxy({} as T, {
    get(_target, prop: string) {
      return get(prop as keyof T);
    },
    set(_target, prop: string, value: any) {
      set(prop as keyof T, value);
      return true;
    },
    ownKeys() {
      return Object.keys(initial);
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      if (prop in initial) {
        return { configurable: true, enumerable: true, writable: true };
      }
      return undefined;
    },
    has(_target, prop: string) {
      return prop in initial;
    },
  });

  return {
    get,
    set,
    update,
    reset,
    snapshot,
    subscribe,
    signal: getSignal,
    state: stateProxy,
  };
}

// ─── persist() ─────────────────────────────────────────────
export function persist<T extends Record<string, any>>(
  st: Store<T>,
  options: PersistOptions,
): Unsubscribe {
  const {
    key,
    storage = typeof localStorage !== "undefined" ? localStorage : null,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    include,
    exclude,
  } = options;

  if (!storage) return () => {};

  // Hydrate from storage on init
  try {
    const stored = storage.getItem(key);
    if (stored) {
      const parsed = deserialize(stored);
      if (parsed && typeof parsed === "object") {
        st.update(parsed as Partial<T>);
      }
    }
  } catch {
    // Ignore hydration errors — use initial state
  }

  // Persist on every change
  const unsub = st.subscribe((state) => {
    try {
      let toSave: any = { ...state };

      if (include) {
        const filtered: any = {};
        for (const k of include) {
          if (k in toSave) filtered[k] = toSave[k];
        }
        toSave = filtered;
      }

      if (exclude) {
        for (const k of exclude) {
          delete toSave[k];
        }
      }

      storage.setItem(key, serialize(toSave));
    } catch {
      // Ignore storage write errors
    }
  });

  return unsub;
}

// ─── derived() ────────────────────────────────────────────
export function derived<T extends Record<string, any>, R>(
  st: Store<T>,
  fn: (state: Readonly<T>) => R,
): Signal<R> {
  const inner = signal<R>(fn(st.snapshot()));

  // Re-derive whenever any signal in the store changes
  const keys = Object.keys(st.snapshot());
  const unsubs: Unsubscribe[] = [];

  for (const key of keys) {
    const sig = st.signal(key as keyof T);
    unsubs.push(
      sig._subscribe(() => {
        inner(fn(st.snapshot()));
      }),
    );
  }

  return inner;
}
