import pc from "picocolors";
import fs from "fs-extra";
import path from "path";
import { spawnSync } from "child_process";
import { VERSION } from "./constants.js";
const INTEGRATIONS = {
    tailwind: {
        deps: [],
        devDeps: ["tailwindcss", "postcss", "autoprefixer"],
        async run(cwd) {
            const srcDir = "src";
            const stylesPath = path.join(cwd, srcDir, "styles.css");
            await fs.ensureDir(path.join(cwd, srcDir));
            if (!(await fs.pathExists(stylesPath))) {
                await fs.writeFile(stylesPath, `@tailwind base;
@tailwind components;
@tailwind utilities;
`, "utf8");
            }
            const tailwindConfig = path.join(cwd, "tailwind.config.js");
            if (!(await fs.pathExists(tailwindConfig))) {
                await fs.writeFile(tailwindConfig, `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./${srcDir}/**/*.{lumix,ts,tsx,js,jsx}"],
  theme: { extend: {} },
  plugins: [],
};
`, "utf8");
            }
            const postcssConfig = path.join(cwd, "postcss.config.js");
            if (!(await fs.pathExists(postcssConfig))) {
                await fs.writeFile(postcssConfig, `export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
`, "utf8");
            }
            const mainTs = path.join(cwd, "main.ts");
            const mainJs = path.join(cwd, "main.js");
            const mainPath = (await fs.pathExists(mainTs)) ? mainTs : mainJs;
            if (await fs.pathExists(mainPath)) {
                let main = await fs.readFile(mainPath, "utf8");
                const importStyles = `import "./${srcDir}/styles.css";`;
                if (!main.includes("styles.css")) {
                    main = importStyles + "\n" + main;
                    await fs.writeFile(mainPath, main, "utf8");
                }
            }
        },
    },
};
export async function add(integration) {
    const cwd = process.cwd();
    const meta = INTEGRATIONS[integration];
    if (!meta) {
        console.log(pc.red(`\n  Unknown integration "${integration}". Available: ${Object.keys(INTEGRATIONS).join(", ")}.\n`));
        process.exit(1);
    }
    console.log("");
    console.log(`  ${pc.bold(pc.cyan("⚡ LumixJS"))} ${pc.dim(`v${VERSION}`)}`);
    console.log(pc.dim(`  Adding ${integration}...\n`));
    const pkgPath = path.join(cwd, "package.json");
    if (!(await fs.pathExists(pkgPath))) {
        console.log(pc.red("  No package.json found. Run this from the project root.\n"));
        process.exit(1);
    }
    const pkg = await fs.readJson(pkgPath);
    const toInstall = [...meta.deps, ...meta.devDeps].filter((d) => !pkg.dependencies?.[d] && !pkg.devDependencies?.[d]);
    if (toInstall.length > 0) {
        const pm = detectPackageManager();
        const args = pm === "npm" ? ["install", "--save-dev", ...toInstall] : ["add", "-d", ...toInstall];
        console.log(pc.dim(`  Installing ${toInstall.join(", ")}...`));
        const res = spawnSync(pm, args, { cwd, stdio: "inherit" });
        if (res.status !== 0) {
            console.log(pc.red("\n  Install failed.\n"));
            process.exit(1);
        }
    }
    await meta.run(cwd);
    console.log(pc.green(pc.bold(`\n  ${integration} added successfully.`)));
    console.log(pc.dim("  Import your styles in main.ts/js if not already done.\n"));
}
function detectPackageManager() {
    if (fs.existsSync(path.join(process.cwd(), "bun.lockb")))
        return "bun";
    if (fs.existsSync(path.join(process.cwd(), "pnpm-lock.yaml")))
        return "pnpm";
    return "npm";
}
