# i8

i8 is an internationalization library for TypeScript-based apps.

## Features

- **Small**: i8 is under 500 lines and has only two dependencies.
- **Extensible**: i8 is designed to be extended with custom features. For example, you can add support for custom
  pluralization rules.
- **Type-safe**: i8 uses TypeScript to ensure that your translations are valid and that you use them correctly. This
  also enables IDE autocompletion, everywhere.
- **Framework-agnostic**: i8 is not tied to any specific framework. It can be used with Svelte, React, Vue, Angular,
  etc.
- **Lazy-loaded**: i8 only loads the translations that are actually needed. If you have 100 languages, i8 will only load
  the translations for the language that the user has selected.
- **On-the-fly language switching**: i8 can switch the language on the fly, without reloading the page in any reactive
  framework.

## Installation

This is *not* an ordinary TS library ([why?](#why-not-on-npm)). You need to copy this folder directly into your source tree to enable TS support.

To install i8, install the following dependencies into your project:

```bash
npm i --save-dev @sozialhelden/ietf-language-tags
npm i node-inspect-extracted resolve-accept-language
```

Then clone this repository into a folder in your source tree. You can use any name, but I
recommend `i18n`:

```bash
cd project/src
git clone https://github.com/lxhom/i8.git i18n
```

### TypeScript alias

I prefer short names for library imports like this, so I add the following to my `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "$i8": [
        "./src/i18n/internal/i8"
      ]
    }
  }
}
```

Then I don't have to use relative imports and can use `$i8` instead:

```ts
import {i8} from '$i8';
```

## Configuration

The configuration is done in [settings.ts](settings.ts). You can change a lot about how i8 works there. The options
are documented in the file and have sane defaults.

### Default language (`I18n`, `defaultLang`)

The TypeScript type of the i8 store gets derived from the default language. The default language should be the
most complete language you have (usually English or the native language of the dev).

### Framework-specifics (`Writable`, `writable`, `languageImporter`)

Options for making i8 work with your favorite framework. i8 was primarily designed for SvelteKit or Svelte with
Vite because it offers nice features like `import.meta.glob`, but if you want to use another framework (I don't judge),
you can override the store type & function and the importer function.

### Adapters (`proxyAdapters`)

You can add adapters to i8 here. An adapter is run after a variable is resolved, and can be used to modify the result,
like
converting `status: (n: number) => n + " language(s) loaded"` called with `$i8.i8.status(2)` to `"2 languages loaded"`.
The
plurality adapter is provided as an example by default.

### Cookie & URL updater (`language.subscribe`)

You can make i8 automatically update the URL and/or the cookie when the language changes. This can be customized there.

### Inspector (`inspect`)

You can control how variables are converted to strings ("inspected", e.g. `$i8.doesnt_exist("a", 1, {b: 2})` becomes
`"doesnt_exist(a, 1, {b: 2})"`). By default, this uses `node-inspect-extracted` to get the same output as in the Node
console, but it can be changed.

### Logger (`log`)

Function to log messages if stuff goes wrong (function error, missing language etc.).

## Adding translations

You can add translations by creating a file in `lang/` with a valid IETF language tag as the name, e.g. `lang/de-DE.ts`.

To get full TypeScript support, your language file should follow this boilerplate:

```ts
import type {LanguageDeclaration} from "$i";

export default {
    // Your translations here
} satisfies LanguageDeclaration;
```

This will give you autocompletion for your translations and will ensure that you use the same names as in the default
language.

Note that this is NOT necessary for the default language, you just `export default { /* ... */ }` there, because that
would be a circular dependency and TypeScript doesn't like that.

You also need to run `node i18n/internal/gen_lang.mjs` to generate language metadata. This is necessary because loading
metadata from *all* languages would be pretty slow, so we do this at build time to generate a static list of languages.
This is why you need to run this command every time you add a new language.

## Using i8

i8 works best with a reactive framework like Svelte or React to enable automatic updates when the language changes.
This is why the `i8` export is a store. In Svelte prefixing a variable with `$` will "dereference" it, so you can use
`$i8` to get the current language in Svelte. In React, you have to follow the `Writable` interface you set
in `settings.ts`. I'll just assume the `$` notation here.

Essentially, $i8 is just a regular object. For example:

```ts
// Language file
export default {
    foo: {
        bar: {
            baz: "Hello world!"
        }
    },
    function: (a: number, b: number) => a + b
}
// Usage
console.log($i8.foo.bar.baz.toString()); // "Hello world!"
console.log($i8.function(1, 2).toString()); // 3
```

You will just get "i18n not initialized! You need to set a language first!" if you execute it like this, because i8
can't
magically know which language you want to use. To properly initialize i8, you need to call `setLang()`. i8 also comes
with
a few tools to help you to determine the language:

```ts
import {resolveLangCode, getBrowserLang, getCookie, getUrlParam} from "$i8";

// Server-side:
let lang_s = resolveLangCode([
    ev.url.searchParams.get("lang"),
    ev.cookies.get("lang"),
    ev.request.headers.get("accept-language"),
]);
// or Client-side:
let lang_c = resolveLangCode([
    getUrlParam("lang"),
    getCookie("lang"),
    getBrowserLang(),
]);

// Then:
await setLang(lang_s);
// or with .then():
setLang(lang_c).then(() => {
    // Do something
});
```

You might have already noticed the `toString()` calls. This is because i8 uses a proxy to make the tree safe to use,
even
with missing translations or even entire missing keys. If you try to access a key that doesn't exist, you will just get
the
path to the key as a string: `$i8.this.really.does.not.exist` will return `"this.really.does.not.exist"`. To make this
work,
every key in the tree has to be an object (or a function, to allow the same thing with function calls!), so for example
calling
`console.log` will log you the object, and not the actual string. i8 automatically sets the `toString` and `valueOf`
properties,
so in places where values are cast to strings, you can just use the variable directly, like in Svelte:

```sveltehtml
<p>{$i8.foo.bar.baz}</p>
```

## No-proxy and no-store mode

You should generally use the store & proxy mode, but if you know what you're doing, you can use the `i8.static`
and `i8.noProxy`
properties on the `i8` store. `i8.static` is the proxied version, but as a static property which is not
reactive. `i8.noProxy`
is the raw object, without the proxy. You need to be really careful with this, because missing translations *might*
throw errors.
For example, `i8.noProxy.foo` is `undefined`, but `i8.noProxy.foo.bar` will throw an error, because `foo` is `undefined`
and
you can't access properties of `undefined`. Just don't do that please. Avoid these properties if you can.

## `language` store

The `language` store stores the current language, and it is writable, so you can set it to a new language, and i8 will
load the requested language. You can also subscribe to it to get notified when the language changes. Note: `language`'s
subscribers will be called *before* the language is actually loaded, and `i8`'s subscribers will be called *after* the
language is loaded.

## Safety

i8 generally should never throw any errors if you use it correctly. Accessing a missing key will just return the path to
the
key as a string, and the same works with function calls, so for
example `$i8.foo.bar.baz("a").a.b(2).c({d: 3}).e.toString()`
will return `"foo.bar.baz(a).a.b(2).c({d: 3}).e"` and throw no errors. Even if one of your adapters fails, i8 will just
replace the string with the error message and log it to the console, but it will never throw an error.

## Why not on NPM?

This library heavily relies on types out of your own project. I could hard-code the types to a location
like `../../src/i18n`,
but that would make it impossible to use i8 in a monorepo, because it relies on the location of the `src` folder. i8
should be
as flexible as possible, so I decided to not publish it on NPM.

## SvelteKit-specifics

To use i8 in SK, add these snippets:

###### +layout.server.ts

```ts
import type {LayoutServerLoad} from "./$types";
import {resolveLangCode} from "$i8";

export const load: LayoutServerLoad = (async ev => {
    let lang = resolveLangCode([
        ev.url.searchParams.get("lang"),
        ev.cookies.get("lang"),
        ev.request.headers.get("accept-language"),
    ]);
    return {lang};
});
```

###### +layout.ts

```ts
import type {LayoutLoad} from "./$types";
import {setLang} from "$i8";

export const load: LayoutLoad = (async ({data}) => {
    await setLang(data.lang);
});

## License

[MIT](https://opensource.org/license/mit/).
