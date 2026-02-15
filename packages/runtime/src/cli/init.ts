import prompts from "prompts";
import pc from "picocolors";
import fs from "fs-extra";
import path from "path";
import { __dirname } from "./utils.js";
import { spawnSync } from "child_process";
import { VERSION } from "./constants.js";

type InitOptions = {
  template?: string;
};

function isPackageManagerAvailable(pm: "bun" | "pnpm" | "npm"): boolean {
  try {
    let res = spawnSync(pm, ["--version"], { stdio: "ignore" });
    if (res.error) {
      const err: any = res.error;
      if (process.platform === "win32" && err.code === "ENOENT" && (pm === "npm" || pm === "pnpm")) {
        res = spawnSync("cmd", ["/c", pm, "--version"], { stdio: "ignore" });
      }
    }
    return res.status === 0;
  } catch {
    return false;
  }
}

function detectPackageManager(): "bun" | "pnpm" | "npm" {
  if (isPackageManagerAvailable("bun")) return "bun";
  if (isPackageManagerAvailable("pnpm")) return "pnpm";
  return "npm";
}

function getInstalledPackageManagers(): Array<"bun" | "pnpm" | "npm"> {
  // Always show the main options; availability will be handled at install time.
  return ["bun", "pnpm", "npm"];
}

function runDevCommand(pm: "bun" | "pnpm" | "npm"): string {
  if (pm === "npm") return "npm run dev";
  return `${pm} run dev`;
}

function installCommand(pm: "bun" | "pnpm" | "npm"): string {
  if (pm === "npm") return "npm install";
  return `${pm} install`;
}

type InstallFailure = {
  pm: "bun" | "pnpm" | "npm";
  status: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
};

function runInstall(pm: "bun" | "pnpm" | "npm", cwd: string) {
  const cmd = pm;
  const args = ["install"];
  let res = spawnSync(cmd, args, { cwd, encoding: "utf8" });
  if (res.error) {
    // On Windows, npm/pnpm may be available through cmd resolution even if not directly spawnable.
    const err: any = res.error;
    if (process.platform === "win32" && err.code === "ENOENT" && (pm === "npm" || pm === "pnpm")) {
      res = spawnSync("cmd", ["/c", pm, ...args], { cwd, encoding: "utf8" });
    } else {
      throw res.error;
    }
  }
  if (res.signal === "SIGINT") {
    const err: any = new Error("install interrupted");
    err.code = "SIGINT";
    throw err;
  }
  if (typeof res.status === "number" && res.status !== 0) {
    const failure: InstallFailure = {
      pm,
      status: res.status ?? null,
      signal: res.signal ?? null,
      stdout: String(res.stdout || ""),
      stderr: String(res.stderr || ""),
    };
    const err: any = new Error(`${cmd} install failed`);
    err.code = "INSTALL_FAILED";
    err.failure = failure;
    throw err;
  }
}

function isEnoentSpawnError(e: any): boolean {
  return Boolean(e && typeof e === "object" && "code" in e && e.code === "ENOENT");
}

function isSigintError(e: any): boolean {
  return Boolean(e && typeof e === "object" && "code" in e && e.code === "SIGINT");
}

function getInstallFailure(e: any): InstallFailure | null {
  return Boolean(e && typeof e === "object" && e.code === "INSTALL_FAILED" && e.failure)
    ? (e.failure as InstallFailure)
    : null;
}

export async function init(name?: string, options?: InitOptions) {
  console.log("");
  console.log(`  ${pc.bold(pc.cyan("⚡ LumixJS"))} ${pc.dim(`v${VERSION}`)}`);
  console.log(pc.dim("  Scaffolding a new project...\n"));

  const templates = [
    { title: "Blank", value: "blank" },
    { title: "Blank (TypeScript)", value: "blank-ts" },
    { title: "Sitemap (Coming soon...)", value: "sitemap", disabled: true },
  ] as const;

  const allowedTemplates = new Set(
    templates
      .filter((t: any) => !t.disabled)
      .map((t: any) => t.value as string),
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

  const questions: any[] = [];
  if (!name) {
    questions.push({
      type: "text",
      name: "projectName",
      message: "Project name:",
      initial: "my-lumin-app",
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

  const response = questions.length > 0
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
    console.log(
      pc.red(
        `\n  Error: Directory "${projectName}" already exists.\n`,
      ),
    );
    process.exit(1);
  }

  const templateDir = path.resolve(
    __dirname,
    "../../templates",
    template,
  );

  console.log(pc.dim("\n  Scaffolding project..."));

  try {
    await fs.ensureDir(targetDir);
    await fs.copy(templateDir, targetDir);

    // Update package.json name
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
          console.log(pc.red(`\n  Failed to install dependencies: ${packageManager} not found`));
        } else {
          console.log(pc.red(`\n  Failed to install dependencies using ${packageManager}.`));
        }

        const failure = getInstallFailure(e);
        if (failure) {
          const out = `${failure.stdout}${failure.stderr}`.trim();
          if (out) {
            console.log(pc.dim("\n  Output:"));
            console.log(out);
          }
        } else if (e?.message) {
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
  } catch (e: any) {
    console.error(pc.red(`\n  Failed to initialize project: ${e.message}\n`));
    process.exit(1);
  }
}
