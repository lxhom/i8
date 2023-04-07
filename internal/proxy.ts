type Ret<T> = (...args: any) => T;
type ValRet<T> = Ret<T> | T
type ValueOf<T> = Ret<T> & T

type ToString = string | { toString: Ret<string> }
type TranslationTreeNode = { [key: string]: ValRet<TranslationTreeNode> | TranslationTreeEntry }
type TranslationTreeEntry = ValRet<ToString>;
type ProxyTranslationTreeNode = ValueOf<{ [key: string]: ProxyTranslationTreeNode } & string>

import {inspect, log, proxyAdapters} from "../settings";

/**
 * A call/property path.
 *
 * Example: a.b().c(d, e) => [a, b, [], c, [d, e]]
 */
export type Path = Array<string | Array<any>>

/**
 * Converts a {@link Path} to a string.
 * @example
 * stringify([a, b, [], c, [d, e]]); "a.b().c(d, e)"
 * @param path
 */
export function stringify(path: Path) {
    // example: [a, b, [], c, [d, e]] => a.b().c(d, e)
    let res = "";
    for (let i = 0; i < path.length; i++) {
        let p = path[i];
        if (typeof p === "string") {
            res += p;
        } else if (Array.isArray(p)) {
            res += "(" + p.map((arg) => inspect(arg)).join(", ") + ")";
        }
        if (i !== path.length - 1) res += ".";
    }
    return res;
}

/**
 * Function adapter context.
 */
export type functionContext = {
    fn: (...args: any) => string,
    args: any[],
    path: Path,
    before: string,
}

/**
 * Path adapter context.
 */
export type pathContext = {
    path: Path,
    before: string,
}

export type ProxyAdapters = {
    function: Array<(context: functionContext) => string>,
    value: Array<(context: pathContext) => string>,
}

/**
 * Proxifies a translation tree.
 * This is used for two things:
 * - Add adapters to the tree (for example plurals)
 * - Add placeholders for the tree
 *
 * Adapters need to be registered in {@link proxyAdapters}.
 * Placeholders are added automatically with {@link stringify}.
 *
 * You can safely cast the result to the original type.
 * For example, when using this for translation you can cast
 * the result of `proxify` back to {@link I18n}.
 * @example
 * // Plural adapter loaded
 * i8.status = (n) => `${n} language(s) loaded`;
 * i8.status(1); //> "1 language loaded"
 * i8.status(2); //> "2 languages loaded"
 * // Placeholder adapter loaded
 * i8.this("really").does.not.exist();
 * //> "this('really').does.not.exist()"
 * @param tree The original tree
 * @param path Used internally for recursion
 */
export function proxify(tree: TranslationTreeNode | TranslationTreeEntry | undefined, path: Path = []): ProxyTranslationTreeNode {
    let proxy: ProxyTranslationTreeNode;

    function target(this: ProxyTranslationTreeNode, ...args: any): ProxyTranslationTreeNode {
        let res = proxy;
        if (typeof tree === "function") {
            try {
                // @ts-ignore
                res = tree(...args);
            } catch (e) {
                // @ts-ignore
                res = "Function " + stringify(path) + " threw an error: " + e.toString();
                log(res);
            }
            proxyAdapters.function.forEach(a => {
                try {
                    // @ts-ignore
                    res = a({fn: tree as any, args, before: res, path});
                } catch (e) {
                    // @ts-ignore
                    res = "Adapter " + a.toString().split("\n")[0].substring(0, 30) + "... threw an error: " + e.toString();
                    log(res);
                }
            });
        } else {
            path = [...path, args];
        }
        return res;
    }

    proxy = new Proxy(target, {
        get: (target, p) => {
            if (typeof p === "symbol") return undefined;
            let res: any;
            // if trying to receive the value
            if (p === "toString" || p === "valueOf") {
                let reference = {};
                if (typeof tree === "object" && tree[p] && tree[p] !== reference[p]) {
                    log(`Custom toString or valueOf detected at ${stringify(path)}. ` +
                        "Please use getters instead, toString and valueOf are used internally.",
                    );
                    res = tree[p]();
                    proxyAdapters.value.forEach(a => {
                        try {
                            // @ts-ignore
                            res = a({before: res, path});
                        } catch (e) {
                            // @ts-ignore
                            res = "Adapter " + a.toString().split("\n")[0].substring(0, 30) + "... threw an error: " + e.toString();
                            log(res);
                        }
                    });
                    // noinspection JSUnusedLocalSymbols
                    return (Please_run_this_function?: any) => res;
                } else if (typeof tree === "undefined" || typeof tree === "object") {
                    return () => stringify(path);
                } else {
                    // noinspection JSUnusedLocalSymbols
                    return (Illegal_invocation: any) => tree;
                }
            }
            return proxify((typeof tree !== "undefined" && tree !== null) ? (tree as any)[p] : undefined, [...path, p]);
        },
    }) as any;

    return proxy;
}
