// Regression tests for the PR #4 review fixes: fallbackLng must track the server-rendered
// <html lang>, and SUPPORTED_LOCALES must be derived from the actually-loaded resources rather
// than a hand-maintained copy. Each case re-requires the module after resetting document.lang,
// since both are computed once at module-eval time.

describe("frontend/i18n", () => {
    afterEach(() => {
        jest.resetModules();
        document.documentElement.lang = "";
    });

    test("supportedLngs is derived from the loaded resources (fr, en)", () => {
        document.documentElement.lang = "fr";
        const i18n = require("./index").default;

        expect(i18n.options.supportedLngs).toEqual(
            expect.arrayContaining(["fr", "en"])
        );
    });

    test("fallbackLng tracks document.documentElement.lang at init time", () => {
        document.documentElement.lang = "en";
        const i18n = require("./index").default;

        expect(i18n.options.fallbackLng).toEqual(["en"]);
    });

    test("falls back to fr when document.documentElement.lang is empty", () => {
        document.documentElement.lang = "";
        const i18n = require("./index").default;

        expect(i18n.options.fallbackLng).toEqual(["fr"]);
    });

    test("ns/defaultNS are still explicitly set to common (i18next does not infer ns from defaultNS)", () => {
        document.documentElement.lang = "fr";
        const i18n = require("./index").default;

        expect(i18n.options.defaultNS).toBe("common");
        expect(i18n.options.ns).toEqual(["common"]);
    });
});
