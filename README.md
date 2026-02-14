# LuminJS

LuminJS is a high-performance web framework featuring a native compiler written in Rust. It is designed to combine the speed of compiled toolchains with a fine-grained reactive runtime, specifically optimized for Universal Rendering (SSG + SSR) with an Islands architecture.

## Vision and Objectives

The goal of LuminJS is to provide an "Astro-like" experience where performance is the default.

- **Islands Architecture**: Automatically ship zero JavaScript by default, hydrating only the reactive components (islands) necessary for interactivity.
- **SSG & SSR First**: Built-in support for Static Site Generation and Server-Side Rendering.
- **High-Performance Core**: Structural analysis and transpilation are handled by a native Rust core, ensuring near-instant build times.
- **Fine-Grained Reactivity**: Accurate DOM updates via a Signal-based system, avoiding the overhead of the Virtual DOM.

## Features

- **Signals and Effects**: Native primitives for reactive state management.
- **Reactive Control Flow**: Built-in syntax for conditional rendering and loops.
- **Type Safety**: Full semantic TypeScript validation for both logic and templates.

## Installation

The LuminJS CLI is the primary tool for creating and managing projects. Install it globally via npm:

```bash
npm install -g lumin-js
```

## Getting Started

To create a new project, use the `init` command:

```bash
lumin init my-new-project
cd my-new-project
npm install
npm run dev
```

## Usage Examples

### Reactive Counter

LuminJS components use a `.lumin` extension. Logic and markup are co-located for a cohesive developer experience.

```svelte
<script>
  import { signal } from "lumin-js";

  const count = signal(0);

  const increment = () => count(count() + 1);
</script>

<div class="container">
  <h1>Counter: {count()}</h1>
  <button onClick={increment}>Increment</button>
</div>
```

### Control Flow

LuminJS provides a robust syntax for conditional and iterative rendering using the `@{}` block.

```svelte
<script>
  import { signal } from "lumin-js";

  const show = signal(true);
  const items = signal(["Rust", "TypeScript", "LuminJS"]);

  const toggle = () => show(!show());
</script>

<div>
  <button onClick={toggle}>Toggle List</button>

  @{if (show()) {
    <ul>
      @{for (let item of items(); key=item) {
        <li>{item}</li>
      }}
    </ul>
  } else {
    <p>List is hidden</p>
  }}
</div>
```

## Project Structure

LuminJS is organized as a monorepo:

- **[compiler](packages/compiler)**: The Rust-powered core (`@lumin-js/compiler`) and Node.js validation bridge.
- **[runtime](packages/runtime)**: The reactive core, lifecycle hooks, and CLI.
- **[vite-plugin-lumin](packages/vite-plugin-lumin)**: The official Vite integration.

For more specialized information, refer to the README files within each package directory.

## Examples

The [examples](examples/) directory contains various demonstrations of current capabilities, including:

- Complex form handling
- Nested layouts and props
- Advanced control flow and lifecycle hooks

## License

MIT
