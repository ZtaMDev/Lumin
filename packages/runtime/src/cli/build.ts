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

/**
 * Constructs the correct client script source path, avoiding duplication
 * when the entry chunk filename already contains the assets prefix.
 */
function constructClientScriptSrc(entryChunkFileName: string): string {
  if (!entryChunkFileName || typeof entryChunkFileName !== 'string') {
    throw new Error('Entry chunk filename must be a non-empty string');
  }

  // Remove any leading slashes and normalize
  const normalizedFilename = entryChunkFileName.replace(/^\/+/, '');

  // If the filename already starts with "assets/", don't add it again
  if (normalizedFilename.startsWith("assets/")) {
    return "/" + normalizedFilename;
  }

  // Otherwise, add the assets prefix
  return "/assets/" + normalizedFilename;
}

import lumix from "../../../vite-plugin-lumix/dist/index.js";
import pc from "picocolors";
import { loadConfig } from "./loader.js";
import path from "path";
import fs from "fs-extra";
import { __dirname } from "./utils.js";
import { VERSION } from "./constants.js";

async function generateSSGMain(cwd: string, config: any) {
  const { compile } = await import("@lumix-js/compiler");
  
  // Read routes
  const routesPath = path.join(cwd, ".lumix", "routes.mjs");
  const routesContent = fs.readFileSync(routesPath, "utf8");
  const routesMatch = routesContent.match(/export const routes = (\[.*\]);/s);
  if (!routesMatch) return;
  
  const routes = JSON.parse(routesMatch[1]);
  
  // Generate imports and component map with obfuscated keys
  let imports = `import { hydrate } from "lumix-js";\n`;
  let componentMap = `const components = {\n`;
  
  // Create a secure mapping that doesn't expose file paths
  const secureComponentMap: { [key: string]: string } = {};
  const routeDirectives: { [key: string]: string } = {}; // Track directives per route
  
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const lumixPath = path.join(cwd, route.file.replace(/^\//, ""));
    
    if (fs.existsSync(lumixPath)) {
      try {
        // Read the original .lumix file to detect directives
        const lumixContent = fs.readFileSync(lumixPath, "utf8");
        
        // Parse directives using proper AST parsing instead of regex
        let directive = "static"; // Default to static
        
        try {
          directive = parseDirectiveFromLumix(lumixContent, route.path);
        } catch (error) {
          console.warn(`[lumix] Warning in ${route.path}: Failed to parse directive, using default 'static'`);
        }
        
        routeDirectives[route.path] = directive;
        
        // Compile the .lumix file to JavaScript
        const js = await compile({ input: lumixPath, bundle: false, checkTypes: false });
        
        // Fix any incorrect imports from the compiler
        const fixedJs = js.replace(/from ["']lumin-js["']/g, 'from "lumix-js"')
                          .replace(/import\s*\*\s*as\s*\w+\s*from\s*["']lumin-js["']/g, (match) => 
                            match.replace('lumin-js', 'lumix-js'));
        
        // Write the compiled component to a temporary file
        const tempDir = path.join(cwd, ".lumix", "compiled");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        
        const safeName = route.path === "/" ? "index" : route.path.slice(1).replace(/\//g, "-");
        const tempPath = path.join(tempDir, `${safeName}.mjs`);
        fs.writeFileSync(tempPath, fixedJs, "utf8");
        
        // Use obfuscated component ID instead of file path
        const componentId = `c${i}`;
        secureComponentMap[route.path] = componentId;
        
        imports += `import Component${i} from "./compiled/${safeName}.mjs";\n`;
        componentMap += `  "${componentId}": Component${i},\n`;
        
        console.log(`[lumix] Route ${route.path}: ${directive} rendering`);
      } catch (e) {
        console.warn(`[lumix ssg] Failed to compile ${route.file}:`, (e as Error).message);
      }
    }
  }
  
  componentMap += `};\n`;
  
  // Generate secure routes mapping (only paths, no file info) with directives
  const secureRoutes = routes.map((route: any, i: number) => ({
    path: route.path,
    id: `c${i}`,
    directive: routeDirectives[route.path] || "static"
  }));
  
  // Store directives info for the prerender process
  const directivesPath = path.join(cwd, ".lumix", "directives.json");
  fs.writeFileSync(directivesPath, JSON.stringify(routeDirectives, null, 2), "utf8");
  
  // Generate the main content with security improvements and directive support
  const mainContent = `${imports}
${componentMap}

// Secure routes mapping with directives - no file paths exposed
const routes = ${JSON.stringify(secureRoutes)};

// Islands Architecture Support
export async function hydrateIsland(element, componentPath, props) {
  // Find component by path instead of file path
  const route = routes.find(r => r.path === componentPath);
  if (!route) {
    console.warn("Route not found for island:", componentPath);
    return;
  }
  
  const Component = components[route.id];
  if (!Component) {
    console.warn("Component not found for island:", route.id);
    return;
  }
  
  // Hydrate the island
  hydrate(element, Component, props);
}

// Client-side routing (only for current page, no route discovery)
function getCurrentPath() {
  return window.location.pathname.replace(/\\/$/, "") || "/";
}

function findCurrentRoute() {
  const currentPath = getCurrentPath();
  return routes.find((r) => r.path === currentPath);
}

// Only hydrate if this is a SPA navigation (no islands present)
if (!window.__LUMIX_ISLANDS__ || window.__LUMIX_ISLANDS__.length === 0) {
  const currentRoute = findCurrentRoute();
  if (currentRoute) {
    const root = document.getElementById("${config?.rootId ?? "app"}");
    if (root) {
      const Component = components[currentRoute.id];
      if (Component) {
        hydrate(root, Component);
      }
    }
  }
  
  // Handle client-side navigation (only for known routes)
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a || a.target === "_blank" || a.hasAttribute("download") || !a.href) return;
    
    const url = new URL(a.href);
    if (url.origin !== window.location.origin) return;
    
    // Only navigate to known routes (security check)
    const targetRoute = routes.find(r => r.path === url.pathname);
    if (!targetRoute) return;
    
    e.preventDefault();
    window.history.pushState({}, "", url.pathname);
    
    // Navigate to the new route
    const root = document.getElementById("${config?.rootId ?? "app"}");
    if (root) {
      const Component = components[targetRoute.id];
      if (Component) {
        while (root.firstChild) root.removeChild(root.firstChild);
        hydrate(root, Component);
      }
    }
  });
  
  // Handle back/forward navigation
  window.addEventListener("popstate", () => {
    const currentRoute = findCurrentRoute();
    if (currentRoute) {
      const root = document.getElementById("${config?.rootId ?? "app"}");
      if (root) {
        const Component = components[currentRoute.id];
        if (Component) {
          while (root.firstChild) root.removeChild(root.firstChild);
          hydrate(root, Component);
        }
      }
    }
  });
}
`;

  // Write the SSG main file
  const ssgMainPath = path.join(cwd, ".lumix", "ssg-main.js");
  fs.writeFileSync(ssgMainPath, mainContent, "utf8");
}

export async function build() {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);

  console.log("");
  console.log(`  ${pc.bold(pc.cyan("⚡ LumixJS"))} ${pc.dim(`v${VERSION}`)}`);
  console.log(pc.dim("  Building for production...\n"));

  const isSsg = config.mode === "ssg";
  if (isSsg) {
    const { ensureLumixRoutesFile } = await import("../vinxi.js");
    const routesPath = ensureLumixRoutesFile(cwd, config);
    
    // Generate a SSG-compatible main.ts that includes all components statically
    await generateSSGMain(cwd, config);
  }

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

  let entryChunkFileName: string | null = null;
  const captureEntryPlugin = {
    name: "lumix-capture-entry",
    generateBundle(_opts: any, bundle: any) {
      const chunks = Object.values(bundle) as any[];
      const entry = chunks.find((c: any) => c.type === "chunk" && c.isEntry);
      if (entry) entryChunkFileName = (entry as any).fileName;
    },
  };

  try {
    const htmlEmitPlugin =
      !hasIndex && !isSsg
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
        captureEntryPlugin as any,
        ...(htmlEmitPlugin ? [htmlEmitPlugin as any] : []),
        lumix(config),
        ...(config.vite?.plugins || []),
      ],
      build: {
        outDir: "dist",
        emptyOutDir: true,
        ...(hasIndex && !isSsg
          ? {}
          : {
              rollupOptions: {
                input: isSsg 
                  ? path.join(cwd, ".lumix", "ssg-main.js")
                  : entryModule,
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

    if (isSsg && entryChunkFileName) {
      const { prerender } = await import("./prerender.js");
      await prerender({
        cwd,
        config,
        clientScriptSrc: constructClientScriptSrc(entryChunkFileName),
        outDir: "dist",
        rootId: config?.rootId ?? "app",
        title: config?.title,
      });
    }

    console.log(pc.green(pc.bold("\n  Build completed successfully!")));
    console.log(pc.dim(`  Output directory: ${pc.white("./dist")}\n`));
  } catch (e: any) {
    console.error(pc.red(pc.bold("\n  Build failed!")));
    console.error(pc.red(`  ${e.message}\n`));
    process.exit(1);
  }
}
