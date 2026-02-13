import { compile } from "@luminjs/compiler";
export default function lumin() {
    return {
        name: "vite-plugin-lumin",
        enforce: "pre",
        async transform(code, id) {
            if (!id.endsWith(".lumin"))
                return;
            try {
                const js = await compile({
                    input: id,
                    bundle: false,
                });
                return {
                    code: js,
                    map: null,
                };
            }
            catch (e) {
                const error = new Error(e.message);
                error.id = id;
                error.plugin = "vite-plugin-lumin";
                if (e.luminLoc) {
                    error.loc = {
                        file: id,
                        line: e.luminLoc.line,
                        column: e.luminLoc.column,
                    };
                    // Vite/Rollup will generate the frame automatically if loc is provided and it can read the file.
                    // But we can also manually generate it if needed.
                    // For now, let's trust Vite to generate frame from loc + id.
                }
                else {
                    // Fallback: try to guess from message if JSON failed
                    const errorMsg = e.stderr || e.stdout || e.message || "Unknown error";
                    const lines = errorMsg.split("\n");
                    const specificError = lines.find((line) => line.trim().startsWith("error:")) ||
                        errorMsg;
                    error.message = specificError;
                    error.loc = { file: id };
                }
                throw error;
            }
        },
        handleHotUpdate({ file, server, modules }) {
            if (file.endsWith(".lumin")) {
                return modules;
            }
        },
    };
}
