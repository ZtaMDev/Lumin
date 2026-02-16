# Implementation Plan: SSR Hydration Architecture

## Overview

This implementation plan implements traditional SSR hydration (like Vue.js, React, Next.js) where the same component code runs on both server and client. The server executes the component to generate HTML, and the client re-executes the component to create a virtual DOM with handlers, then attaches those handlers to the existing server-rendered DOM. This is much simpler than Server Components and requires minimal changes to the existing codebase.

## Tasks

- [x] 1. Update hydrate() function in dom.ts
  - [x] 1.1 Implement proper hydration logic
    - Check if root has existing server-rendered content
    - If yes, execute component to get virtual DOM with handlers
    - Walk both real DOM and virtual DOM trees in parallel
    - Match elements and attach event handlers from vdom to real DOM
    - Do NOT modify DOM structure or content
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 1.2 Add hydrateNode() helper function
    - Recursively walk real DOM and virtual DOM
    - Handle arrays (fragments)
    - Skip text nodes
    - For HTMLElements, copy event listeners from vnode to real node
    - Recursively hydrate children
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 2. Write unit tests for hydration
  - Test hydration with simple button component
  - Test hydration with multiple event handlers
  - Test hydration with nested elements
  - Test hydration with fragments
  - Test hydration preserves DOM structure
  - Test hydration attaches click handlers
  - Test hydration attaches input handlers
  - _Requirements: 4.5, 5.5_

- [ ]* 3. Write property tests for hydration
  - [ ]* 3.1 Property 2: Handler Attachment
    - For any element with onClick in vdom, real DOM should have listener after hydration
    - **Validates: Requirements 5.4**
  
  - [ ]* 3.2 Property 3: Hydration Preservation
    - For any server-rendered DOM, hydration should not modify structure
    - **Validates: Requirements 4.5**
  
  - [ ]* 3.3 Property 5: Handler Execution
    - For any hydrated button, clicking should execute handler
    - **Validates: Requirements 5.5**

- [ ] 4. Update client entry generation in build.ts
  - [ ] 4.1 Simplify client entry for SSR routes
    - Import hydrate from lumix-js
    - Import component from compiled file
    - Call hydrate(root, Component) - no props needed for now
    - Remove any handler serialization logic
    - _Requirements: 2.4_

- [ ] 5. Verify SSR server rendering
  - [ ] 5.1 Check SSR server loads correct bundle
    - Ensure server loads from dist/server/{route}.js
    - Ensure component is executed correctly
    - Ensure renderToString generates HTML
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ] 5.2 Check client bundle script tag
    - Ensure HTML includes script tag for client bundle
    - Ensure script tag has correct path from manifest
    - _Requirements: 3.4_

- [x] 6. Remove unnecessary code
  - [x] 6.1 Remove handler serialization from renderToString
    - Remove addEventListener override that marks elements
    - Remove interactivity data tracking
    - Remove __LUMIX_STATE__ script generation
    - Keep only style capture and islands detection
    - _Requirements: 3.5_
  
  - [x] 6.2 Remove hydrateSSR function
    - Remove the old hydrateSSR that tried to use window[handlerName]
    - We only need the updated hydrate() function
    - _Requirements: 4.1_

- [x] 7. Test with about.lumix component
  - [x] 7.1 Build the test application
    - Run lumix build in tests/full-stack-test
    - Verify no compilation errors
    - Verify server and client bundles are created
    - _Requirements: 2.1, 2.2_
  
  - [x] 7.2 Test SSR rendering
    - Run lumix preview
    - Navigate to /about
    - Verify page renders with server content
    - Verify serverTime is displayed
    - _Requirements: 3.5_
  
  - [x] 7.3 Test client hydration
    - Check browser console for errors
    - Click increment button - should work
    - Click decrement button - should work
    - Click reset button - should work
    - Verify counter updates in DOM
    - _Requirements: 4.5, 5.5, 6.4_

- [ ] 8. Test with Counter component
  - [ ] 8.1 Verify Counter component works in SSR
    - Counter is used in about.lumix
    - Should hydrate correctly as nested component
    - All buttons should work after hydration
    - _Requirements: 5.5_

- [ ] 9. Error handling and logging
  - [ ] 9.1 Add hydration error logging
    - Log warning if hydration fails to match elements
    - Log error if component execution fails
    - Log success message in development mode
    - _Requirements: 7.1, 7.5_
  
  - [ ] 9.2 Add server error handling
    - Ensure 500 errors for missing bundles
    - Ensure 500 errors for component execution failures
    - Ensure proper error messages with stack traces
    - _Requirements: 7.2, 7.3, 7.4_

- [ ]* 10. Write integration tests
  - [ ]* 10.1 Test full SSR flow
    - Compile component → build bundles → SSR render → client hydrate
    - Verify all steps complete successfully
    - Verify page is interactive after hydration
    - _Requirements: All_
  
  - [ ]* 10.2 Test PIR routes still work
    - Verify index.lumix (PIR) still works
    - Verify no regressions in PIR mode
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 10.3 Test mixed SSR and PIR application
    - Navigate between / (PIR) and /about (SSR)
    - Verify both routes work correctly
    - Verify no conflicts between modes
    - _Requirements: 8.1, 8.5_

- [ ] 11. Performance testing
  - [ ] 11.1 Measure hydration time
    - Add performance.now() timing to hydration
    - Verify hydration completes in < 100ms
    - _Requirements: 9.1_
  
  - [ ] 11.2 Check bundle sizes
    - Verify client bundles are minified
    - Verify shared chunks are created for common code
    - _Requirements: 9.2, 9.3_

- [ ] 12. Documentation
  - Update README with SSR hydration explanation
  - Document that SSR uses traditional hydration (same code on server/client)
  - Add note about server-only code (should use getServerSideProps pattern in future)
  - Add example of SSR component
  - Document hydration behavior

- [ ] 13. Final checkpoint
  - Run full test suite
  - Verify no regressions in PIR mode
  - Verify SSR routes work correctly
  - Verify all interactive elements work after hydration
  - Ask user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- This approach is MUCH simpler than Server Components
- The same component code runs on both server and client
- Server executes component → renders HTML
- Client executes component → gets vdom with handlers → attaches to existing DOM
- No code splitting needed, no handler serialization needed
- This is how Vue.js, React, and Next.js do SSR

## Key Differences from Server Components

**Traditional SSR (what we're implementing):**
- ✅ Simple: same code on server and client
- ✅ Easy to understand and debug
- ✅ Works like Vue/React/Next.js
- ⚠️ All component code goes to client (including Date.now() calls)
- ⚠️ For sensitive server code, need separate pattern (like getServerSideProps)

**Server Components (what we're NOT doing):**
- ❌ Complex: separate server and client code
- ❌ Requires compiler code splitting
- ❌ Requires handler serialization
- ✅ Server-only code never reaches client
- ✅ Smaller client bundles

For now, traditional SSR is the right choice. We can add Server Components later if needed.
