# Requirements Document: SSR Hydration Architecture

## Introduction

LumixJS is a reactive UI framework with three rendering modes: PIR (Progressive Instant Rendering), SSR (Server-Side Rendering), and SSG (Static Site Generation). Currently, SSR routes are broken because the hydration system cannot reconnect event handlers to server-rendered HTML. This document specifies requirements for implementing traditional SSR hydration (like Vue.js, React, Next.js) where both server and client execute the same component code, and the client hydrates the server-rendered DOM by reconnecting event handlers.

## Glossary

- **SSR (Server-Side Rendering)**: Runtime rendering mode where components are executed on the server for each request, marked with "use server" directive
- **PIR (Progressive Instant Rendering)**: Prerendering mode where components are compiled to static HTML at build time, marked with "use prerender" directive
- **Hydration**: The process of re-executing the component on the client and attaching event handlers to existing server-rendered DOM
- **Component**: A .lumix file containing script, template, and optional style sections
- **Handler**: An event handler function (onClick, onInput, etc.) that must be reconnected during hydration
- **Signal**: A reactive state primitive from the LumixJS runtime
- **Traditional SSR**: SSR approach where the same component code runs on both server and client (like Vue.js, React, Next.js)

## Requirements

### Requirement 1: Component Compilation

**User Story:** As a framework developer, I want the compiler to generate JavaScript that can run on both server and client, so that traditional SSR hydration works.

#### Acceptance Criteria

1. WHEN the compiler processes a component with "use server" directive, THE Compiler SHALL generate a single JavaScript output
2. WHEN the component is compiled, THE Compiler SHALL preserve all component code (script body, handlers, signals, imports)
3. WHEN the compiled component is executed, THE Component SHALL be callable as a function that returns DOM elements
4. WHEN the component contains event handlers, THE Handlers SHALL be defined as named functions accessible in the component scope
5. WHEN the component is compiled, THE Compiler SHALL export the component as the default export

### Requirement 2: Build Pipeline Integration

**User Story:** As a framework developer, I want the build pipeline to create bundles for SSR routes that work on both server and client, so that hydration can succeed.

#### Acceptance Criteria

1. WHEN building an SSR route, THE Build_Pipeline SHALL create a server bundle in dist/server/{route-name}.js
2. WHEN building an SSR route, THE Build_Pipeline SHALL create a client bundle in dist/client/assets/ssr-{route-name}-{hash}.js
3. WHEN the SSR server renders a route, THE SSR_Server SHALL load and execute the server bundle
4. WHEN the browser loads an SSR page, THE Browser SHALL load and execute the client bundle
5. WHEN the build completes, THE Build_Pipeline SHALL generate a manifest mapping route names to client bundle file paths

### Requirement 3: Server-Side Rendering

**User Story:** As a framework developer, I want the SSR server to execute the component and render HTML, so that users see content immediately.

#### Acceptance Criteria

1. WHEN the SSR server receives a request for a "use server" route, THE SSR_Server SHALL load the server bundle for that route
2. WHEN rendering the component, THE SSR_Server SHALL execute the component function
3. WHEN the component execution completes, THE SSR_Server SHALL generate HTML from the component output using renderToString
4. WHEN generating the HTML response, THE SSR_Server SHALL include a script tag referencing the client bundle for hydration
5. WHEN the HTML response is sent, THE Response SHALL contain the fully rendered HTML with all component content

### Requirement 4: Client-Side Hydration

**User Story:** As a framework developer, I want the client to re-execute the component and attach handlers to existing DOM, so that the page becomes interactive.

#### Acceptance Criteria

1. WHEN the client bundle loads, THE Hydration_System SHALL locate the root element containing server-rendered HTML
2. WHEN hydrating the DOM, THE Hydration_System SHALL re-execute the component function
3. WHEN the component executes on the client, THE Component SHALL create virtual DOM with event handlers
4. WHEN hydration runs, THE Hydration_System SHALL match virtual DOM handlers to existing DOM elements and attach them
5. WHEN hydration completes, THE Page SHALL be fully interactive with all event handlers working

### Requirement 5: Handler Reconnection

**User Story:** As a framework developer, I want event handlers to be reconnected during hydration, so that interactive elements work correctly.

#### Acceptance Criteria

1. WHEN the component executes on the client, THE Component SHALL define all handler functions (increment, decrement, etc.)
2. WHEN creating virtual DOM, THE Virtual_DOM SHALL have handlers attached to elements (onClick, onInput, etc.)
3. WHEN hydration walks the DOM tree, THE Hydration_System SHALL find matching elements between virtual and real DOM
4. WHEN a matching element is found with a handler, THE Hydration_System SHALL attach the handler using addEventListener
5. WHEN a user interacts with the element, THE Handler SHALL execute and update state correctly

### Requirement 6: Signal and State Hydration

**User Story:** As a developer, I want reactive signals to be initialized on the client, so that interactive state works correctly after hydration.

#### Acceptance Criteria

1. WHEN the component executes on the client, THE Component SHALL initialize all signals with their default values
2. WHEN a signal is created, THE Signal SHALL be reactive and trigger effects when changed
3. WHEN a signal is used in a handler, THE Handler SHALL be able to read and write the signal value
4. WHEN a signal value changes, THE Runtime SHALL update the DOM reactively
5. WHEN hydration completes, THE Signals SHALL be fully functional and connected to the DOM

### Requirement 7: Error Handling and Debugging

**User Story:** As a developer, I want clear error messages when hydration fails, so that I can debug SSR issues quickly.

#### Acceptance Criteria

1. WHEN hydration fails to match DOM elements, THE Hydration_System SHALL log a descriptive warning
2. WHEN the client bundle is missing, THE SSR_Server SHALL log a warning and render a non-interactive page
3. WHEN the server bundle fails to load, THE SSR_Server SHALL return a 500 error with the error message
4. WHEN compilation fails for an SSR component, THE Compiler SHALL report the error with file name and line number
5. WHEN hydration completes successfully, THE System SHALL log a success message in development mode

### Requirement 8: Backward Compatibility

**User Story:** As a framework developer, I want PIR and SSG routes to continue working unchanged, so that existing applications are not broken.

#### Acceptance Criteria

1. WHEN a component has "use prerender" directive, THE System SHALL use the existing PIR rendering logic
2. WHEN a component has "use static" directive, THE System SHALL use the existing SSG rendering logic
3. WHEN building PIR routes, THE Build_Pipeline SHALL use the existing prerendering logic
4. WHEN the SSR server receives a request for a PIR route, THE SSR_Server SHALL serve the prerendered HTML file
5. WHEN no directive is specified, THE Compiler SHALL default to "use prerender" behavior

### Requirement 9: Performance Optimization

**User Story:** As a developer, I want fast hydration and minimal bundle sizes, so that pages load quickly.

#### Acceptance Criteria

1. WHEN hydration runs, THE Hydration_System SHALL complete in less than 100ms for typical components
2. WHEN multiple SSR routes share common code, THE Build_Pipeline SHALL create shared chunks to avoid duplication
3. WHEN the client bundle is generated, THE Build_Pipeline SHALL apply code minification and tree-shaking
4. WHEN the SSR server sends HTML, THE Response SHALL include proper caching headers
5. WHEN measuring bundle sizes, THE Client_Bundle SHALL be optimized with minimal overhead
