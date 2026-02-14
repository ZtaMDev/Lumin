#!/usr/bin/env node
import { compile } from "../dist/index.js";
import path from "path";
import fs from "fs";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log("Usage: luminc <input-file>");
  process.exit(1);
}

const input = path.resolve(args[0]);
if (!fs.existsSync(input)) {
  console.error(`File not found: ${input}`);
  process.exit(1);
}

try {
  const code = await compile({ input });
  console.log(code);
} catch (e) {
  console.error(e.message);
  if (e.luminLoc) {
    console.error(
      `at ${e.luminLoc.file}:${e.luminLoc.line}:${e.luminLoc.column}`,
    );
  }
  process.exit(1);
}
