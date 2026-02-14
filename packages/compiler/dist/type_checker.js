import ts from "typescript";
import path from "path";
/**
 * Validates Virtual TS code against the project's TypeScript environment.
 */
export function validateTypeScript(tsCode, luminFile, originalSource) {
    const compilerOptions = {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        allowJs: true,
        checkJs: false,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        skipLibCheck: true,
        lib: ["lib.esnext.d.ts", "lib.dom.d.ts"],
    };
    const normalize = (p) => p.replace(/\\/g, "/");
    const virtualFileName = normalize(path.resolve(luminFile) + ".ts");
    // Create a minimal compiler host
    const host = ts.createCompilerHost(compilerOptions);
    const originalGetSourceFile = host.getSourceFile;
    host.getSourceFile = (fileName, languageVersion) => {
        const normalized = normalize(fileName);
        if (normalized === virtualFileName ||
            normalized.endsWith(virtualFileName)) {
            return ts.createSourceFile(fileName, tsCode, languageVersion);
        }
        return originalGetSourceFile(fileName, languageVersion);
    };
    // Ensure module resolution works for virtual files
    const originalFileExists = host.fileExists;
    host.fileExists = (fileName) => {
        const normalized = normalize(fileName);
        if (normalized === virtualFileName || normalized.endsWith(virtualFileName))
            return true;
        return originalFileExists(fileName);
    };
    const program = ts.createProgram([virtualFileName], compilerOptions, host);
    const semanticDiagnostics = program.getSemanticDiagnostics();
    const syntacticDiagnostics = program.getSyntacticDiagnostics();
    const allDiagnostics = [...syntacticDiagnostics, ...semanticDiagnostics];
    return allDiagnostics.map((diag) => {
        const message = ts.flattenDiagnosticMessageText(diag.messageText, "\n");
        let line = 1;
        let column = 1;
        if (diag.file && diag.start !== undefined) {
            const virtualSource = diag.file.text;
            const virtualPos = diag.start;
            // Find nearest marker backward
            const markerRegex = /\/\* @L:(\d+) \*\//g;
            let lastMarker = null;
            let match;
            while ((match = markerRegex.exec(virtualSource)) !== null) {
                if (match.index > virtualPos)
                    break;
                lastMarker = {
                    offset: parseInt(match[1], 10),
                    endPos: match.index + match[0].length,
                };
            }
            if (lastMarker) {
                const relativeOffset = virtualPos - lastMarker.endPos;
                const originalOffset = lastMarker.offset + relativeOffset;
                // Convert originalOffset to line/col using originalSource
                const lines = originalSource.substring(0, originalOffset).split("\n");
                line = lines.length;
                column = lines[lines.length - 1].length + 1;
            }
            else {
                // Fallback to naive mapping or virtual pos if no marker found
                const { line: l, character: c } = diag.file.getLineAndCharacterOfPosition(diag.start);
                line = l + 1;
                column = c + 1;
            }
        }
        return {
            message,
            line,
            column,
            file: luminFile,
        };
    });
}
