# Design Document: SSR Hydration Architecture

## Overview

This design implements traditional SSR hydration for LumixJS (like Vue.js, React, Next.js). The same component code runs on both server and client. The server executes the component to generate HTML, and the client re-executes the same component to create a virtual DOM with event handlers, then matches and attaches those handlers to the existing server-rendered DOM. This is simpler than Server Components and follows the standard SSR pattern used by most frameworks.

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. COMPILE TIME                                             │
│                                                              │
│  about.lumix ("use server")                                 │
│       │                                                      │
│       └──> Rust Compiler                                    │
│             │                                                │
│             └──> about.mjs (single output)                  │
│                  - All script code                          │
│                  - Event handlers                           │
│                  - Signals                                  │
│                  - Component function                       │
│                                                              │
│       Build Pipeline                                         │
│             │                                                │
│             ├──> dist/server/about.js (for Node.js SSR)     │
│             └──> dist/client/assets/ssr-about-{hash}.js     │
│                  (same code, for browser hydration)         │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2. SERVER RUNTIME (Request for /about)                      │
│                                                              │
│  SSR Server                                                  │
│       │                                                      │
│       ├──> Load dist/server/about.js                        │
│       ├──> Execute component function                       │
│       │    const vdom = about(props)                        │
│       │                                                      │
│       ├──> Render to HTML string                            │
│       │    const html = renderToString(vdom)                │
│       │                                                      │
│       └──> Send HTML + <script src="/assets/ssr-about.js">  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 3. CLIENT RUNTIME (Browser loads page)                      │
│                                                              │
│  Browser                                                     │
│       │                                                      │
│       ├──> Parse HTML (server-rendered DOM exists)          │
│       │                                                      │
│       ├──> Load /assets/ssr-about-{hash}.js                 │
│       │    (same component code as server)                  │
│       │                                                      │
│       ├──> Execute hydration                                │
│       │    hydrate(rootElement, about, props)               │
│       │                                                      │
│       └──> Hydration process:                               │
│            1. Execute component: vdom = about(props)        │
│            2. Walk both real DOM and virtual DOM            │
│            3. Match elements                                │
│            4. Attach handlers from vdom to real DOM         │
│            5. Page becomes interactive!                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Example Component Flow

**Component Code** (about.lumix):
```javascript
<script>
  "use server";
  import { signal } from "lumix-js";
  
  const serverTime = new Date().toISOString();
  const count = signal(0);
  
  function increment() { count.value++; }
  function decrement() { count.value--; }
</script>

<button onClick={increment}>+</button>
<button onClick={decrement}>-</button>
<p>Count: {count}</p>
<p>Server time: {serverTime}</p>
```

**Compiled Output** (about.mjs):
```javascript
import { h, signal } from "lumix-js";

function about(props = {}) {
  const serverTime = new Date().toISOString();
  const count = signal(0);
  
  function increment() { count.value++; }
  function decrement() { count.value--; }
  
  return h('div', null,
    h('button', { onClick: increment }, '+'),
    h('button', { onClick: decrement }, '-'),
    h('p', null, () => `Count: ${count.value}`),
    h('p', null, `Server time: ${serverTime}`)
  );
}

export default about;
```

**Server Execution:**
```javascript
// Server loads and executes
const about = await import('./dist/server/about.js');
const vdom = about.default(); // serverTime = "2024-01-15T10:30:00Z"
const html = renderToString(vdom);
// HTML: <div><button>+</button><button>-</button><p>Count: 0</p><p>Server time: 2024-01-15T10:30:00Z</p></div>
```

**Client Execution:**
```javascript
// Client loads and executes
const about = await import('./assets/ssr-about-abc123.js');
const root = document.getElementById('app'); // Has server HTML
hydrate(root, about.default);

// Hydration:
// 1. Execute: vdom = about.default() // serverTime = "2024-01-15T10:30:05Z" (different!)
// 2. Walk DOM: find <button> elements
// 3. Attach handlers: button1.addEventListener('click', increment)
// 4. Done! Buttons now work
```

**Note:** `serverTime` will be different on client vs server, but that's OK! The client doesn't re-render, it just attaches handlers. The server-rendered timestamp stays in the DOM.

## Components and Interfaces

### 1. Compiler Module (Rust)

**File:** `packages/compiler/src/codegen.rs`

**No changes needed** - The compiler already generates correct JavaScript. We just need to ensure it exports the component function properly.

### 2. Build Pipeline Module (TypeScript)

**File:** `packages/runtime/src/cli/build.ts`

**Current behavior is correct** - Already compiles components and creates both server and client bundles. The same compiled code goes to both.

**Entry Files:**

Server Entry (`.lumix/entries/{route}-server.js`):
```typescript
// Exports component for SSR rendering
import Component from "../compiled/{route}.mjs";
export default Component;
```

Client Entry (`.lumix/entries/{route}.js`):
```typescript
// Hydration entry - loads component and hydrates
import { hydrate } from "lumix-js";
import Component from "../compiled/{route}.mjs";

const root = document.getElementById("app");
if (root) {
  hydrate(root, Component);
}
```

### 3. SSR Server Module (TypeScript)

**File:** `packages/runtime/src/cli/ssr-server.ts`

**Current behavior is mostly correct** - Loads server bundle and renders to HTML. Just needs to ensure proper hydration script is included.

### 4. Hydration Module (TypeScript)

**File:** `packages/runtime/src/dom.ts`

**Needs update** - The `hydrate()` function needs to implement proper DOM matching and handler attachment.

**New/Updated Functions:**

```typescript
/**
 * Hydrate SSR-rendered DOM by re-executing component and attaching handlers
 * This is traditional SSR hydration (like Vue/React)
 */
export function hydrate(
  root: HTMLElement,
  component: (props?: any) => any,
  props?: any,
): void {
  // 1. Check if root has server-rendered content
  const hasExistingContent = root.children.length > 0;
  
  if (!hasExistingContent) {
    // No SSR content, just mount normally
    mount(root, component, props);
    return;
  }
  
  // 2. Execute component to get virtual DOM with handlers
  const vdom = h(component, props || {});
  
  // 3. Walk both trees and attach handlers
  hydrateNode(root, vdom);
}

/**
 * Recursively walk real DOM and virtual DOM to attach handlers
 */
function hydrateNode(realNode: Node, vnode: any): void {
  // Handle arrays (fragments)
  if (Array.isArray(vnode)) {
    let realChild = realNode.firstChild;
    for (const vchild of vnode) {
      if (realChild) {
        hydrateNode(realChild, vchild);
        realChild = realChild.nextSibling;
      }
    }
    return;
  }
  
  // Skip text nodes
  if (!(realNode instanceof Element)) return;
  if (typeof vnode === 'string' || typeof vnode === 'number') return;
  
  // If vnode is an HTMLElement, it has handlers attached
  if (vnode instanceof HTMLElement) {
    const vnodeEl = vnode as HTMLElement;
    const realEl = realNode as HTMLElement;
    
    // Copy event listeners from vnode to realNode
    const events = ['click', 'input', 'change', 'submit', 'keydown', 'keyup', 'focus', 'blur'];
    for (const eventName of events) {
      const handler = (vnodeEl as any)[`on${eventName}`];
      if (handler && typeof handler === 'function') {
        realEl.addEventListener(eventName, handler);
      }
    }
    
    // Recursively hydrate children
    let realChild = realEl.firstChild;
    let vnodeChild = vnodeEl.firstChild;
    while (realChild && vnodeChild) {
      hydrateNode(realChild, vnodeChild);
      realChild = realChild.nextSibling;
      vnodeChild = vnodeChild.nextSibling;
    }
  }
}
```

## Data Models

### Component Props

```typescript
interface ComponentProps {
  [key: string]: any;
}
```

### Hydration Context

```typescript
interface HydrationContext {
  isHydrating: boolean;
  currentRealNode: Node | null;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Component Execution Consistency

*For any* SSR component, executing the component function should return a valid virtual DOM structure on both server and client.

**Validates: Requirements 1.3**

### Property 2: Handler Attachment

*For any* element with an onClick handler in the virtual DOM, after hydration the corresponding real DOM element should have a click event listener attached.

**Validates: Requirements 5.4**

### Property 3: Hydration Preservation

*For any* server-rendered DOM, hydration should NOT modify the DOM structure or text content.

**Validates: Requirements 4.5**

### Property 4: Signal Reactivity

*For any* signal in a hydrated component, changing the signal value should trigger DOM updates.

**Validates: Requirements 6.4**

### Property 5: Handler Execution

*For any* hydrated button with onClick handler, clicking the button should execute the handler function.

**Validates: Requirements 5.5**

### Property 6: Backward Compatibility

*For any* component with "use prerender" directive, the system should use PIR rendering, not SSR.

**Validates: Requirements 8.1**

### Property 7: Bundle Generation

*For any* SSR route, the build pipeline should generate both a server bundle and a client bundle.

**Validates: Requirements 2.1, 2.2**

### Property 8: Server Rendering

*For any* SSR route request, the server should return HTML containing the rendered component content.

**Validates: Requirements 3.5**

### Property 9: Client Bundle Loading

*For any* SSR page, the HTML should include a script tag that loads the client bundle.

**Validates: Requirements 3.4**

### Property 10: Hydration Completion

*For any* SSR page, after hydration completes, all interactive elements should be functional.

**Validates: Requirements 4.5, 5.5**

## Error Handling

### Compile-Time Errors

1. **Invalid Directive**: If multiple directives are found, throw error with file location
2. **Compilation Failure**: If component compilation fails, report syntax error with file and line number

### Build-Time Errors

1. **Missing Bundle**: If bundle compilation fails, abort build with error message
2. **Manifest Generation**: If manifest generation fails, log warning and continue

### Runtime Errors (Server)

1. **Server Bundle Not Found**: Return 500 error with message "Server bundle not found, run lumix build"
2. **Component Export Missing**: Return 500 error with message "Invalid component export"
3. **Rendering Failure**: Return 500 error with exception message and stack trace

### Runtime Errors (Client)

1. **Hydration Mismatch**: Log warning if virtual DOM doesn't match real DOM structure
2. **Client Bundle Missing**: Log warning "Client bundle not found, page will not be interactive"
3. **Component Execution Failure**: Log error with exception message

## Testing Strategy

### Unit Tests

Unit tests verify specific examples and edge cases:

- Test compiler generates correct JavaScript for SSR components
- Test build pipeline creates both server and client bundles
- Test SSR server renders HTML correctly
- Test hydration attaches handlers to existing DOM
- Test hydration preserves DOM structure
- Test signals work after hydration
- Test error handling for missing bundles

### Property-Based Tests

Property tests verify universal properties across all inputs (minimum 100 iterations each):

- **Property 1**: For any SSR component, execution returns valid virtual DOM
- **Property 2**: For any onClick handler, hydration attaches event listener
- **Property 3**: For any server-rendered DOM, hydration preserves structure
- **Property 4**: For any signal, changing value triggers DOM update
- **Property 5**: For any hydrated button, clicking executes handler
- **Property 6**: For any prerender component, system uses PIR not SSR
- **Property 7**: For any SSR route, build generates server and client bundles
- **Property 8**: For any SSR request, server returns HTML with content
- **Property 9**: For any SSR page, HTML includes client bundle script tag
- **Property 10**: For any SSR page, hydration makes elements functional

### Integration Tests

- Test full SSR flow: compile → build → render → hydrate
- Test PIR routes continue working unchanged
- Test mixed application with both SSR and PIR routes
- Test handler interaction after hydration (click button, verify state change)
- Test signal reactivity after hydration (modify signal, verify DOM update)
- Test nested components with SSR
- Test layouts with SSR

### Manual Testing

- Verify page is interactive after hydration (buttons work, forms submit)
- Verify no console errors during hydration
- Verify network tab shows client bundle loaded
- Verify server-rendered content appears immediately
- Verify hydration completes quickly (< 100ms)
