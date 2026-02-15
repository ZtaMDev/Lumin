interface LumixConfig {
    title?: string;
    favicon?: string;
    head?: {
        meta?: Array<Record<string, string>>;
        link?: Array<Record<string, string>>;
        script?: Array<Record<string, string>>;
    };
    rootId?: string;
    rootComponent?: string;
    vite?: any;
    srcDir?: string;
    router?: {
        pagesDir?: string;
        apiDir?: string;
    };
    [key: string]: any;
}
export default function lumix(config?: LumixConfig): {
    name: string;
    enforce: "pre";
    config(viteConfig: any): {
        resolve: {
            alias: any[];
        };
    };
    configResolved(resolvedConfig: any): void;
    buildStart(this: any): void;
    resolveId(id: string): string | null;
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
