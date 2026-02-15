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
