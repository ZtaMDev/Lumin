The `luminjs` package provides a modular, fine-grained reactive runtime. It is the core engine that powers state management and DOM updates, and it also contains the primary LuminJS CLI.

## CLI Core Commands

The `lumin` binary is the entry point for managing LuminJS projects.

### `lumin init`

Creates a new project from a template.

```bash
lumin init <project-name>
```

### `lumin dev`

Starts the development server with HMR.

```bash
lumin dev
```

### `lumin build`

Builds the project for production, generating optimized SSG/SSR assets.

```bash
lumin build
```

## Core Concepts

The runtime is built on the principle of fine-grained reactivity, using Signals and Effects to ensure that only the parts of the DOM that actually change are updated.

### Signals

Signals are the primary primitive for reactive state. A signal holds a value and notifies its subscribers when that value changes.

```typescript
import { signal } from "luminjs";

const count = signal(0);

// Read value
console.log(count());

// Update value
count(count() + 1);

// Bulk update with .value
count.value = 10;
```

### Effects

Effects are functions that automatically re-run whenever the signals they depend on change.

```typescript
import { signal, effect } from "luminjs";

const name = signal("Lumin");

effect(() => {
  console.log(`Hello, ${name()}!`);
});

name("World"); // Logs: "Hello, World!"
```

### Computed Signals

Computed signals derive their value from other signals. They are automatically updated whenever their dependencies change.

```typescript
import { signal, computed } from "luminjs";

const first = signal("John");
const last = signal("Doe");

const full = computed(() => `${first()} ${last()}`);

console.log(full()); // "John Doe"
```

## Lifecycle Hooks

LuminJS provides hooks for managing component lifecycles.

- `onMount(fn)`: Executes when the component is mounted to the DOM.
- `onDestroy(fn)`: Executes when the component is unmounted.

## Global State Management (Store)

For complex state that needs to be shared across components or persisted, LuminJS provides a robust Store system.

```typescript
import { store, persist } from "luminjs";

// Create a reactive store
const auth = store({
  user: null,
  isLoggedIn: false,
});

// Update multiple values in a batch
auth.update({ user: "LuminUser", isLoggedIn: true });

// Reactively listen to all changes
auth.subscribe((state) => {
  console.log("Auth changed:", state);
});

// Persist automatically to localStorage
persist(auth, { key: "lumin_auth" });
```

## Two-Way Binding

The `bind` helper simplifies the synchronization between UI elements and signals.

```typescript
import { signal, bind } from "luminjs";

const email = signal("");

// In your component logic or setup:
// bind(inputElement, "value", email);
```

The runtime includes specific helpers for different input types:

- `bindValue`: For text inputs, textareas, and selects.
- `bindChecked`: For checkboxes.
- `bindNumeric`: For number and range inputs.
- `bindGroup`: For radio button groups.
- `bindSelected`: For multiple selects.

## Universal Rendering

The runtime includes primitives for both Server-Side Rendering (SSR) and Client-Side Hydration.

- `renderToString(component)`: Produces a static HTML string.
- `hydrate(root, component)`: Attaches event listeners and reactivity to existing HTML.

## Advanced Control

- `batch(fn)`: Batches multiple signal updates to trigger effects only once.
- `untrack(fn)`: Executes a function without tracking dependencies.

## License

MIT
