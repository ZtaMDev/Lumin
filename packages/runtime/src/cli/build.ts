/// <reference path="../vinxi.d.ts" />
import { build as viteBuild } from "vite";
/**
 * Parse directive from .lumix file using proper parsing instead of regex
 */
function parseDirectiveFromLumix(lumixContent: string, routePath: string): string {
  // Extract script section
  const scriptMatch = lumixContent.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    return "static"; // No script section, default to static
  }
  
  const scriptContent = scriptMatch[1];
  
  // Parse the JavaScript content to find directives
  try {
    // Simple tokenizer to find string literals at the beginning
    const lines = scriptContent.split('\n');
    let foundDirective: string | null = null;
    let directiveCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('//') || line.startsWith('/*')) {
        continue;
      }
      
      // Check if this line contains a directive
      if (line.startsWith('"use server";') || line.startsWith("'use server';")) {
        foundDirective = "server";
        directiveCount++;
      } else if (line.startsWith('"use static";') || line.startsWith("'use static';")) {
        foundDirective = "static";
        directiveCount++;
      } else if (line.startsWith('"use server"') || line.startsWith("'use server'")) {
        foundDirective = "server";
        directiveCount++;
      } else if (line.startsWith('"use static"') || line.startsWith("'use static'")) {
        foundDirective = "static";
        directiveCount++;
      } else {
        // If we hit a non-directive, non-comment, non-empty line, stop looking
        // Directives must be at the top
        break;
      }
    }
    
    // Validate directive count
    if (directiveCount > 1) {
      throw new Error(`Multiple directives found. Only one directive per component is allowed.`);
    }
    
    return foundDirective || "static";
    
  } catch (error) {
    throw new Error(`Failed to parse directive: ${(error as Error).message}`);
  }
}

import lumix from "../../../vite-plugin-lumix/dist/index.js";
import pc from "picocolors";
import { loadConfig } from "./loader.js";
import path from "path";
import fs from "fs-extra";
import { __dirname } from "./utils.js";
import { VERSION } from "./constants.js";

/**
 * Generate per-route entry files for code splitting
 * Each route gets its own bundle to avoid shipping unnecessary code
 */
async function generateRouteEntries(cwd: string, config: any) {
  const { compile } = await import("@lumix-js/compiler");
  
  // Read routes
  const routesPath = path.join(cwd, ".lumix", "routes.mjs");
  const routesContent = fs.readFileSync(routesPath, "utf8");
  const routesMatch = routesContent.match(/export const routes = (\[.*\]);/s);
  if (!routesMatch) return { staticRoutes: [], serverRoutes: [] };
  
  const routes = JSON.parse(routesMatch[1]);
  const routeDirectives: { [key: string]: string } = {};
  const staticRoutes: any[] = [];
  const serverRoutes: any[] = [];
  
  // Compile each route and categorize by directive
  for (const route of routes) {
    const lumixPath = path.join(cwd, route.file.replace(/^\//, ""));
    
    if (!fs.existsSync(lumixPath)) continue;
    
    try {
      const lumixContent = fs.readFileSync(lumixPath, "utf8");
      let directive = "static";
      
      try {
        directive = parseDirectiveFromLumix(lumixContent, route.path);
      } catch (error) {
        console.warn(`[lumix] Warning in ${route.path}: Failed to parse directive, using default 'static'`);
      }
      
      routeDirectives[route.path] = directive;
      
      // Compile the .lumix file
      const js = await compile({ input: lumixPath, bundle: false, checkTypes: false });
      const fixedJs = js.replace(/from ["']lumin-js["']/g, 'from "lumix-js"')
                        .replace(/import\s*\*\s*as\s*\w+\s*from\s*["']lumin-js["']/g, (match) => 
                          match.replace('lumin-js', 'lumix-js'));
      
      // Write compiled component
      const tempDir = path.join(cwd, ".lumix", "compiled");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      
      const safeName = route.path === "/" ? "index" : route.path.slice(1).replace(/\//g, "-");
      const tempPath = path.join(tempDir, `${safeName}.mjs`);
      fs.writeFileSync(tempPath, fixedJs, "utf8");
      
      // Generate per-route entry file for client-side hydration with absolute path
      const compiledPathRelative = path.relative(
        path.join(cwd, ".lumix", "entries"),
        tempPath
      ).replace(/\\/g, '/');
      
      const entryContent = `import { hydrate } from "lumix-js";
import Component from "../compiled/${safeName}.mjs";

// Hydrate this specific route
const root = document.getElementById("${config?.rootId ?? "app"}");
if (root) {
  hydrate(root, Component);
}

// Export for dynamic imports
export default Component;
`;
      
      const entryPath = path.join(cwd, ".lumix", "entries", `${safeName}.js`);
      const entriesDir = path.join(cwd, ".lumix", "entries");
      if (!fs.existsSync(entriesDir)) fs.mkdirSync(entriesDir, { recursive: true });
      fs.writeFileSync(entryPath, entryContent, "utf8");
      
      const routeInfo = {
        path: route.path,
        safeName,
        directive,
        entryPath,
        compiledPath: tempPath
      };
      
      if (directive === "static") {
        staticRoutes.push(routeInfo);
      } else {
        serverRoutes.push(routeInfo);
      }
      
      console.log(`[lumix] Route ${route.path}: ${directive} rendering`);
    } catch (e) {
      console.warn(`[lumix] Failed to compile ${route.file}:`, (e as Error).message);
    }
  }
  
  // Store directives info
  const directivesPath = path.join(cwd, ".lumix", "directives.json");
  fs.writeFileSync(directivesPath, JSON.stringify(routeDirectives, null, 2), "utf8");
  
  return { staticRoutes, serverRoutes, routeDirectives };
}

export async function build() {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  console.log("");
  console.log(`  ${pc.bold(pc.cyan("⚡ LumixJS"))} ${pc.dim(`v${VERSION}`)}`);
  console.log(pc.dim("  Building for production...\n"));

  const isSsg = config.mode === "ssg";
  
  if (isSsg) {
    // Clean dist directory before build
    const distPath = path.join(cwd, "dist");
    if (fs.existsSync(distPath)) {
      console.log(pc.dim("  Cleaning dist directory...\n"));
      fs.removeSync(distPath);
    }
    
    const { ensureLumixRoutesFile } = await import("../vinxi.js");
    ensureLumixRoutesFile(cwd, config);
    
    // Generate per-route entries with code splitting
    const { staticRoutes, serverRoutes, routeDirectives } = await generateRouteEntries(cwd, config);
    
    console.log(pc.dim(`\n  Static routes: ${staticRoutes.length}, Server routes: ${serverRoutes.length}\n`));
    
    // Build client bundles (only for static routes)
    if (staticRoutes.length > 0) {
      console.log(pc.dim("  Building client bundles...\n"));
      
      const clientEntries: { [key: string]: string } = {};
      for (const route of staticRoutes) {
        clientEntries[route.safeName] = route.entryPath;
      }
      
      await viteBuild({
        root: cwd,
        base: "/",
        plugins: [
          lumix(config),
          ...(config.vite?.plugins || []),
        ],
        build: {
          outDir: "dist/client",
          emptyOutDir: true,
          manifest: true, // Generate manifest for prerendering
          rollupOptions: {
            input: clientEntries,
            output: {
              entryFileNames: 'assets/[name]-[hash].js',
              chunkFileNames: 'assets/[name]-[hash].js',
              assetFileNames: 'assets/[name]-[hash][extname]'
            }
          },
          ...config.vite?.build,
        },
        resolve: {
          alias: {
            "lumix-js": path.resolve(__dirname, "../index.js"),
            ...config.vite?.resolve?.alias,
          },
        },
        ...config.vite,
      });
      
      console.log(pc.green("  ✓ Client bundles built\n"));
    }
    
    // Build server bundles (only for server routes)
    if (serverRoutes.length > 0) {
      console.log(pc.dim("  Building server bundles...\n"));
      
      const serverEntries: { [key: string]: string } = {};
      for (const route of serverRoutes) {
        serverEntries[route.safeName] = route.entryPath;
      }
      
      await viteBuild({
        root: cwd,
        base: "/",
        plugins: [
          lumix(config),
          ...(config.vite?.plugins || []),
        ],
        build: {
          outDir: "dist/server",
          emptyOutDir: true,
          ssr: true,
          manifest: true, // Generate manifest for server bundles too
          rollupOptions: {
            input: serverEntries,
            output: {
              entryFileNames: '[name].js',
              chunkFileNames: '[name]-[hash].js',
              format: 'esm'
            }
          },
          ...config.vite?.build,
        },
        resolve: {
          alias: {
            "lumix-js": path.resolve(__dirname, "../index.js"),
            ...config.vite?.resolve?.alias,
          },
        },
        ...config.vite,
      });
      
      console.log(pc.green("  ✓ Server bundles built\n"));
      
      // Also build client bundles for SSR routes (for hydration)
      console.log(pc.dim("  Building client bundles for SSR routes...\n"));
      
      const ssrClientEntries: { [key: string]: string } = {};
      for (const route of serverRoutes) {
        ssrClientEntries[`ssr-${route.safeName}`] = route.entryPath;
      }
      
      await viteBuild({
        root: cwd,
        base: "/",
        plugins: [
          lumix(config),
          ...(config.vite?.plugins || []),
        ],
        build: {
          outDir: "dist/client",
          emptyOutDir: false, // Don't empty, we already have static routes
          manifest: true,
          rollupOptions: {
            input: ssrClientEntries,
            output: {
              entryFileNames: 'assets/[name]-[hash].js',
              chunkFileNames: 'assets/[name]-[hash].js',
              assetFileNames: 'assets/[name]-[hash][extname]'
            }
          },
          ...config.vite?.build,
        },
        resolve: {
          alias: {
            "lumix-js": path.resolve(__dirname, "../index.js"),
            ...config.vite?.resolve?.alias,
          },
        },
        ...config.vite,
      });
      
      console.log(pc.green("  ✓ SSR client bundles built\n"));
    }
    
    // Prerender static routes
    if (staticRoutes.length > 0) {
      console.log(pc.dim("  Prerendering static pages...\n"));
      
      // Try to read the manifest (optional)
      const manifestPath = path.join(cwd, "dist/client/.vite/manifest.json");
      let manifest: any = {};
      if (fs.existsSync(manifestPath)) {
        try {
          manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
          console.log(pc.dim("  Using Vite manifest for script resolution"));
        } catch (e) {
          console.warn(pc.yellow("  Warning: Failed to read manifest, will use filesystem fallback"));
        }
      } else {
        console.log(pc.dim("  No manifest found, using filesystem for script resolution"));
      }
      
      const { prerender } = await import("./prerender.js");
      await prerender({
        cwd,
        config,
        staticRoutes,
        manifest,
        outDir: "dist/client",
        rootId: config?.rootId ?? "app",
        title: config?.title,
      });
      
      console.log(pc.green("  ✓ Static pages prerendered\n"));
    }
    
    console.log(pc.green(pc.bold("  Build completed successfully!")));
    console.log(pc.dim(`  Client output: ${pc.white("./dist/client")}`));
    if (serverRoutes.length > 0) {
      console.log(pc.dim(`  Server output: ${pc.white("./dist/server")}`));
    }
    console.log("");
    
    return;
  }

  // Non-SSG mode (original behavior)
  const indexPath = path.join(cwd, "index.html");
  const hasIndex = fs.existsSync(indexPath);
  const srcDir = config?.srcDir ?? "src";
  const mainTs = path.join(cwd, srcDir, "main.ts");
  const mainJs = path.join(cwd, srcDir, "main.js");
  const entryModule = fs.existsSync(path.join(cwd, "main.ts"))
    ? path.join(cwd, "main.ts")
    : fs.existsSync(path.join(cwd, "main.js"))
      ? path.join(cwd, "main.js")
      : fs.existsSync(mainTs)
        ? mainTs
        : mainJs;

  try {
    const htmlEmitPlugin =
      !hasIndex
        ? {
            name: "lumix-html-index-emitter",
            generateBundle(this: any, _opts: any, bundle: any) {
              const chunks = Object.values(bundle) as any[];
              const entryChunk =
                chunks.find(
                  (c: any) => c.type === "chunk" && c.isEntry && c.facadeModuleId?.endsWith("main.ts"),
                ) ||
                chunks.find((c: any) => c.type === "chunk" && c.isEntry);
              const jsFile = (entryChunk as any)?.fileName;
              if (!jsFile) return;
              const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <div id="${config?.rootId || "app"}"></div>
  <script type="module" src="/${jsFile}"></script>
</body>
</html>`;
              this.emitFile({ type: "asset", fileName: "index.html", source: html });
            },
          }
        : null;

    await viteBuild({
      root: cwd,
      base: "/",
      plugins: [
        ...(htmlEmitPlugin ? [htmlEmitPlugin as any] : []),
        lumix(config),
        ...(config.vite?.plugins || []),
      ],
      build: {
        outDir: "dist",
        emptyOutDir: true,
        ...(hasIndex
          ? {}
          : {
              rollupOptions: {
                input: entryModule,
              },
            }),
        ...config.vite?.build,
      },
      resolve: {
        alias: {
          "lumix-js": path.resolve(__dirname, "../index.js"),
          ...config.vite?.resolve?.alias,
        },
      },
      ...config.vite,
    });

    console.log(pc.green(pc.bold("\n  Build completed successfully!")));
    console.log(pc.dim(`  Output directory: ${pc.white("./dist")}\n`));
  } catch (e: any) {
    console.error(pc.red(pc.bold("\n  Build failed!")));
    console.error(pc.red(`  ${e.message}\n`));
    process.exit(1);
  }
}
