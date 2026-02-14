export interface TypeDiagnostic {
    message: string;
    line: number;
    column: number;
    file: string;
}
/**
 * Validates Virtual TS code against the project's TypeScript environment.
 */
export declare function validateTypeScript(tsCode: string, luminFile: string, originalSource: string): TypeDiagnostic[];
