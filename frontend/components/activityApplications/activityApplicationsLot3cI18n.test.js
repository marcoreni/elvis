// i18n-layer coverage — i18n-06 "activities" domain, lot 3c (`activityApplications` namespace).
//
// Every key added for lot 3c (FormulaChoice `formulaChoice.*`, ActivityChoice `activityChoice.*`)
// must resolve in BOTH fr and en: non-empty, not echoed back as the key, and with no leftover
// "{{" once interpolated.
//
// Uses i18n.getFixedT so it needs no changeLanguage churn.

import i18n from "../../i18n";

const NS = "activityApplications";

// [key, interpolation options]
const KEYS = [
    // FormulaChoice
    ["formulaChoice.noDescription", {}],
    ["formulaChoice.noActivitiesSelected", {}],
    ["formulaChoice.title", {}],
    ["formulaChoice.price", {}],
    ["formulaChoice.searchPlaceholder", {}],
    ["formulaChoice.colPackage", {}],
    ["formulaChoice.colEstimatedPrice", {}],
    ["formulaChoice.noPackagesAvailable", {}],
    ["formulaChoice.summary", {}],
    ["formulaChoice.colDuration", {}],
    ["formulaChoice.noPackagesSelected", {}],
    ["formulaChoice.estimatedTotal", {}],
    // ActivityChoice
    ["activityChoice.formulaPrefix", {name: "Trio"}],
    ["activityChoice.title", {}],
    ["activityChoice.duration", {}],
    ["activityChoice.searchPlaceholder", {}],
    ["activityChoice.colActivity", {}],
    ["activityChoice.colEstimatedPrice", {}],
    ["activityChoice.summary", {}],
    ["activityChoice.noActivitySelected", {}],
    ["activityChoice.estimatedTotal", {}],
    ["activityChoice.unpopularWarning", {}],
];

describe.each(["fr", "en"])("activityApplications lot-3c keys resolve in %s", lng => {
    const t = i18n.getFixedT(lng, NS);

    test.each(KEYS)("%s (%o) resolves to real, interpolated copy", (key, opts) => {
        const value = t(key, opts);
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
        expect(value).not.toBe(key);
        expect(value).not.toMatch(/\{\{/);
    });
});

describe("lot-3c copy specifics", () => {
    const fr = i18n.getFixedT("fr", NS);
    const en = i18n.getFixedT("en", NS);

    test("formulaChoice.estimatedTotal keeps its trailing colon in both locales", () => {
        expect(fr("formulaChoice.estimatedTotal")).toBe("Total estimé :");
        expect(en("formulaChoice.estimatedTotal")).toBe("Estimated total:");
    });

    test("activityChoice.estimatedTotal has no trailing colon in either locale", () => {
        expect(fr("activityChoice.estimatedTotal")).toBe("Total estimé");
        expect(en("activityChoice.estimatedTotal")).toBe("Estimated total");
    });

    test("activityChoice.noActivitySelected: both locales capitalised (fr typo fixed)", () => {
        expect(fr("activityChoice.noActivitySelected")).toBe("Aucune activité sélectionnée");
        expect(en("activityChoice.noActivitySelected")).toBe("No activity selected");
    });

    test("activityChoice.formulaPrefix — fr keeps the space before the colon, en has none", () => {
        expect(fr("activityChoice.formulaPrefix", {name: "Trio"})).toBe("Formule : Trio");
        expect(en("activityChoice.formulaPrefix", {name: "Trio"})).toBe("Package: Trio");
        expect(fr("activityChoice.formulaPrefix", {name: "Trio"})).not.toMatch(/\{\{/);
        expect(en("activityChoice.formulaPrefix", {name: "Trio"})).not.toMatch(/\{\{/);
    });
});
