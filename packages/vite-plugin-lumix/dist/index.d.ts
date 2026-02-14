interface LumixConfig {
    title?: string;
    favicon?: string;
    head?: {
        meta?: Array<Record<string, string>>;
        link?: Array<Record<string, string>>;
        script?: Array<Record<string, string>>;
    };
    rootId?: string;
    vite?: any;
    srcDir?: string;
    [key: string]: any;
}
export default function lumix(config?: LumixConfig): {
    name: string;
    enforce: "pre";
    configResolved(resolvedConfig: any): void;
    transform(this: any, code: string, id: string): Promise<{
        code: string;
        map: null;
    } | {
        code: string;
        map: {
            mappings: string;
        };
    } | undefined>;
    transformIndexHtml(html: string): string;
    configureServer(server: any): () => void;
    handleHotUpdate({ file, server, modules }: any): any;
};
export {};
