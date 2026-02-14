export type ControlBranch = {
    cond?: () => any;
    body: () => any | any[];
};
/**
 * Reactive If/Else helper
 * @param condition Initial condition for the first branch
 * @param branches List of branches with optional conditions and bodies
 */
export declare function __if(condition: () => any, branches: ControlBranch[]): () => any;
/**
 * Reactive For loop helper
 * @param list Closure returning the array to iterate over
 * @param render Closure to render each item
 * @param keyFn Optional closure to extract a unique key from each item
 */
export declare function __for<T>(list: () => T[], render: (item: T, index: number) => any | any[], keyFn?: (item: T) => any): () => any[];
