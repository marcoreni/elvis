// Regression tests for the PR #4 review fixes: fallbackLng must track the server-rendered
// <html lang>, and SUPPORTED_LOCALES must be derived from the actually-loaded resources rather
// than a hand-maintained copy. Each case re-imports the module after resetting document.lang,
// since both are computed once at module-eval time.

describe("frontend/i18n", () => {
    afterEach(() => {
        vi.resetModules();
        document.documentElement.lang = "";
    });

    test("supportedLngs is derived from the loaded resources (fr, en)", async () => {
        document.documentElement.lang = "fr";
        const { default: i18n } = await import("./index");

        expect(i18n.options.supportedLngs).toEqual(
            expect.arrayContaining(["fr", "en"])
        );
    });

    test("fallbackLng tracks document.documentElement.lang at init time", async () => {
        document.documentElement.lang = "en";
        const { default: i18n } = await import("./index");

        expect(i18n.options.fallbackLng).toEqual(["en"]);
    });

    test("falls back to fr when document.documentElement.lang is empty", async () => {
        document.documentElement.lang = "";
        const { default: i18n } = await import("./index");

        expect(i18n.options.fallbackLng).toEqual(["fr"]);
    });

    test("ns/defaultNS are still explicitly set to common (i18next does not infer ns from defaultNS)", async () => {
        document.documentElement.lang = "fr";
        const { default: i18n } = await import("./index");

        expect(i18n.options.defaultNS).toBe("common");
        expect(i18n.options.ns).toEqual(["common", "users", "evaluation", "payments", "formules", "planning"]);
    });

    // Regression: moment.locale() used to be set with `moment.locale(i18n.language)` right after
    // init(), but that ran before the language was resolved / and the languageChanged listener
    // was registered after init() — so moment stayed on its built-in "en" until the next
    // changeLanguage(). It must now match the resolved language immediately on import.
    // `moment` is imported here from the same module graph ./index just used (after any
    // vi.resetModules()), not a stale top-level binding.
    test("moment's locale matches the resolved i18n language right after import", async () => {
        document.documentElement.lang = "fr";
        const { default: i18n } = await import("./index");
        const { default: moment } = await import("moment");

        expect(i18n.language).toBe("fr");
        expect(moment.locale()).toBe("fr");
    });

    test("moment's locale follows a later changeLanguage()", async () => {
        document.documentElement.lang = "fr";
        const { default: i18n } = await import("./index");
        const { default: moment } = await import("moment");

        await i18n.changeLanguage("en");
        expect(moment.locale()).toBe("en");

        await i18n.changeLanguage("fr");
    });
});
