# Config Head Metadata - Design

## Architecture Overview

This feature involves changes across the entire stack:
1. Compiler extracts head metadata from route exports
2. Build process collects and passes metadata
3. Prerender generates HTML with proper head tags
4. Runtime skips duplicate style injection

## Component Design

### 1. Compiler Changes (Rust)

**File**: `packages/compiler/src/codegen.rs`

**Changes**:
- Parse `export const head = { ... }` from route files
- Extract head object and serialize to JSON
- Include head metadata in compilation output as comment or separate export

**Output Format**:
```javascript
// __LUMIX_HEAD__: {"title":"Page Title","meta":[...]}
export const head = { title: "Page Title", meta: [...] };
```

### 2. Build Process Changes

**File**: `packages/runtime/src/cli/build.ts`

**Changes**:
- After compiling each route, extract head metadata
- Parse `__LUMIX_HEAD__` comment or read `head` export
- Pass head metadata to prerender function

**Data Flow**:
```typescript
interface RouteInfo {
  path: string;
  safeName: string;
  directive: string;
  entryPath: string;
  compiledPath: string;
  head?: RouteHeadConfig; // NEW
}
```

### 3. Prerender Changes

**File**: `packages/runtime/src/cli/prerender.ts`

**Changes**:
- Accept route head metadata in options
- Merge config head with route head
- Generate proper HTML head section

**Head Merging Logic**:
```typescript
function mergeHead(configHead: HeadConfig, routeHead: HeadConfig): HeadConfig {
  return {
    title: routeHead.title || configHead.title,
    meta: [...(configHead.meta || []), ...(routeHead.meta || [])],
    link: [...(configHead.link || []), ...(routeHead.link || [])],
    script: [...(configHead.script || []), ...(routeHead.script || [])]
  };
}
```

**HTML Generation**:
```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{merged.title}</title>
  {favicon link if config.favicon}
  {merged.meta tags}
  {merged.link tags}
  {captured styles}
  {merged.script tags}
</head>
```

### 4. Style Deduplication

**Current Problem**:
- Prerender captures styles and includes in HTML head
- Hydration code runs and injects styles again
- Result: duplicate style tags

**Solution**:
The compiler already generates this check:
```javascript
if (typeof document !== 'undefined') {
  const styleId = 'lumix-style-counter';
  if (!document.getElementById(styleId)) {
    const s = document.createElement('style');
    s.id = styleId;
    // ... inject style
  }
}
```

**Issue**: During prerender, styles are captured but not given IDs in the HTML.

**Fix**: In prerender, when including captured styles, add the style IDs:
```html
<style id="lumix-style-counter">/* styles */</style>
```

**Implementation**:
- Modify `renderToString` to track style IDs
- Return style IDs along with style content
- In prerender, include IDs when generating HTML

### 5. Config Types

**File**: `packages/runtime/src/config.ts`

**Add Route Head Type**:
```typescript
export interface RouteHeadConfig {
  title?: string;
  meta?: Array<Record<string, string>>;
  link?: Array<Record<string, string>>;
  script?: Array<Record<string, string>>;
}
```

## Implementation Plan

### Phase 1: Fix Style Deduplication (Immediate)
1. Modify `renderToString` to capture style IDs
2. Update prerender to include style IDs in HTML
3. Test that hydration skips existing styles

### Phase 2: Config Head Metadata
1. Update prerender to use config head
2. Generate meta, link, script tags from config
3. Include favicon if specified
4. Test with full-stack-test config

### Phase 3: Per-Route Head (Complex)
1. Update compiler to extract head exports
2. Modify build to collect head metadata
3. Update prerender to merge route + config head
4. Add route head to test routes
5. Test complete flow

## Testing Strategy

### Manual Testing
1. Build full-stack-test
2. Check dist/client/index.html for:
   - Config meta tags present
   - No duplicate styles
   - Correct title
3. Test hydration in browser
4. Add route-specific head and verify

### Test Cases
- Config with all head options
- Route with title override
- Route with additional meta tags
- Multiple routes with different head configs
- Component with styles + route with head

## Correctness Properties

### Property 1: Style Uniqueness
**For all** components with styles  
**When** page is prerendered and hydrated  
**Then** each style ID appears exactly once in the DOM

### Property 2: Head Completeness
**For all** routes with head config  
**When** page is prerendered  
**Then** HTML head contains all config + route metadata

### Property 3: Title Priority
**For all** routes  
**When** route has title AND config has title  
**Then** route title is used in HTML

### Property 4: Meta Merging
**For all** routes with meta tags  
**When** config also has meta tags  
**Then** both sets of meta tags appear in HTML (no duplicates by name)
