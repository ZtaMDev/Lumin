import { Signal, Unsubscribe } from "./signals.js";
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
export declare function store<T extends Record<string, any>>(initialState: T): Store<T>;
export declare function persist<T extends Record<string, any>>(st: Store<T>, options: PersistOptions): Unsubscribe;
export declare function derived<T extends Record<string, any>, R>(st: Store<T>, fn: (state: Readonly<T>) => R): Signal<R>;
