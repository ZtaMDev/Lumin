import { signal, batch } from "./signals.js";
// ─── store() ───────────────────────────────────────────────
export function store(initialState) {
    const initial = structuredClone(initialState);
    const signals = new Map();
    const listeners = new Set();
    function getSignal(key) {
        const k = key;
        if (!signals.has(k)) {
            signals.set(k, signal(initial[key]));
        }
        return signals.get(k);
    }
    function get(key) {
        return getSignal(key)();
    }
    function set(key, value) {
        getSignal(key)(value);
        notifyListeners(key);
    }
    function update(partial) {
        batch(() => {
            for (const [key, value] of Object.entries(partial)) {
                getSignal(key)(value);
            }
        });
        for (const key of Object.keys(partial)) {
            notifyListeners(key);
        }
    }
    function reset() {
        batch(() => {
            for (const [key, value] of Object.entries(initial)) {
                getSignal(key)(structuredClone(value));
            }
        });
        notifyListeners();
    }
    function snapshot() {
        const snap = {};
        // Include all keys from initial state
        for (const key of Object.keys(initial)) {
            const sig = signals.get(key);
            snap[key] = sig ? sig._peek() : initial[key];
        }
        return Object.freeze(snap);
    }
    function subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    }
    function notifyListeners(key) {
        const state = snapshot();
        for (const fn of listeners) {
            fn(state, key);
        }
    }
    // Reactive proxy
    const stateProxy = new Proxy({}, {
        get(_target, prop) {
            return get(prop);
        },
        set(_target, prop, value) {
            set(prop, value);
            return true;
        },
        ownKeys() {
            return Object.keys(initial);
        },
        getOwnPropertyDescriptor(_target, prop) {
            if (prop in initial) {
                return { configurable: true, enumerable: true, writable: true };
            }
            return undefined;
        },
        has(_target, prop) {
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
export function persist(st, options) {
    const { key, storage = typeof localStorage !== "undefined" ? localStorage : null, serialize = JSON.stringify, deserialize = JSON.parse, include, exclude, } = options;
    if (!storage)
        return () => { };
    // Hydrate from storage on init
    try {
        const stored = storage.getItem(key);
        if (stored) {
            const parsed = deserialize(stored);
            if (parsed && typeof parsed === "object") {
                st.update(parsed);
            }
        }
    }
    catch {
        // Ignore hydration errors — use initial state
    }
    // Persist on every change
    const unsub = st.subscribe((state) => {
        try {
            let toSave = { ...state };
            if (include) {
                const filtered = {};
                for (const k of include) {
                    if (k in toSave)
                        filtered[k] = toSave[k];
                }
                toSave = filtered;
            }
            if (exclude) {
                for (const k of exclude) {
                    delete toSave[k];
                }
            }
            storage.setItem(key, serialize(toSave));
        }
        catch {
            // Ignore storage write errors
        }
    });
    return unsub;
}
// ─── derived() ────────────────────────────────────────────
export function derived(st, fn) {
    const inner = signal(fn(st.snapshot()));
    // Re-derive whenever any signal in the store changes
    const keys = Object.keys(st.snapshot());
    const unsubs = [];
    for (const key of keys) {
        const sig = st.signal(key);
        unsubs.push(sig._subscribe(() => {
            inner(fn(st.snapshot()));
        }));
    }
    return inner;
}
