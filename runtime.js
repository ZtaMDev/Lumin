// LuminJS runtime MVP

export function signal(initialValue) {
  let value = initialValue;
  const subscribers = new Set();

  function readWrite(next) {
    if (arguments.length === 0) {
      // read
      return value;
    } else {
      // write
      value = next;
      subscribers.forEach(fn => fn(value));
      return value;
    }
  }

  Object.defineProperty(readWrite, "value", {
    get() {
      return value; // non-reactive read
    },
  });

  readWrite._subscribe = (fn) => {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  };

  return readWrite;
}

export function effect(fn) {
  fn();
}
