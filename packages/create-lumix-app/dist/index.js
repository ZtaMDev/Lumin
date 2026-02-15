import prompts from "prompts";
import pc from "picocolors";
import fs from "fs-extra";
import path from "path";
import { createRequire } from "module";
import { spawnSync } from "child_process";
const VERSION = "0.1.4";
function isPackageManagerAvailable(pm) {
    try {
        let res = spawnSync(pm, ["--version"], { stdio: "ignore" });
        if (res.error) {
            const err = res.error;
            if (process.platform === "win32" && err.code === "ENOENT" && (pm === "npm" || pm === "pnpm")) {
                res = spawnSync("cmd", ["/c", pm, "--version"], { stdio: "ignore" });
            }
        }
        return res.status === 0;
    }
    catch {
        return false;
    }
}
function detectPackageManager() {
    if (isPackageManagerAvailable("bun"))
        return "bun";
    if (isPackageManagerAvailable("pnpm"))
        return "pnpm";
    return "npm";
}
function getInstalledPackageManagers() {
    // Always show the main options; availability will be handled at install time.
    return ["bun", "pnpm", "npm"];
}
function runDevCommand(pm) {
    if (pm === "npm")
        return "npm run dev";
    return `${pm} run dev`;
}
function installCommand(pm) {
    if (pm === "npm")
        return "npm install";
    return `${pm} install`;
}
function runInstall(pm, cwd) {
    const cmd = pm;
    const args = ["install"];
    let res = spawnSync(cmd, args, { cwd, encoding: "utf8" });
    if (res.error) {
        // On Windows, npm/pnpm may be available through cmd resolution even if not directly spawnable.
        const err = res.error;
        if (process.platform === "win32" && err.code === "ENOENT" && (pm === "npm" || pm === "pnpm")) {
            res = spawnSync("cmd", ["/c", pm, ...args], { cwd, encoding: "utf8" });
        }
        else {
            throw res.error;
        }
    }
    if (res.signal === "SIGINT") {
        const err = new Error("install interrupted");
        err.code = "SIGINT";
        throw err;
    }
    if (typeof res.status === "number" && res.status !== 0) {
        const failure = {
            pm,
            status: res.status ?? null,
            signal: res.signal ?? null,
            stdout: String(res.stdout || ""),
            stderr: String(res.stderr || ""),
        };
        const err = new Error(`${cmd} install failed`);
        err.code = "INSTALL_FAILED";
        err.failure = failure;
        throw err;
    }
}
function isEnoentSpawnError(e) {
    return Boolean(e && typeof e === "object" && "code" in e && e.code === "ENOENT");
}
function isSigintError(e) {
    return Boolean(e && typeof e === "object" && "code" in e && e.code === "SIGINT");
}
function getInstallFailure(e) {
    return Boolean(e && typeof e === "object" && e.code === "INSTALL_FAILED" && e.failure)
        ? e.failure
        : null;
}
function getTemplates() {
    return [
        { title: "Blank", value: "blank" },
        { title: "Blank (TypeScript)", value: "blank-ts" },
        { title: "Sitemap (Coming soon...)", value: "sitemap", disabled: true },
    ];
}
function getLumixRuntimeTemplatesDir() {
    // Resolve from the installed lumix-js package.
    const require = createRequire(import.meta.url);
    const pkgRoot = path.dirname(require.resolve("lumix-js/package.json"));
    return path.join(pkgRoot, "templates");
}
export async function createLumixApp(name, options) {
    console.log("");
    console.log(`  ${pc.bold(pc.cyan("⚡ Create Lumix App"))} ${pc.dim(VERSION)}`);
    console.log(pc.dim("  Scaffolding a new project...\n"));
    const templates = getTemplates();
    const allowedTemplates = new Set(templates.filter((t) => !t.disabled).map((t) => t.value));
    let template = options?.template;
    if (template && !allowedTemplates.has(template)) {
        console.log(pc.red(`\n  Error: Unknown template "${template}". Valid templates are: ${[...allowedTemplates].join(", ")}.\n`));
        process.exit(1);
    }
    const questions = [];
    if (!name) {
        questions.push({
            type: "text",
            name: "projectName",
            message: "Project name:",
            initial: "my-lumix-app",
        });
    }
    if (!template) {
        questions.push({
            type: "select",
            name: "template",
            message: "Pick a template:",
            choices: templates,
        });
    }
    const detectedPm = detectPackageManager();
    const installedPms = getInstalledPackageManagers();
    questions.push({
        type: "toggle",
        name: "install",
        message: "Install dependencies?",
        initial: true,
        active: "yes",
        inactive: "no",
    });
    questions.push({
        type: (prev) => (prev ? "select" : null),
        name: "packageManager",
        message: "Package manager:",
        initial: Math.max(0, installedPms.indexOf(detectedPm)),
        choices: installedPms.map((pm) => ({ title: pm, value: pm })),
    });
    const response = questions.length
        ? await prompts(questions, {
            onCancel() {
                console.log(pc.red("\n  Aborted.\n"));
                process.exit(0);
            },
        })
        : {};
    const projectName = name || response.projectName;
    template = template || response.template;
    const shouldInstall = response.install !== false;
    const selected = (response.packageManager || detectedPm);
    let packageManager = selected;
    if (!projectName || !template) {
        console.log(pc.red("\n  Aborted.\n"));
        process.exit(0);
    }
    const targetDir = path.resolve(process.cwd(), projectName);
    if (fs.existsSync(targetDir)) {
        console.log(pc.red(`\n  Error: Directory "${projectName}" already exists.\n`));
        process.exit(1);
    }
    const templatesDir = getLumixRuntimeTemplatesDir();
    const templateDir = path.join(templatesDir, template);
    console.log(pc.dim("\n  Scaffolding project..."));
    try {
        await fs.ensureDir(targetDir);
        await fs.copy(templateDir, targetDir);
        const pkgPath = path.join(targetDir, "package.json");
        if (fs.existsSync(pkgPath)) {
            const pkg = await fs.readJson(pkgPath);
            pkg.name = projectName;
            await fs.writeJson(pkgPath, pkg, { spaces: 2 });
        }
        console.log(pc.green(pc.bold("\n  Success! Project created.")));
        if (shouldInstall) {
            console.log(pc.dim(`\n  Installing dependencies (${packageManager})...`));
            try {
                runInstall(packageManager, targetDir);
                console.log(pc.green(pc.bold("\n  Dependencies installed.")));
            }
            catch (e) {
                if (isSigintError(e)) {
                    console.log(pc.red("\n  Aborted.\n"));
                    process.exit(0);
                }
                if (isEnoentSpawnError(e)) {
                    console.log(pc.red(`\n  Failed to install dependencies: ${packageManager} not found`));
                }
                else {
                    console.log(pc.red(`\n  Failed to install dependencies using ${packageManager}.`));
                }
                const failure = getInstallFailure(e);
                if (failure) {
                    const out = `${failure.stdout}${failure.stderr}`.trim();
                    if (out) {
                        console.log(pc.dim("\n  Output:"));
                        console.log(out);
                    }
                }
                else if (e?.message) {
                    console.log(pc.dim("\n  Output:"));
                    console.log(String(e.message));
                }
                console.log(pc.dim("\n  Project created at:"));
                console.log(`    ${targetDir}\n`);
                console.log(pc.dim("  You can try installing with a different package manager:"));
                console.log(`    cd ${projectName}`);
                console.log("    npm install");
                console.log("    pnpm install");
                console.log("    bun install\n");
            }
        }
        console.log(pc.dim("\n  Next steps:"));
        console.log(`    cd ${projectName}`);
        if (!shouldInstall) {
            console.log(`    ${installCommand(packageManager)}`);
        }
        console.log(`    ${runDevCommand(packageManager)}\n`);
    }
    catch (e) {
        console.error(pc.red(`\n  Failed to initialize project: ${e.message}\n`));
        process.exit(1);
    }
}
