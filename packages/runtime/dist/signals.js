let activeEffect = null;
let batchDepth = 0;
const pendingEffects = new Set();
function runEffect(node) {
    // Cleanup previous run
    if (node.cleanup)
        node.cleanup();
    // Remove this effect from all its previous dependency sets
    for (const depSet of node.deps) {
        depSet.delete(node);
    }
    node.deps.clear();
    // Run with tracking
    const prev = activeEffect;
    activeEffect = node;
    try {
        node.cleanup = node.execute();
    }
    finally {
        activeEffect = prev;
    }
}
function notify(subscribers) {
    for (const node of [...subscribers]) {
        if (batchDepth > 0) {
            pendingEffects.add(node);
        }
        else {
            runEffect(node);
        }
    }
}
// ─── signal() ──────────────────────────────────────────────
export function signal(initialValue) {
    let value = initialValue;
    const subscribers = new Set();
    function readWrite(next) {
        if (arguments.length === 0) {
            // Track dependency
            if (activeEffect) {
                subscribers.add(activeEffect);
                activeEffect.deps.add(subscribers);
            }
            return value;
        }
        else {
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
        enumerable: true,
    });
    readWrite._subscribe = (fn) => {
        const node = {
            execute: () => fn(value),
            deps: new Set(),
            cleanup: undefined,
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
// ─── effect() ──────────────────────────────────────────────
export function effect(fn) {
    const node = {
        execute: fn,
        deps: new Set(),
        cleanup: undefined,
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
// ─── computed() ────────────────────────────────────────────
export function computed(fn) {
    const inner = signal(undefined);
    effect(() => {
        inner(fn());
    });
    // Return read-only wrapper
    function readOnly() {
        return inner();
    }
    Object.defineProperty(readOnly, "value", {
        get() {
            return inner();
        },
        enumerable: true,
    });
    readOnly._subscribe = inner._subscribe;
    readOnly._peek = inner._peek;
    return readOnly;
}
// ─── batch() ───────────────────────────────────────────────
export function batch(fn) {
    batchDepth++;
    try {
        return fn();
    }
    finally {
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
export function untrack(fn) {
    const prev = activeEffect;
    activeEffect = null;
    try {
        return fn();
    }
    finally {
        activeEffect = prev;
    }
}
