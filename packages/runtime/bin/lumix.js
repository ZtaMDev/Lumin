#!/usr/bin/env node
import { Command } from "commander";
import pc from "picocolors";
import { dev } from "../dist/cli/dev.js";
import { build } from "../dist/cli/build.js";
import { preview } from "../dist/cli/preview.js";
import { init } from "../dist/cli/init.js";

const VERSION = "0.1.3";

const program = new Command();

program
  .name("lumix")
  .description("CLI for the LumixJS framework")
  .version(VERSION);

program.command("dev").description("Start the development server").action(dev);

program
  .command("build")
  .description("Build the project for production")
  .action(build);

program
  .command("preview")
  .description("Preview the production build locally")
  .action(preview);

program
  .command("init")
  .description("Scaffold a new LuminJS project")
  .argument("[name]", "Project name")
  .option("-t, --template <template>", "Project template (blank, blank-ts)")
  .action((name, options) => init(name, options));

// Custom help output
program.configureHelp({
  formatHelp(cmd, helper) {
    const title = `\n  ${pc.bold(pc.cyan("⚡ LumixJS"))} ${pc.dim(`v${VERSION}`)}\n`;
    const desc = `  ${pc.dim(cmd.description())}\n`;

    const cmds = cmd.commands.map((c) => {
      const name = c.name().padEnd(12);
      return `    ${pc.green(name)} ${pc.dim(c.description())}`;
    });

    const cmdSection = `\n  ${pc.bold("Commands:")}\n${cmds.join("\n")}\n`;

    const opts = cmd.options.map((o) => {
      const flags = o.flags.padEnd(18);
      return `    ${pc.yellow(flags)} ${pc.dim(o.description)}`;
    });

    const optSection = `\n  ${pc.bold("Options:")}\n${opts.join("\n")}\n`;

    const usage = `\n  ${pc.bold("Usage:")}  ${pc.dim("lumix")} ${pc.white("<command>")} ${pc.dim("[options]")}\n`;

    return title + desc + usage + cmdSection + optSection + "\n";
  },
});

program.parse();
