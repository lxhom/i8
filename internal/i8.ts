import {type I18n, defaultLang, writable, type Writable, languageImporter, log} from "../settings";
import {proxify} from "./proxy";

// Helpers

/**
 * Deep partial type. Like TypeScript's {@link Partial}, but for nested objects.
 */
type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends Array<infer I>
        ? Array<DeepPartial<I>>
        : DeepPartial<T[P]>;
}

/**
 * Placeholder proxy. This should never be used directly.
 */
let placeholder: I18n = new Proxy({__NOT_INITIALIZED__: true}, {
    get: (target, p) => {
        if (p === "toString" || p === "valueOf") {
            log(`Uninitialized i8 access of ${p}!`);
            return () => "i18n not initialized! You need to set a language first!";
        } else {
            return placeholder;
        }
    },
}) as any as I18n; // Just pretend it's an I18n to make TypeScript happy

/**
 * Same as {@link placeholder}, but without the proxy.
 */
let placeholderUnproxied: DeepPartial<I18n> = {};

// Types

/**
 * Language definition type.
 * This should only be used in language files and
 * NEVER in your code. This is used to get type safety
 * on incomplete language definitions.
 *
 * @example
 * import type {Language} from "$i";
 *
 * export default {
 *     i8: {
 *         status: (n: number) => `${n} Sprache(n) geladen`,
 *         // auto-completion will work here without type errors
 *     },
 * } satisfies Language;
 */
export type LanguageDeclaration = DeepPartial<I18n>

export type LanguageDict = Record<string, undefined | (() => Promise<any>)>

/**
 * i8 store type.
 *
 * @property static The current language tree.
 * Avoid using this property, as it is not reactive.
 * @property noProxy The current language tree without
 * being {@link proxify proxified}. Avoid using this property,
 * as it is not reactive and is not guaranteed to have all properties.
 */
type i8Store = Writable<I18n> & {
    static: I18n;
    noProxy: DeepPartial<I18n>;
    lang: string;
    langStore: Writable<string>;
}

// Vars

/**
 * Record of links to language files.
 */
export let languages: LanguageDict = {};
languageImporter(languages);

/**
 * All available languages.
 *
 * (This includes languages that are not loaded yet. Loading
 * languages is internal behavior by the bundler and should not
 * be relied upon. This loads a language with one minified file,
 * don't worry about loaded languages.)
 */
export const availableLanguages = Object.keys(languages);

// Stores

/**
 * The current language code.
 *
 * Assigning a new value will trigger a language change.
 *
 * @example
 * language.set("en-US")
 * // Or in Svelte:
 * $language = "en-US"
 * @default {@link defaultLang}
 */
export let language = writable<string>(defaultLang);
language.subscribe(setLang);

/**
 * The current language tree.
 *
 * This is a {@link Writable} Svelte store. Do not assign
 * a new value to this store if you want to change the language;
 * write to {@link language} or call {@link setLang} (async) instead.
 */
export let i8: i8Store = Object.assign(
    writable<I18n>(placeholder), {
        static: placeholder,
        noProxy: placeholderUnproxied,
        lang: defaultLang,
        langStore: language,
    },
);
export default i8;

// Functions

/**
 * Get all available languages.
 *
 * (This includes languages that are not loaded yet. Loading
 * languages is internal behavior by the bundler and should not
 * be relied upon. This loads a language with one minified file,
 * don't worry about loaded languages.)
 *
 * If you need metadata about a language, use {@link languageMetadata}.
 */
export function getAvailableLanguages(): string[] {
    return Object.keys(languages);
}

/**
 * Get a language by its code.
 * @param lang_code Language code
 */
export async function getLang(lang_code: string):
    Promise<{ lang?: I18n, proxy?: I18n }> {
    let raw = languages[lang_code];
    if (raw) {
        let module = await raw();
        let lang: I18n = module.default;
        let proxy = proxify(lang) as any as I18n;
        return {lang, proxy};
    }
    log(`Requested language ${lang_code} not found!`);
    return {};
}

/**
 * Set the current language of i8.
 *
 * This will update the {@link i8} store, `window.i8`[`noProxy`], the `lang` cookie
 * and the `lang=` URL param if it is running in a browser.
 * @param lang_code Language code
 * @return If the language was set successfully
 */
export async function setLang(lang_code: string): Promise<boolean> {
    let {lang, proxy} = await getLang(lang_code);
    if (!lang || !proxy) return false;
    i8.set(proxy);
    language.set(lang_code);
    i8.static = proxy;
    i8.noProxy = lang;
    i8.lang = lang_code;
    if (typeof window !== "undefined") {
        // @ts-ignore
        window.i8 = proxy;
        // @ts-ignore
        window.i8noProxy = lang;
    }
    return true;
}

// Re-Exports
export {resolveLangCode} from "./detection";
export {languageMetadata} from "./meta";
