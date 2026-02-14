# Pre-compiled Compiler Binaries

This directory contains pre-compiled `luminc` binaries for each platform.

## Structure

```
bin/
├── luminc-linux-x64       # Linux x86_64
├── luminc-linux-arm64     # Linux ARM64
├── luminc-darwin-x64      # macOS Intel
├── luminc-darwin-arm64    # macOS Apple Silicon
└── luminc-win32-x64.exe   # Windows x86_64
```

## How to populate

1. Push a tag (e.g. `git tag v0.1.0 && git push --tags`) or manually trigger the "Build Compiler Binaries" workflow in GitHub Actions
2. Download the artifacts from the workflow run or GitHub Release
3. Extract each binary and place it here with the correct filename
4. Commit and publish to npm

The `@luminjs/compiler` package will auto-detect the platform and use the correct binary.
If no pre-compiled binary exists for the current platform, it falls back to `cargo run` (requires Rust).
