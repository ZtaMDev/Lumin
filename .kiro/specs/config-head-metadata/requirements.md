# Config Head Metadata - Requirements

## Overview
Fix multiple issues with config metadata handling, duplicate styles, and per-route head configuration in LumixJS.

## User Stories

### 1. Config Head Metadata Respected
**As a** developer  
**I want** the `head` configuration in `lumix.config.mts` to be included in the final HTML  
**So that** I can define global meta tags, links, and scripts for my application

**Acceptance Criteria:**
- 1.1 Config `head.meta` tags are included in prerendered HTML
- 1.2 Config `head.link` tags are included in prerendered HTML  
- 1.3 Config `head.script` tags are included in prerendered HTML
- 1.4 Config `title` is used as default page title
- 1.5 Config `favicon` is included as link tag if specified

### 2. No Duplicate Styles
**As a** developer  
**I want** component styles to be included only once in the HTML  
**So that** the page doesn't have duplicate style tags

**Acceptance Criteria:**
- 2.1 Styles captured during prerender are included in HTML head
- 2.2 Hydration code skips style injection if style ID already exists in DOM
- 2.3 No duplicate style tags appear in final rendered page
- 2.4 Style deduplication works across all components

### 3. Per-Route Head Configuration
**As a** developer  
**I want** to define route-specific head metadata in each route file  
**So that** each page can have its own title, description, and meta tags

**Acceptance Criteria:**
- 3.1 Routes can export a `head` object with metadata
- 3.2 Route-specific `title` overrides config default
- 3.3 Route-specific `meta` tags are merged with config defaults
- 3.4 Route-specific `link` tags are merged with config defaults
- 3.5 Route-specific `script` tags are merged with config defaults
- 3.6 Compiler extracts head metadata from route files
- 3.7 Build process passes head metadata to prerender
- 3.8 Prerender includes route-specific metadata in HTML

## Technical Notes

### Files to Modify
1. **Compiler** (`packages/compiler/src/codegen.rs`): Extract head metadata from routes
2. **Config** (`packages/runtime/src/config.ts`): Add route head types
3. **Build** (`packages/runtime/src/cli/build.ts`): Pass head metadata to prerender
4. **Prerender** (`packages/runtime/src/cli/prerender.ts`): Include config and route head in HTML
5. **DOM** (`packages/runtime/src/dom.ts`): Fix style deduplication during hydration

### Route Head Syntax
```typescript
// In route file
export const head = {
  title: "Page Title",
  meta: [
    { name: "description", content: "Page description" },
    { property: "og:title", content: "OG Title" }
  ],
  link: [
    { rel: "canonical", href: "https://example.com/page" }
  ],
  script: [
    { src: "https://example.com/script.js", async: true }
  ]
};
```

### Style Deduplication Strategy
1. During prerender: Capture all styles, include in HTML head
2. During hydration: Check if style ID exists before injecting
3. Compiler: Keep style ID generation consistent

## Out of Scope
- Dynamic head updates (client-side routing)
- Head metadata for SSR routes (focus on PIR first)
- SEO optimization beyond basic meta tags
