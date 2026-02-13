export type Subscriber<T> = (value: T) => void;
export type Unsubscribe = () => void;
export interface Signal<T> {
    (): T;
    (next: T): T;
    readonly value: T;
    _subscribe(fn: Subscriber<T>): Unsubscribe;
}
export declare function signal<T>(initialValue: T): Signal<T>;
