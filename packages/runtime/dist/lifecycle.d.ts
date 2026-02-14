type Hook = () => void;
export declare function onMount(fn: Hook): void;
export declare function onDestroy(fn: Hook): void;
/**
 * Internal helper to catch hooks during component execution
 */
export declare function withHooks<T>(fn: () => T): {
    result: T;
    mount: Hook[];
    destroy: Hook[];
};
/**
 * Internal helper to run a set of hooks
 */
export declare function runHooks(hooks: Hook[]): void;
export {};
