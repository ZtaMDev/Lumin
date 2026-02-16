# Config Head Metadata - Tasks

## Phase 1: Fix Style Deduplication

- [ ] 1. Modify renderToString to capture style IDs
  - [ ] 1.1 Track style IDs during rendering
  - [ ] 1.2 Return style IDs with content in RenderToStringResult
  - [ ] 1.3 Update RenderToStringResult interface

- [ ] 2. Update prerender to include style IDs
  - [ ] 2.1 Read style IDs from renderToString result
  - [ ] 2.2 Generate style tags with IDs in HTML
  - [ ] 2.3 Test that styles have IDs in dist/client/*.html

- [ ] 3. Verify hydration skips existing styles
  - [ ] 3.1 Build and preview full-stack-test
  - [ ] 3.2 Check browser DevTools for duplicate styles
  - [ ] 3.3 Confirm getElementById check works

## Phase 2: Config Head Metadata

- [ ] 4. Update prerender to use config head
  - [ ] 4.1 Accept config in PrerenderOptions
  - [ ] 4.2 Generate meta tags from config.head.meta
  - [ ] 4.3 Generate link tags from config.head.link
  - [ ] 4.4 Generate script tags from config.head.script
  - [ ] 4.5 Include favicon link if config.favicon exists
  - [ ] 4.6 Use config.title as default title

- [ ] 5. Test config head in full-stack-test
  - [ ] 5.1 Build project
  - [ ] 5.2 Verify meta description in index.html
  - [ ] 5.3 Verify title in index.html
  - [ ] 5.4 Test in browser

## Phase 3: Per-Route Head Configuration

- [ ] 6. Add route head types to config
  - [ ] 6.1 Create RouteHeadConfig interface
  - [ ] 6.2 Export from config.ts

- [ ] 7. Update compiler to extract head metadata
  - [ ] 7.1 Parse `export const head` from route files
  - [ ] 7.2 Serialize head object to JSON
  - [ ] 7.3 Include as comment: `// __LUMIX_HEAD__: {...}`
  - [ ] 7.4 Rebuild compiler binary

- [ ] 8. Update build to collect head metadata
  - [ ] 8.1 After compiling route, read compiled file
  - [ ] 8.2 Extract __LUMIX_HEAD__ comment
  - [ ] 8.3 Parse JSON and add to RouteInfo
  - [ ] 8.4 Pass head to prerender

- [ ] 9. Update prerender to merge head configs
  - [ ] 9.1 Create mergeHead function
  - [ ] 9.2 Merge config head + route head
  - [ ] 9.3 Handle title override
  - [ ] 9.4 Merge meta/link/script arrays
  - [ ] 9.5 Use merged head in HTML generation

- [ ] 10. Add route head to test routes
  - [ ] 10.1 Add head export to index.lumix
  - [ ] 10.2 Add head export to about.lumix
  - [ ] 10.3 Test different titles per route
  - [ ] 10.4 Test route-specific meta tags

- [ ] 11. End-to-end testing
  - [ ] 11.1 Build full-stack-test
  - [ ] 11.2 Verify index.html has correct head
  - [ ] 11.3 Verify about/index.html has correct head
  - [ ] 11.4 Check no duplicate styles
  - [ ] 11.5 Test in browser preview

## Phase 4: Template Updates

- [ ] 12. Update full-stack-app template
  - [ ] 12.1 Add comprehensive head config
  - [ ] 12.2 Add route head examples
  - [ ] 12.3 Update template README

## Notes
- Start with Phase 1 (style deduplication) as it's the quickest fix
- Phase 2 can be done independently
- Phase 3 requires compiler changes (most complex)
- Test thoroughly after each phase
