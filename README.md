# LumixJS

LumixJS is a high-performance web framework featuring a native compiler written in Rust. It combines the speed of compiled toolchains with a fine-grained reactive runtime, optimized for modern web applications with flexible rendering strategies.

## Vision and Objectives

LumixJS provides multiple rendering modes to match your application's needs, from instant-loading progressive apps to fully static sites.

- **PIR (Progressive Instant Rendering)**: Default mode that prerenders HTML for instant SEO-friendly loads, then progressively hydrates the entire component for full interactivity. Perfect for dynamic apps that need fast initial loads.
- **SSR (Server-Side Rendering)**: Dynamic server rendering on every request with client-side hydration. Ideal for personalized content and real-time data.
- **SSG (Static Site Generation)**: Coming soon - True islands architecture that ships zero JavaScript by default, hydrating only interactive components. Inspired by Astro.
- **High-Performance Core**: Structural analysis and transpilation handled by a native Rust compiler, ensuring near-instant build times.
- **Fine-Grained Reactivity**: Precise DOM updates via a Signal-based system, avoiding Virtual DOM overhead.

## Rendering Modes

LumixJS supports three rendering strategies controlled by directives in your components:

### PIR (Progressive Instant Rendering) - `"use prerender"`
Combines the best of static and dynamic rendering:
- HTML prerendered at build time for instant loads and perfect SEO
- Full component hydration in the client for complete interactivity
- Smaller bundles than pure SSR, faster than pure CSR
- **Default mode** - Use `"use prerender"` directive in components

### SSR (Server-Side Rendering) - `"use server"`
Dynamic rendering for personalized content:
- HTML generated on every request with fresh data
- Client-side hydration for interactivity
- Perfect for user-specific content and real-time data
- Use `"use server"` directive in components

### SSG (Static Site Generation) - `"use static"` - Coming Soon
True islands architecture for maximum performance:
- Zero JavaScript shipped by default
- Only interactive components (islands) are hydrated
- Smallest possible bundle sizes
- Inspired by Astro's approach
- Use `"use static"` directive in components (future)

## Features

- **Signals and Effects**: Native primitives for reactive state management.
- **Reactive Control Flow**: Built-in syntax for conditional rendering and loops.
- **Type Safety**: Full semantic TypeScript validation for both logic and templates.
- **File-Based Routing**: Automatic route generation from file structure.
- **Directive-Based Rendering**: Control rendering strategy per component with `"use prerender"`, `"use server"`, or `"use static"`.
- **Head Metadata Management**: Configure SEO tags, meta tags, and scripts globally or per-route.
- **Layout System**: Reusable layouts with slot-based composition.
- **Style Deduplication**: Automatic style extraction and deduplication across components.

## Installation

The LumixJS CLI is the primary tool for creating and managing projects.

```bash
npm install -g lumix-js
```

## Getting Started

To create a new project, use the `create lumix` cli:

```bash
npm create lumix@latest my-new-project
cd my-new-project
npm install
npm run dev
```

### Project Templates

LumixJS offers three starter templates:

- **Blank**: Minimal setup with a single component
- **Blank TypeScript**: Minimal setup with TypeScript support
- **Full-Stack App**: Complete application with routing, layouts, PIR and SSR examples

Choose the template that best fits your needs during project creation.

## Usage Examples

### PIR Example (Progressive Instant Rendering)

```svelte
<script>
  "use prerender"; // PIR mode - prerendered HTML + full hydration
  
  import { signal } from "lumix-js";
  
  const count = signal(0);
</script>

<div>
  <h1>Counter: {count()}</h1>
  <button onClick={() => count(count() + 1)}>Increment</button>
</div>
```

### SSR Example (Server-Side Rendering)

```svelte
<script>
  "use server"; // SSR mode - dynamic server rendering
  
  import { signal } from "lumix-js";
  
  const serverTime = new Date().toISOString();
  const count = signal(0);
</script>

<div>
  <p>Server timestamp: {serverTime}</p>
  <h1>Counter: {count()}</h1>
  <button onClick={() => count(count() + 1)}>Increment</button>
</div>
```

### SSG Example (Coming Soon)

```svelte
<script>
  "use static"; // SSG mode - islands architecture
  
  import { signal } from "lumix-js";
  
  const count = signal(0);
</script>

<div>
  <h1>Mostly Static Content</h1>
  <p>This text is static HTML, no JavaScript needed.</p>
  <!-- Only this button becomes an interactive island -->
  <button onClick={() => count(count() + 1)}>Count: {count()}</button>
</div>
```

### Reactive Counter

LumixJS components use a `.lumix` extension. Logic and markup are co-located for a cohesive developer experience.

```svelte
<script>
  import { signal } from "lumix-js";

  const count = signal(0);

  const increment = () => count(count() + 1);
</script>

<div class="container">
  <h1>Counter: {count()}</h1>
  <button onClick={increment}>Increment</button>
</div>
```

### Control Flow

LumixJS provides a robust syntax for conditional and iterative rendering using the `@{}` block.

```svelte
<script>
  import { signal } from "lumix-js";

  const show = signal(true);
  const items = signal(["Rust", "TypeScript", "LumixJS"]);

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

## Configuration

LumixJS uses a `lumix.config.mjs` (or `.mts` for TypeScript) file for project configuration.

### Basic Configuration

```javascript
export default {
  mode: "pir", // "pir" for Progressive Instant Rendering
  title: "My Lumix App",
  rootId: "app",
  favicon: "/favicon.ico",
  srcDir: "src",
  publicDir: "public",
  outDir: "dist"
};
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `"pir"` \| `"ssr"` | `"pir"` | Rendering mode for the application |
| `title` | `string` | `undefined` | Default page title |
| `rootId` | `string` | `"app"` | Root element ID for mounting |
| `favicon` | `string` | `undefined` | Path to favicon file |
| `srcDir` | `string` | `"src"` | Source directory |
| `publicDir` | `string` | `"public"` | Public assets directory |
| `outDir` | `string` | `"dist"` | Build output directory |
| `head` | `HeadConfig` | `undefined` | Global head metadata |
| `vite` | `ViteConfig` | `undefined` | Vite configuration passthrough |
| `build` | `BuildConfig` | `undefined` | Build-specific options |

### Head Metadata Configuration

Configure global head metadata that applies to all pages:

```javascript
export default {
  title: "My Lumix App",
  favicon: "/favicon.ico",
  head: {
    meta: [
      { name: "description", content: "My awesome Lumix application" },
      { name: "keywords", content: "lumix, web, framework" },
      { property: "og:title", content: "My Lumix App" },
      { property: "og:description", content: "Built with LumixJS" },
      { property: "og:image", content: "/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" }
    ],
    link: [
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" }
    ],
    script: [
      { src: "https://analytics.example.com/script.js", async: true },
      { innerHTML: "console.log('App initialized')" }
    ]
  }
};
```

### Per-Route Head Metadata

Override or extend global head metadata on a per-route basis by exporting a `head` object from your component:

```svelte
<script>
  "use prerender";
  
  import { signal } from "lumix-js";
  
  // Export head metadata for this route
  export const head = {
    title: "About Us - My Lumix App",
    meta: [
      { name: "description", content: "Learn more about our company" },
      { property: "og:title", content: "About Us" }
    ]
  };
  
  const count = signal(0);
</script>

<div>
  <h1>About Page</h1>
  <p>This page has custom head metadata.</p>
</div>
```

**Head Merging Rules:**
- Route `title` overrides global `title`
- Route `meta`, `link`, and `script` arrays are concatenated with global arrays
- This allows routes to add additional metadata while keeping global defaults

## File-Based Routing

LumixJS automatically generates routes from your file structure in the `src/routes` directory.

### Route Structure

```
src/
├── routes/
│   ├── index.lumix          → /
│   ├── about.lumix          → /about
│   ├── blog/
│   │   ├── index.lumix      → /blog
│   │   └── [slug].lumix     → /blog/:slug
│   └── api/
│       └── users.lumix      → /api/users
└── layouts/
    └── MainLayout.lumix
```

### Using Layouts and Slots

Create reusable layouts in `src/layouts` using the `{@slot}` syntax:

```svelte
<div class="layout">
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
    </nav>
  </header>
  
  <main>
    {@slot}
  </main>
  
  <footer>
    {@slot footer ?? <p>© 2024 My Lumix App</p>}
  </footer>
</div>

<style>
  .layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  main {
    flex: 1;
  }
</style>
```

Use the layout in your routes with the import frontmatter section:

```svelte
---
import MainLayout from "/src/layouts/MainLayout.lumix"
import Counter from "/src/components/Counter.lumix"
---

<script>
  "use prerender";
</script>

<MainLayout>
  <h1>Welcome to LumixJS</h1>
  <p>This content goes into the default slot.</p>
  
  <div slot="footer">
    <p>Custom footer content</p>
  </div>
</MainLayout>
```

**Slot Features:**
- `{@slot}` - Default slot for main content
- `{@slot name}` - Named slots for specific areas
- `{@slot name ?? <fallback>}` - Slots with fallback content
- Use `<div slot="name">` to target named slots

### Absolute Imports

Use absolute imports starting with `/src/` for components, layouts, and utilities. Imports go in the frontmatter section (`---`):

```svelte
---
import MainLayout from "/src/layouts/MainLayout.lumix"
import Counter from "/src/components/Counter.lumix"
import { formatDate } from "/src/utils/date.js"
---

<script>
  "use prerender";
  
  import { signal } from "lumix-js";
  
  const count = signal(0);
</script>

<MainLayout>
  <Counter initialCount={count()} />
</MainLayout>
```

## Rendering Directives

Control how each route is rendered using directives at the top of your script block.

### Progressive Instant Rendering (PIR) - Default

```svelte
<script>
  "use prerender"; // Can be omitted as it's the default
  
  import { signal } from "lumix-js";
  
  const count = signal(0);
</script>

<div>
  <h1>PIR Page</h1>
  <p>This page is prerendered at build time.</p>
  <button onClick={() => count(count() + 1)}>
    Count: {count()}
  </button>
</div>
```

**When to use PIR:**
- Marketing pages and landing pages
- Blog posts and documentation
- Dashboard pages with client-side data fetching
- Any page that benefits from instant loads and SEO

### Server-Side Rendering (SSR)

```svelte
<script>
  "use server";
  
  import { signal } from "lumix-js";
  
  // This runs on the server for every request
  const serverTime = new Date().toISOString();
  
  const count = signal(0);
</script>

<div>
  <h1>SSR Page</h1>
  <p>Server time: {serverTime}</p>
  <button onClick={() => count(count() + 1)}>
    Count: {count()}
  </button>
</div>
```

**When to use SSR:**
- User-specific content (dashboards, profiles)
- Real-time data that changes frequently
- Personalized experiences
- Pages that need fresh data on every request

### Static Site Generation (SSG) - Coming Soon

```svelte
<script>
  "use static";
  
  import { signal } from "lumix-js";
  
  const count = signal(0);
</script>

<div>
  <h1>SSG Page with Islands</h1>
  <p>This content is static HTML with zero JavaScript.</p>
  
  <!-- Only this interactive component becomes an island -->
  <button onClick={() => count(count() + 1)}>
    Count: {count()}
  </button>
</div>
```

**When to use SSG (future):**
- Content-heavy sites with minimal interactivity
- Documentation sites
- Blogs with occasional interactive elements
- Maximum performance requirements

## Style Management

LumixJS automatically handles component styles within your markup.

### Component Styles

Define styles in a `<style>` block within your component:

```svelte
<script>
  import { signal } from "lumix-js";
  const count = signal(0);
</script>

<div class="counter">
  <h2>Count: {count()}</h2>
  <button class="btn" onClick={() => count(count() + 1)}>
    Increment
  </button>
</div>

<style>
  .counter {
    padding: 2rem;
    background: #f5f5f5;
    border-radius: 8px;
  }
  
  .btn {
    padding: 0.5rem 1rem;
    background: #8b5cf6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .btn:hover {
    background: #7c3aed;
  }
</style>
```

**Style Features:**
- Automatic extraction and injection
- Deduplication across routes and components
- Scoped by component ID to prevent conflicts
- Works in all rendering modes (PIR, SSR, dev)

### Global Styles

For global styles, use the `head.link` configuration or import CSS files in your main entry point.

## CLI Commands

### Development

Start the development server with hot module replacement:

```bash
lumix dev
```

### Build

Build your application for production:

```bash
lumix build
```

This generates:
- **PIR routes**: Prerendered HTML + client bundles in `dist/client`
- **SSR routes**: Server bundles in `dist/server` + client bundles for hydration

### Preview

Preview the production build locally:

```bash
lumix preview
```

## Advanced Features

### Signals and Reactivity

LumixJS uses a fine-grained reactive system based on signals:

```svelte
<script>
  import { signal, computed, effect } from "lumix-js";
  
  // Create a signal
  const count = signal(0);
  
  // Create a computed value
  const doubled = computed(() => count() * 2);
  
  // Create a side effect
  effect(() => {
    console.log(`Count is now: ${count()}`);
  });
  
  const increment = () => count(count() + 1);
</script>

<div>
  <p>Count: {count()}</p>
  <p>Doubled: {doubled()}</p>
  <button onClick={increment}>Increment</button>
</div>
```

### Control Flow

Use `@{}` blocks for conditional rendering and loops:

```svelte
<script>
  import { signal } from "lumix-js";
  
  const items = signal(["Apple", "Banana", "Cherry"]);
  const showList = signal(true);
</script>

<div>
  <button onClick={() => showList(!showList())}>
    Toggle List
  </button>
  
  @{if (showList()) {
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

### Props and Component Composition

Pass data between components using props:

```svelte
<script>
  export let name;
  export let email;
  export let avatar;
</script>

<div class="card">
  <img src={avatar} alt={name} />
  <h3>{name}</h3>
  <p>{email}</p>
</div>

<style>
  .card {
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 8px;
  }
</style>
```

Use the component:

```svelte
---
import UserCard from "/src/components/UserCard.lumix"
---

<script>
  const users = [
    { name: "Alice", email: "alice@example.com", avatar: "/alice.jpg" },
    { name: "Bob", email: "bob@example.com", avatar: "/bob.jpg" }
  ];
</script>

<div>
  @{for (let user of users; key=user.email) {
    <UserCard 
      name={user.name}
      email={user.email}
      avatar={user.avatar}
    />
  }}
</div>
```

## Examples

The [examples](examples/) directory contains various demonstrations of current capabilities, including:

- Complex form handling
- Nested layouts and slots
- Advanced control flow and lifecycle hooks

## License

MIT
