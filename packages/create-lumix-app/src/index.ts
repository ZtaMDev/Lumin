import prompts from "prompts";
import pc from "picocolors";
import fs from "fs-extra";
import path from "path";
import { createRequire } from "module";
import { spawnSync } from "child_process";

type TemplateChoice = {
  title: string;
  value: string;
  disabled?: boolean;
};

type CreateOptions = {
  template?: string;
};

function hasCommand(cmd: string): boolean {
  const which = process.platform === "win32" ? "where" : "which";
  const res = spawnSync(which, [cmd], { stdio: "ignore" });
  return res.status === 0;
}

function detectPackageManager(): "bun" | "pnpm" | "npm" {
  if (hasCommand("bun")) return "bun";
  if (hasCommand("pnpm")) return "pnpm";
  return "npm";
}

function getInstalledPackageManagers(): Array<"bun" | "pnpm" | "npm"> {
  const out: Array<"bun" | "pnpm" | "npm"> = [];
  if (hasCommand("bun")) out.push("bun");
  if (hasCommand("pnpm")) out.push("pnpm");
  // npm is assumed to exist if node exists; but still keep it as fallback.
  out.push("npm");
  return Array.from(new Set(out));
}

function runDevCommand(pm: "bun" | "pnpm" | "npm"): string {
  if (pm === "npm") return "npm run dev";
  return `${pm} run dev`;
}

function installCommand(pm: "bun" | "pnpm" | "npm"): string {
  if (pm === "npm") return "npm install";
  return `${pm} install`;
}

function runInstall(pm: "bun" | "pnpm" | "npm", cwd: string) {
  const cmd = pm;
  const args = pm === "npm" ? ["install"] : ["install"];
  const res = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (res.error) throw res.error;
  if (res.signal === "SIGINT") {
    const err: any = new Error("install interrupted");
    err.code = "SIGINT";
    throw err;
  }
  if (typeof res.status === "number" && res.status !== 0) {
    throw new Error(`${cmd} install failed with exit code ${res.status}`);
  }
}

function isEnoentSpawnError(e: any): boolean {
  return Boolean(e && typeof e === "object" && "code" in e && e.code === "ENOENT");
}

function isSigintError(e: any): boolean {
  return Boolean(e && typeof e === "object" && "code" in e && e.code === "SIGINT");
}

function getTemplates(): readonly TemplateChoice[] {
  return [
    { title: "Blank", value: "blank" },
    { title: "Blank (TypeScript)", value: "blank-ts" },
    { title: "Sitemap (Coming soon...)", value: "sitemap", disabled: true },
  ] as const;
}

function getLumixRuntimeTemplatesDir(): string {
  // Resolve from the installed lumix-js package.
  const require = createRequire(import.meta.url);
  const pkgRoot = path.dirname(require.resolve("lumix-js/package.json"));
  return path.join(pkgRoot, "templates");
}

export async function createLumixApp(name?: string, options?: CreateOptions) {
  console.log("");
  console.log(`  ${pc.bold(pc.cyan("⚡ Create Lumix App"))} ${pc.dim("v0.1.0")}`);
  console.log(pc.dim("  Scaffolding a new project...\n"));

  const templates = getTemplates();
  const allowedTemplates = new Set(
    templates.filter((t) => !t.disabled).map((t) => t.value),
  );

  let template = options?.template;
  if (template && !allowedTemplates.has(template)) {
    console.log(
      pc.red(
        `\n  Error: Unknown template "${template}". Valid templates are: ${[...allowedTemplates].join(
          ", ",
        )}.\n`,
      ),
    );
    process.exit(1);
  }

  const questions: prompts.PromptObject[] = [];

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
      choices: templates as any,
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
    type: (prev: any) => (prev ? "select" : null),
    name: "packageManager",
    message: "Package manager:",
    initial: Math.max(0, installedPms.indexOf(detectedPm)),
    choices: installedPms.map((pm) => ({ title: pm, value: pm })),
  });

  const response: any = questions.length
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
  const selected = (response.packageManager || detectedPm) as
    | "bun"
    | "pnpm"
    | "npm";
  let packageManager: "bun" | "pnpm" | "npm" = selected;

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
      } catch (e: any) {
        if (isSigintError(e)) {
          console.log(pc.red("\n  Aborted.\n"));
          process.exit(0);
        }
        if (isEnoentSpawnError(e)) {
          const fallback: "bun" | "pnpm" | "npm" = detectedPm;
          if (fallback !== packageManager && hasCommand(fallback)) {
            console.log(pc.yellow(`\n  ${packageManager} not found. Retrying with ${fallback}...`));
            try {
              packageManager = fallback;
              runInstall(packageManager, targetDir);
              console.log(pc.green(pc.bold("\n  Dependencies installed.")));
            } catch (e2: any) {
              if (isSigintError(e2)) {
                console.log(pc.red("\n  Aborted.\n"));
                process.exit(0);
              }
              console.log(pc.red(`\n  Failed to install dependencies: ${e2?.message || e2}`));
              console.log(pc.dim("  Project created at:"));
              console.log(`    ${targetDir}\n`);
            }
          } else {
            console.log(pc.red(`\n  Failed to install dependencies: ${e?.message || e}`));
            console.log(pc.dim("  Project created at:"));
            console.log(`    ${targetDir}\n`);
          }
        } else {
          console.log(pc.red(`\n  Failed to install dependencies: ${e?.message || e}`));
          console.log(pc.dim("  Project created at:"));
          console.log(`    ${targetDir}\n`);
        }
      }
    }

    console.log(pc.dim("\n  Next steps:"));
    console.log(`    cd ${projectName}`);
    if (!shouldInstall) {
      console.log(`    ${installCommand(packageManager)}`);
    }
    console.log(`    ${runDevCommand(packageManager)}\n`);
  } catch (e: any) {
    console.error(pc.red(`\n  Failed to initialize project: ${e.message}\n`));
    process.exit(1);
  }
}
