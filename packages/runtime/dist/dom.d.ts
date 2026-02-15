import { Signal } from "./signals.js";
export type AttrValue = string | number | boolean | (() => any) | Signal<any>;
export interface Props {
    [key: string]: AttrValue;
}
export declare function h(tag: string | ((props: Props, ...children: any[]) => any), props: Props | null, ...children: any[]): any;
export declare function Fragment(_props: any, ...children: any[]): any[];
export declare function hydrate(root: HTMLElement, component: (props?: any) => any, props?: any): void;
export declare function mount(root: HTMLElement, component: (props?: any) => any, props?: any): {
    update(nextComponent: (props?: any) => any): void;
    destroy(): void;
};
export interface IslandDescriptor {
    id: string;
    componentPath: string;
    props: any;
    selector: string;
}
export interface RenderToStringResult {
    html: string;
    islands: IslandDescriptor[];
    styles?: string[];
}
/**
 * Render a Lumix component to HTML (for SSG/SSR).
 * Requires a DOM implementation (e.g. happy-dom in Node).
 * Islands are marked for later hydration; full island detection is TODO.
 * Captures styles injected during rendering for SSG.
 */
export declare function renderToString(Comp: (props?: any) => any, props?: any): RenderToStringResult;
/**
 * Hydrate a single island node (for use with window.__LUMIX_ISLANDS__).
 */
export declare function hydrateIsland(el: HTMLElement, componentPath: string, props: any): Promise<void>;
