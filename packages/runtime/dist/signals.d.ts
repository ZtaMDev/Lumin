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
export declare function signal<T>(initialValue: T): Signal<T>;
export declare function effect(fn: () => void | CleanupFn): Unsubscribe;
export declare function computed<T>(fn: () => T): ReadonlySignal<T>;
export declare function batch<T>(fn: () => T): T;
export declare function untrack<T>(fn: () => T): T;
