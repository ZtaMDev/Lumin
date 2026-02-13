export interface CompileOptions {
    input: string;
    outDirect?: string;
    bundle?: boolean;
}
export declare function compile(options: CompileOptions): Promise<string>;
