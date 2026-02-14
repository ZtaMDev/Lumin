import execa from "execa";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import os from "os";
import { validateTypeScript } from "./type_checker.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, ".."); // dist/ -> package root
// ─── Binary Resolution ─────────────────────────────────────
function getBinaryName() {
    const platform = os.platform(); // 'linux', 'darwin', 'win32'
    const arch = os.arch(); // 'x64', 'arm64'
    const archKey = arch === "arm64" ? "arm64" : "x64";
    const ext = platform === "win32" ? ".exe" : "";
    return `lumixjs-${platform}-${archKey}${ext}`;
}
function findBinary() {
    const binName = getBinaryName();
    const binPath = path.join(packageRoot, "bin", binName);
    if (fs.existsSync(binPath)) {
        return binPath;
    }
    return null;
}
export async function compile(options) {
    // Build CLI arguments (shared between binary and cargo run)
    const cliArgs = [
        "build",
        options.input,
        "--format",
        "json",
        "--no-html",
        "--no-emit",
    ];
    if (options.bundle === false) {
        cliArgs.push("--no-bundle");
    }
    // Try pre-compiled binary first, fall back to cargo run
    const binary = findBinary();
    let command;
    let args;
    if (binary) {
        command = binary;
        args = cliArgs;
    }
    else {
        // Fallback: compile via cargo run (requires Rust toolchain)
        const manifestPath = path.join(packageRoot, "Cargo.toml");
        command = "cargo";
        args = [
            "run",
            "--manifest-path",
            manifestPath,
            "--quiet",
            "--",
            ...cliArgs,
        ];
    }
    try {
        const { stdout } = await execa(command, args);
        const json = JSON.parse(stdout);
        if (json.js !== undefined) {
            if (options.checkTypes !== false && json.ts) {
                const originalSource = fs.readFileSync(options.input, "utf-8");
                const typeDiags = validateTypeScript(json.ts, options.input, originalSource);
                if (typeDiags.length > 0) {
                    const d = typeDiags[0];
                    const err = new Error(d.message);
                    err.luminLoc = {
                        file: options.input,
                        line: d.line,
                        column: d.column,
                    };
                    throw err;
                }
            }
            return json.js;
        }
        if (json.diagnostics && json.diagnostics.length > 0) {
            const d = json.diagnostics[0];
            const err = new Error(d.message);
            err.luminStart = d.start;
            err.luminEnd = d.end;
            err.luminLoc = {
                file: options.input,
                line: d.start.line,
                column: d.start.col,
            };
            throw err;
        }
        throw new Error(`Unexpected output from compiler: ${stdout}`);
    }
    catch (e) {
        if (e.stdout) {
            let json = null;
            try {
                json = JSON.parse(e.stdout);
            }
            catch (_parseErr) {
                // stdout wasn't valid JSON, fall through
            }
            if (json) {
                if (json.diagnostics && json.diagnostics.length > 0) {
                    const d = json.diagnostics[0];
                    const err = new Error(d.message);
                    err.luminStart = d.start;
                    err.luminEnd = d.end;
                    err.luminLoc = {
                        file: options.input,
                        line: d.start.line,
                        column: d.start.col,
                    };
                    throw err;
                }
                else if (json.error) {
                    const err = new Error(json.error);
                    if (json.line !== undefined && json.column !== undefined) {
                        err.luminLoc = {
                            file: json.file,
                            line: json.line,
                            column: json.column,
                        };
                    }
                    throw err;
                }
            }
        }
        throw e;
    }
}
