export type Subscriber<T> = (value: T) => void;
export type Unsubscribe = () => void;

export interface Signal<T> {
  (): T;
  (next: T): T;
  readonly value: T;
  _subscribe(fn: Subscriber<T>): Unsubscribe;
}

let activeEffect: (() => void) | null = null;

export function effect(fn: () => void) {
  activeEffect = fn;
  fn();
  activeEffect = null;
}

export function signal<T>(initialValue: T): Signal<T> {
  let value = initialValue;
  const subscribers = new Set<Subscriber<T>>();

  function readWrite(next?: T): T {
    if (arguments.length === 0) {
      if (activeEffect) {
        subscribers.add(activeEffect);
      }
      return value;
    } else {
      value = next as T;
      subscribers.forEach((fn) => fn(value));
      return value;
    }
  }

  Object.defineProperty(readWrite, "value", {
    get() {
      return readWrite();
    },
    enumerable: true,
  });

  (readWrite as any)._subscribe = (fn: Subscriber<T>): Unsubscribe => {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  };

  return readWrite as Signal<T>;
}
