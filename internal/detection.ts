import {getAvailableLanguages} from "./i8";

import {ResolveAcceptLanguage} from "resolve-accept-language";
import {defaultLang} from "../settings";

/**
 * Get the language to use for the current request.
 * This function will try to resolve the language from the given
 * parameters in the order of the array.
 *
 * Note: You do **not** have to initialize i8 before using this function.
 * @example
 * /// src/routes/+layout.server.ts
 * export const load: LayoutServerLoad = (async ({cookies, request, url}) => {
 *     let lang = resolveLangCode([
 *         url.searchParams.get("lang"),
 *         cookies.get("lang"),
 *         request.headers.get("accept-language"),
 *     ]);
 *     return {lang};
 * });
 * @param accepts
 */
export const resolveLangCode = (accepts: Array<string | undefined | null>): string => {
    let attempts = accepts.filter(v => typeof v === "string") as string[];

    for (let attempt of attempts) {
        let res = new ResolveAcceptLanguage(attempt, [...getAvailableLanguages()]);
        if (res.hasMatch()) {
            return res.getBestMatch()!;
        }
    }
    return defaultLang;
};

/**
 * Get the browser language(s).
 */
export const getBrowserLang = () => [
    navigator.language,
    navigator.languages,
    // @ts-ignore
    navigator.userLanguage,
    // @ts-ignore
    navigator.browserLanguage,
];

/**
 * Get a cookie in the browser by its name.
 */
export const getCookie = (name: string) => // https://stackoverflow.com/a/59603055
    ("; " + document.cookie).split(`; ${name}=`).pop()?.split(";")[0] || undefined;

/**
 * Get a URL param in the browser by its name.
 */
export const getUrlParam = (name: string) => {
    let url = new URL(window.location.href);
    return url.searchParams.get(name);
};
