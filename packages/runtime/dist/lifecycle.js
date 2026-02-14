let currentHooks = null;
export function onMount(fn) {
    if (currentHooks) {
        currentHooks.mount.push(fn);
    }
    else {
        console.warn("onMount must be called during component initialization.");
    }
}
export function onDestroy(fn) {
    if (currentHooks) {
        currentHooks.destroy.push(fn);
    }
    else {
        console.warn("onDestroy must be called during component initialization.");
    }
}
/**
 * Internal helper to catch hooks during component execution
 */
export function withHooks(fn) {
    const previous = currentHooks;
    const hooks = { mount: [], destroy: [] };
    currentHooks = hooks;
    try {
        const result = fn();
        return { result, ...hooks };
    }
    finally {
        currentHooks = previous;
    }
}
/**
 * Internal helper to run a set of hooks
 */
export function runHooks(hooks) {
    for (const hook of hooks) {
        try {
            hook();
        }
        catch (e) {
            console.error("Error in hook:", e);
        }
    }
}
