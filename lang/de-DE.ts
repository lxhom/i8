import type {LanguageDeclaration} from "$i";

export default {
    i8: {
        status: (n: number) => `${n} Sprache(n) geladen`,
        name: "i8 Sprachbibliothek",
    },
} satisfies LanguageDeclaration;
