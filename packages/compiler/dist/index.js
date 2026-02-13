import execa from "execa";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
// Determine the path to the binary
// In development, it might be in target/debug
// In production, we might ship it or download it.
// For this monorepo setup, we assume we invoke `luminc` from the bin/luminc.js wrapper or directly locate the binary.
// Actually, let's just assume `cargo run` or locate the binary if built.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, ".."); // dist/ -> package root
export async function compile(options) {
    // We utilize `cargo run` to execute the compiler binary.
    const manifestPath = path.join(packageRoot, "Cargo.toml");
    // Construct arguments for the CLI
    const args = [
        "run",
        "--manifest-path",
        manifestPath,
        "--quiet",
        "--",
        "build",
        options.input,
    ];
    // Use a temporary directory for output
    const tempOutDir = path.join(packageRoot, ".temp_build");
    args.push("--out", tempOutDir);
    if (options.bundle === false) {
        args.push("--no-bundle");
    }
    args.push("--format", "json");
    try {
        await execa("cargo", args); // Execute cargo
        // The filename is derived from input filename.
        const filename = path.basename(options.input, ".lumin") + ".js";
        const outPath = path.join(tempOutDir, filename);
        if (!fs.existsSync(outPath)) {
            throw new Error(`Output file not found: ${outPath}`);
        }
        const code = fs.readFileSync(outPath, "utf-8");
        return code;
    }
    catch (e) {
        if (e.stdout) {
            let json = null;
            try {
                json = JSON.parse(e.stdout);
            }
            catch (_parseErr) {
                // stdout wasn't valid JSON, fall through to throw raw error
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
