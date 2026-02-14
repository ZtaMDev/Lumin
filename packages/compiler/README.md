# @luminjs/compiler

The LuminJS compiler is a high-performance, native toolchain built with Rust. It provides robust parsing, semantic TypeScript validation, and optimized code generation for LuminJS components.

## Technical Architecture

The compiler consists of a Rust core (`luminc`) and a Node.js wrapper that provides a seamless integration with the JavaScript ecosystem.

### Pipeline

1. **Source Discovery**: Paths are resolved and normalized for cross-platform compatibility.
2. **Robust Parsing**: A state-aware Rust parser extracts script blocks, styles, and template nodes. It respects JavaScript string literals and comments, ensuring that nested tags (e.g., `const x = "</script>"`) do not break the extraction process.
3. **Semantic Validation**:
   - The compiler generates a "Virtual TypeScript" representation of the component.
   - It utilizes the formal `typescript` API to perform deep semantic analysis.
   - Diagnostics are mapped back to the original source using a marker-based system, ensuring precise line and column numbers.
4. **Code Generation**: Optimized JavaScript modules are produced, containing instructions for both server-side rendering and client-side hydration.

## CLI Usage

The compiler includes the `luminc` binary for direct use in build pipelines.

```bash
# Basic compilation to JSON output (for integration)
luminc build App.lumin --format json

# Production build with no emit (dry run)
luminc build App.lumin --no-emit
```

## Node.js API

The package provides a high-level `compile` function for use in Node.js scripts or Vite plugins.

```typescript
import { compile } from "@luminjs/compiler";

const code = await compile({
  input: "src/App.lumin",
  bundle: false,
  checkTypes: true,
});
```

### Options

- `input`: Path to the `.lumin` file.
- `bundle`: Whether to bundle dependencies (default: true).
- `checkTypes`: Enable/disable semantic TypeScript validation (default: true).

## Precise Error Mapping

Thanks to a unique marker-based source mapping system, errors in both the `<script>` block and template expressions are reported at the exact line and column where they appear in your source code.

## License

MIT
