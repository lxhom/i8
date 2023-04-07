import type {ProxyAdapters, functionContext} from "./internal/proxy";
import {type LanguageDict, language} from "./internal/i8";

// Language settings

import type en_US from "./lang/en-US";

/**
 * The language tree type.
 *
 * Your IDE might display this as the default language, but this will
 * be dynamically changed.
 */
export type I18n = typeof en_US;

/**
 * The default language.
 */
export const defaultLang = "en-US";

// Framework settings

/**
 * These imports are specific to Svelte. You can use this with other libraries
 * such as React, Vue, etc. by "emulating" these types. Doing so is pretty simple,
 * look at the Svelte source code for these types to find their definitions.
 * Replace the re-export with a type and function export with your logic.
 */
export {type Writable, writable} from "svelte/store";

/**
 * [`import.meta.glob` is a Vite.js feature](https://vitejs.dev/guide/features.html#glob-import).
 * This will be replaced with a list of available languages automatically by Vite.
 * If you do not use Vite, you have to replace this either with your bundler's equivalent
 * or you have to manually add all languages to this object.
 *
 * @example
 * // Without Vite's import.meta.glob
 * languages["en-US"] = () => import("./lang/en-US");
 * languages["de-DE"] = () => import("./lang/de-DE");
 */
export let languageImporter = (languages: LanguageDict) => Object.entries(import.meta.glob("./lang/*")).map(([name, lang]) => {
    name = name.replace("./lang/", "").replace(/\.[^.]+$/, "");
    languages[name] = lang;
});

// Adapters

export const proxyAdapters: ProxyAdapters = {
    function: [
        plurals,
    ],
    value: [],
};

/**
 * Plural adapter.
 *
 * @example
 * i8.a = (n) => `You have ${n} item(s)`;
 * i8.b = (n) => `${n} Betr(ag|äge)`;
 * i8.a(1) > "You have 1 item"
 * i8.a(2) > "You have 2 items"
 * i8.b(1) > "1 Betrag"
 * i8.b(2) > "2 Beträge"
 */
function plurals({args, before}: functionContext) {
    let res = before;
    let nums = args.filter((arg: any) => typeof arg === "number");
    let matches = Array.from(res.matchAll(/\(([^)]+)\)/g));
    if (nums.length === matches.length) {
        for (let i in nums) {
            let num = nums[i];
            let [original, rawPlural] = matches[i];
            let split = rawPlural.split("|");
            let plural = split.length === 2 ? split[1] : split[0];
            let singular = split.length === 2 ? split[0] : "";
            if (num === 1) {
                res = res.replace(original, singular);
            } else {
                res = res.replace(original, plural);
            }
        }
    }
    return res;
}

// Cookie & URL updater

/**
 * This updates the cookie and URL when the language changes.
 * This is not hard-coded into the library, as you might want to
 * change the names or disable this behavior.
 */
language.subscribe((lang_code) => {
    if (typeof window === "undefined") return;
    window.document.cookie = `lang=${lang_code}; path=/;`;
    let url = new URL(window.location.href);
    if (url.searchParams.has("lang")) {
        url.searchParams.set("lang", lang_code);
        window.history.replaceState({}, "", url.href);
    }
});

// Inspector

import util from "node-inspect-extracted";

/**
 * Inspector function, also known as pretty-printer.
 * For example, this turns `["abc", 123, {pretty: true}]` into `'["abc", 123, {pretty: true}]'`.
 * While this might seem easy, it's not: You have to convert a structure in memory to a source-code
 * like string. There are utils for doing that, like for example [node-inspect-extracted](https://npm.im/node-inspect-extracted)
 * has feature-parity with the Node.js inspector. You can also use the built-in `JSON.stringify`
 * function, and while it's not as pretty, it's one dependency less.
 * @example
 * return JSON.stringify(element);
 * @param element Element to inspect
 */
export let inspect = (element: any): string => {
    return util.inspect(element);
};

// Logger

/**
 * Logger. Gets called if something goes wrong.
 */
export let log = (msg: string) => console.trace(`[i18n] ${msg}`);
