import { compile } from "@luminjs/compiler";

export default function lumin() {
  return {
    name: "vite-plugin-lumin",
    enforce: "pre" as const,

    async transform(code: string, id: string) {
      if (!id.endsWith(".lumin")) return;

      try {
        const js = await compile({
          input: id,
          bundle: false,
        });

        return {
          code: js,
          map: null,
        };
      } catch (e: any) {
        const error = new Error(e.message);
        (error as any).id = id;
        (error as any).plugin = "vite-plugin-lumin";

        if (e.luminLoc) {
          (error as any).loc = {
            file: id,
            line: e.luminLoc.line,
            column: e.luminLoc.column,
          };
          // Vite/Rollup will generate the frame automatically if loc is provided and it can read the file.
          // But we can also manually generate it if needed.
          // For now, let's trust Vite to generate frame from loc + id.
        } else {
          // Fallback: try to guess from message if JSON failed
          const errorMsg = e.stderr || e.stdout || e.message || "Unknown error";
          const lines = errorMsg.split("\n");
          const specificError =
            lines.find((line: string) => line.trim().startsWith("error:")) ||
            errorMsg;
          error.message = specificError;
          (error as any).loc = { file: id };
        }

        throw error;
      }
    },

    handleHotUpdate({ file, server, modules }: any) {
      if (file.endsWith(".lumin")) {
        return modules;
      }
    },
  };
}
