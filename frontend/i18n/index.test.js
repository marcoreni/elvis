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
        expect(i18n.options.ns).toEqual(["common", "users", "evaluation", "payments"]);
    });
});
