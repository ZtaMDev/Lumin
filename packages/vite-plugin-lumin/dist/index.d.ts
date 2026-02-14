interface LuminConfig {
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
export default function lumin(config?: LuminConfig): {
    name: string;
    enforce: "pre";
    transform(code: string, id: string): Promise<{
        code: string;
        map: null;
    } | undefined>;
    transformIndexHtml(html: string): string;
    configureServer(server: any): () => void;
    handleHotUpdate({ file, server, modules }: any): any;
};
export {};
