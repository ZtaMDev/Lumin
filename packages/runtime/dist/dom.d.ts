import { Signal } from "./signals";
export type AttrValue = string | number | boolean | (() => any) | Signal<any>;
export interface Props {
    [key: string]: AttrValue;
}
export declare function h(tag: string | ((props: Props, ...children: any[]) => any), props: Props | null, ...children: any[]): any;
export declare function Fragment(_props: any, ...children: any[]): any[];
export declare function hydrate(root: HTMLElement, component: (props?: any) => HTMLElement, props?: any): void;
