/// <reference path="../vinxi.d.ts" />
import { build as viteBuild } from "vite";
import { pathToFileURL } from "url";
function escapeHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
/**
 * Parse directive from .lumix file using proper parsing instead of regex
 * Supported directives:
 * - "use prerender" -> PIR (Progressive Instant Rendering) - default
 * - "use server" -> SSR (Server-Side Rendering)
 * - "use static" -> SSG (Static Site Generation) - future islands architecture
 */
function parseDirectiveFromLumix(lumixContent, routePath) {
    // Extract script section
    const scriptMatch = lumixContent.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    if (!scriptMatch) {
        return "prerender"; // No script section, default to prerender (PIR)
    }
    const scriptContent = scriptMatch[1];
    // Parse the JavaScript content to find directives
    try {
        // Simple tokenizer to find string literals at the beginning
        const lines = scriptContent.split('\n');
        let foundDirective = null;
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
            }
            else if (line.startsWith('"use prerender";') || line.startsWith("'use prerender';")) {
                foundDirective = "prerender";
                directiveCount++;
            }
            else if (line.startsWith('"use static";') || line.startsWith("'use static';")) {
                foundDirective = "static";
                directiveCount++;
            }
            else if (line.startsWith('"use server"') || line.startsWith("'use server'")) {
                foundDirective = "server";
                directiveCount++;
            }
            else if (line.startsWith('"use prerender"') || line.startsWith("'use prerender'")) {
                foundDirective = "prerender";
                directiveCount++;
            }
            else if (line.startsWith('"use static"') || line.startsWith("'use static'")) {
                foundDirective = "static";
                directiveCount++;
            }
            else {
                // If we hit a non-directive, non-comment, non-empty line, stop looking
                // Directives must be at the top
                break;
            }
        }
        // Validate directive count
        if (directiveCount > 1) {
            throw new Error(`Multiple directives found. Only one directive per component is allowed.`);
        }
        return foundDirective || "prerender";
    }
    catch (error) {
        throw new Error(`Failed to parse directive: ${error.message}`);
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
 * Recursively compile a .lumix file and all its dependencies
 */
async function compileWithDependencies(lumixPath, cwd, tempDir, compile, compiled = new Set(), routeSafeName) {
    // Avoid recompiling
    const normalizedPath = path.normalize(lumixPath);
    // Calculate safe name for this file
    let safeName;
    if (routeSafeName) {
        // This is the main route file
        safeName = routeSafeName;
    }
    else {
        // This is a dependency - use path relative to src
        safeName = path.relative(path.join(cwd, 'src'), lumixPath)
            .replace(/\\/g, '-')
            .replace(/\//g, '-')
            .replace(/\.lumix$/, '');
    }
    const compiledPath = path.join(tempDir, `${safeName}.mjs`);
    if (compiled.has(normalizedPath)) {
        return pathToFileURL(compiledPath).href;
    }
    compiled.add(normalizedPath);
    // Compile this file
    const js = await compile({ input: lumixPath, bundle: false, checkTypes: false });
    // Fix runtime imports
    let fixedJs = js.replace(/from ["']lumin-js["']/g, 'from "lumix-js"')
        .replace(/import\s*\*\s*as\s*\w+\s*from\s*["']lumin-js["']/g, (match) => match.replace('lumin-js', 'lumix-js'))
        .replace(/from ["']\/\@fs\/[^"']+\/packages\/runtime\/dist\/index\.js["']/g, 'from "lumix-js"')
        .replace(/import\s+\{([^}]+)\}\s+from\s+["']\/\@fs\/[^"']+\/packages\/runtime\/dist\/index\.js["']/g, 'import {$1} from "lumix-js"')
        .replace(/import\s+\*\s+as\s+(\w+)\s+from\s+["']\/\@fs\/[^"']+\/packages\/runtime\/dist\/index\.js["']/g, 'import * as $1 from "lumix-js"');
    // Find all /src/ imports and compile them recursively
    const importRegex = /(?:from|import)\s+(?:[^'"]*\s+from\s+)?['"]\/src\/([^'"]+\.lumix)['"]/g;
    const imports = [];
    let match;
    while ((match = importRegex.exec(fixedJs)) !== null) {
        imports.push(match[1]);
    }
    // Compile all dependencies first
    for (const importPath of imports) {
        const depPath = path.join(cwd, 'src', importPath);
        if (fs.existsSync(depPath)) {
            await compileWithDependencies(depPath, cwd, tempDir, compile, compiled);
        }
    }
    // Now fix the imports to point to compiled versions
    fixedJs = fixedJs.replace(/from ['"]\/src\/([^'"]+\.lumix)['"]/g, (match, relativePath) => {
        const depPath = path.join(cwd, 'src', relativePath);
        if (fs.existsSync(depPath)) {
            const depSafeName = relativePath.replace(/\\/g, '-').replace(/\//g, '-').replace(/\.lumix$/, '');
            const depCompiledPath = path.join(tempDir, `${depSafeName}.mjs`);
            const depFileUrl = pathToFileURL(depCompiledPath).href;
            return `from '${depFileUrl}'`;
        }
        return match;
    });
    fixedJs = fixedJs.replace(/import\s+([^'"]+)\s+from\s+['"]\/src\/([^'"]+\.lumix)['"]/g, (match, imports, relativePath) => {
        const depPath = path.join(cwd, 'src', relativePath);
        if (fs.existsSync(depPath)) {
            const depSafeName = relativePath.replace(/\\/g, '-').replace(/\//g, '-').replace(/\.lumix$/, '');
            const depCompiledPath = path.join(tempDir, `${depSafeName}.mjs`);
            const depFileUrl = pathToFileURL(depCompiledPath).href;
            return `import ${imports} from '${depFileUrl}'`;
        }
        return match;
    });
    // Write compiled file
    fs.writeFileSync(compiledPath, fixedJs, 'utf8');
    return pathToFileURL(compiledPath).href;
}
/**
 * Generate per-route entry files for code splitting
 * Each route gets its own bundle to avoid shipping unnecessary code
 */
async function generateRouteEntries(cwd, config) {
    const { compile } = await import("@lumix-js/compiler");
    // Read routes
    const routesPath = path.join(cwd, ".lumix", "routes.mjs");
    const routesContent = fs.readFileSync(routesPath, "utf8");
    const routesMatch = routesContent.match(/export const routes = (\[.*\]);/s);
    if (!routesMatch)
        return { staticRoutes: [], serverRoutes: [] };
    const routes = JSON.parse(routesMatch[1]);
    const routeDirectives = {};
    const staticRoutes = [];
    const serverRoutes = [];
    // Setup temp directory
    const tempDir = path.join(cwd, ".lumix", "compiled");
    if (!fs.existsSync(tempDir))
        fs.mkdirSync(tempDir, { recursive: true });
    // Compile each route and categorize by directive
    for (const route of routes) {
        const lumixPath = path.join(cwd, route.file.replace(/^\//, ""));
        if (!fs.existsSync(lumixPath))
            continue;
        try {
            const lumixContent = fs.readFileSync(lumixPath, "utf8");
            let directive = "prerender"; // Default to PIR
            try {
                directive = parseDirectiveFromLumix(lumixContent, route.path);
            }
            catch (error) {
                console.warn(`[lumix] Warning in ${route.path}: Failed to parse directive, using default 'prerender'`);
            }
            routeDirectives[route.path] = directive;
            // Determine the safe name for this route
            const safeName = route.path === "/" ? "index" : route.path.slice(1).replace(/\//g, "-");
            // Compile the route and all its dependencies recursively
            await compileWithDependencies(lumixPath, cwd, tempDir, compile, new Set(), safeName);
            // Get the compiled path
            const tempPath = path.join(tempDir, `${safeName}.mjs`);
            // Extract head metadata from compiled file (now properly exported by compiler)
            let routeHead = null;
            try {
                const compiledUrl = pathToFileURL(tempPath).href;
                const mod = await import(compiledUrl);
                if (mod.head) {
                    routeHead = mod.head;
                    console.log(`[lumix] Route ${route.path}: Found head metadata`);
                }
            }
            catch (e) {
                console.warn(`[lumix] Route ${route.path}: Failed to load head metadata:`, e.message);
            }
            // Generate per-route entry file for client-side hydration with absolute path
            const compiledPathRelative = path.relative(path.join(cwd, ".lumix", "entries"), tempPath).replace(/\\/g, '/');
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
            if (!fs.existsSync(entriesDir))
                fs.mkdirSync(entriesDir, { recursive: true });
            fs.writeFileSync(entryPath, entryContent, "utf8");
            const routeInfo = {
                path: route.path,
                safeName,
                directive,
                entryPath,
                compiledPath: tempPath,
                head: routeHead, // Add head metadata
            };
            // Categorize routes: prerender and static both go to PIR routes for now
            // In the future, static will use islands architecture
            if (directive === "prerender" || directive === "static") {
                staticRoutes.push(routeInfo);
            }
            else {
                serverRoutes.push(routeInfo);
            }
            const displayMode = directive === "server" ? "SSR" : directive === "prerender" ? "PIR" : "SSG (future)";
            console.log(`[lumix] Route ${route.path}: ${displayMode} rendering`);
        }
        catch (e) {
            console.warn(`[lumix] Failed to compile ${route.file}:`, e.message);
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
    const isPir = config.mode === "pir" || config.mode === "ssg"; // Support both for backward compatibility
    if (isPir) {
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
        console.log(pc.dim(`\n  PIR routes: ${staticRoutes.length}, SSR routes: ${serverRoutes.length}\n`));
        // Build client bundles (for PIR routes)
        if (staticRoutes.length > 0) {
            console.log(pc.dim("  Building PIR client bundles...\n"));
            const clientEntries = {};
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
            console.log(pc.green("  ✓ PIR client bundles built\n"));
        }
        // Build server bundles (for SSR routes)
        if (serverRoutes.length > 0) {
            console.log(pc.dim("  Building SSR server bundles...\n"));
            const serverEntries = {};
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
            console.log(pc.green("  ✓ SSR server bundles built\n"));
            // Also build client bundles for SSR routes (for hydration)
            console.log(pc.dim("  Building SSR client bundles (hydration)...\n"));
            const ssrClientEntries = {};
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
        // Prerender PIR routes
        if (staticRoutes.length > 0) {
            console.log(pc.dim("  Prerendering PIR pages...\n"));
            // Try to read the manifest (optional)
            const manifestPath = path.join(cwd, "dist/client/.vite/manifest.json");
            let manifest = {};
            if (fs.existsSync(manifestPath)) {
                try {
                    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
                    console.log(pc.dim("  Using Vite manifest for script resolution"));
                }
                catch (e) {
                    console.warn(pc.yellow("  Warning: Failed to read manifest, will use filesystem fallback"));
                }
            }
            else {
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
            console.log(pc.green("  ✓ PIR pages prerendered\n"));
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
        const htmlEmitPlugin = !hasIndex
            ? {
                name: "lumix-html-index-emitter",
                generateBundle(_opts, bundle) {
                    const chunks = Object.values(bundle);
                    const entryChunk = chunks.find((c) => c.type === "chunk" && c.isEntry && c.facadeModuleId?.endsWith("main.ts")) ||
                        chunks.find((c) => c.type === "chunk" && c.isEntry);
                    const jsFile = entryChunk?.fileName;
                    if (!jsFile)
                        return;
                    // Build head section from config
                    const headParts = [];
                    // Title
                    if (config?.title) {
                        headParts.push(`  <title>${escapeHtml(config.title)}</title>`);
                    }
                    // Favicon
                    if (config?.favicon) {
                        headParts.push(`  <link rel="icon" href="${escapeHtml(config.favicon)}">`);
                    }
                    // Meta tags
                    if (config?.head?.meta) {
                        for (const meta of config.head.meta) {
                            const attrs = Object.entries(meta)
                                .map(([key, value]) => `${key}="${escapeHtml(String(value))}"`)
                                .join(' ');
                            headParts.push(`  <meta ${attrs}>`);
                        }
                    }
                    // Link tags
                    if (config?.head?.link) {
                        for (const link of config.head.link) {
                            const attrs = Object.entries(link)
                                .map(([key, value]) => `${key}="${escapeHtml(String(value))}"`)
                                .join(' ');
                            headParts.push(`  <link ${attrs}>`);
                        }
                    }
                    // Script tags (before main script)
                    if (config?.head?.script) {
                        for (const script of config.head.script) {
                            const attrs = Object.entries(script)
                                .filter(([key]) => key !== 'innerHTML')
                                .map(([key, value]) => `${key}="${escapeHtml(String(value))}"`)
                                .join(' ');
                            const innerHTML = script.innerHTML || '';
                            headParts.push(`  <script ${attrs}>${innerHTML}</script>`);
                        }
                    }
                    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
${headParts.join('\n')}
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
                ...(htmlEmitPlugin ? [htmlEmitPlugin] : []),
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
    }
    catch (e) {
        console.error(pc.red(pc.bold("\n  Build failed!")));
        console.error(pc.red(`  ${e.message}\n`));
        process.exit(1);
    }
}
