export function signal(initialValue) {
    let value = initialValue;
    const subscribers = new Set();
    function readWrite(next) {
        if (arguments.length === 0) {
            // Getter
            return value;
        }
        else {
            // Setter
            value = next;
            subscribers.forEach((fn) => fn(value));
            return value;
        }
    }
    Object.defineProperty(readWrite, "value", {
        get() {
            return value;
        },
        enumerable: true,
    });
    readWrite._subscribe = (fn) => {
        subscribers.add(fn);
        return () => subscribers.delete(fn);
    };
    return readWrite;
}
