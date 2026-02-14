import { Signal } from "./signals";
/** Two-way binding for text inputs, textareas, and selects */
export declare function bindValue(el: HTMLElement, sig: Signal<string>): void;
/** Two-way binding for checkboxes */
export declare function bindChecked(el: HTMLElement, sig: Signal<boolean>): void;
/** Two-way binding for number/range inputs */
export declare function bindNumeric(el: HTMLElement, sig: Signal<number>): void;
/** Two-way binding for radio button groups */
export declare function bindGroup(el: HTMLElement, sig: Signal<string>): void;
/** Two-way binding for `<select multiple>` */
export declare function bindSelected(el: HTMLElement, sig: Signal<string[]>): void;
/** Automatically detect input type and apply the right bind */
export declare function bind(el: HTMLElement, property: string, sig: Signal<any>): void;
