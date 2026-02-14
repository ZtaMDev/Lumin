# vite-plugin-lumin

The official Vite plugin for LuminJS. It provides seamless integration for compiling `.lumin` files, Hot Module Replacement (HMR), and professional diagnostic reporting.

## Installation

```bash
npm install -D vite-plugin-lumin
```

## Configuration

Add the plugin to your `vite.config.ts` (or `vite.config.js`):

```typescript
import { defineConfig } from "vite";
import lumin from "vite-plugin-lumin";

export default defineConfig({
  plugins: [
    lumin({
      // Configuration options
    }),
  ],
});
```

### Options

- `title`: Set the default document title.
- `favicon`: Set the path to the favicon.
- `head`: Inject custom meta, link, or script tags into the `<head>`.
- `rootId`: Customize the ID of the root element (default: "app").

## Features

### Fast Transformation

The plugin uses the high-performance `@lumin-js/compiler` to transform `.lumin` files into optimized JavaScript modules on the fly.

### Hot Module Replacement (HMR)

Planed...

### Professional Diagnostics

If a TypeScript error or a syntax issue is detected, the plugin provides a clear, highlighted code frame in your terminal, detailing exactly where the problem is in your source file.

## License

MIT
