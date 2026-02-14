#!/usr/bin/env node
import { createLumixApp } from "../dist/index.js";

const args = process.argv.slice(2);
let name;
let template;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "-t" || a === "--template") {
    template = args[i + 1];
    i++;
    continue;
  }
  if (!name && !a.startsWith("-")) {
    name = a;
    continue;
  }
}

await createLumixApp(name, { template });
