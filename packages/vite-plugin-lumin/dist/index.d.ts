export default function lumin(): {
    name: string;
    enforce: "pre";
    transform(code: string, id: string): Promise<{
        code: string;
        map: null;
    } | undefined>;
    handleHotUpdate({ file, server, modules }: any): any;
};
