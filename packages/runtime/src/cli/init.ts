import prompts from "prompts";
import pc from "picocolors";
import fs from "fs-extra";
import path from "path";
import { __dirname } from "./utils.js";

export async function init() {
  console.log("");
  console.log(`  ${pc.bold(pc.cyan("⚡ LuminJS"))} ${pc.dim("v0.1.0")}`);
  console.log(pc.dim("  Scaffolding a new project...\n"));

  const response = await prompts([
    {
      type: "text",
      name: "projectName",
      message: "Project name:",
      initial: "my-lumin-app",
    },
    {
      type: "select",
      name: "template",
      message: "Pick a template:",
      choices: [
        { title: "Blank", value: "blank" },
        { title: "Blank (TypeScript)", value: "blank-ts" },
        { title: "Sitemap (Coming soon...)", value: "sitemap", disabled: true },
      ],
    },
  ]);

  if (!response.projectName || !response.template) {
    console.log(pc.red("\n  Aborted.\n"));
    process.exit(0);
  }

  const targetDir = path.resolve(process.cwd(), response.projectName);

  if (fs.existsSync(targetDir)) {
    console.log(
      pc.red(
        `\n  Error: Directory "${response.projectName}" already exists.\n`,
      ),
    );
    process.exit(1);
  }

  const templateDir = path.resolve(
    __dirname,
    "../../templates",
    response.template,
  );

  console.log(pc.dim("\n  Scaffolding project..."));

  try {
    await fs.ensureDir(targetDir);
    await fs.copy(templateDir, targetDir);

    // Update package.json name
    const pkgPath = path.join(targetDir, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = await fs.readJson(pkgPath);
      pkg.name = response.projectName;
      await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    }

    console.log(pc.green(pc.bold("\n  Success! Project created.")));
    console.log(pc.dim("\n  Next steps:"));
    console.log(`    cd ${response.projectName}`);
    console.log(`    bun install`);
    console.log(`    bun run dev\n`);
  } catch (e: any) {
    console.error(pc.red(`\n  Failed to initialize project: ${e.message}\n`));
    process.exit(1);
  }
}
