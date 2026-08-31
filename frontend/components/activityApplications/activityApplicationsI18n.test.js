// i18n-layer coverage — i18n-06 "activities" domain, lot 3a (`activityApplications` namespace).
//
// Every key added for lot 3a must resolve in BOTH fr and en (non-empty, not echoed back as the
// key, no leftover "{{" once interpolated), and the interpolated ones must substitute their
// placeholders. This guards the raw locale files independently of any component render — a
// missing/typo'd key here fails the matching-language test rather than silently falling through
// to the key string in the UI. Uses i18n.getFixedT so it needs no changeLanguage churn.

import i18n from "../../i18n";

const NS = "activityApplications";

// [key, interpolation options]
const KEYS = [
    ["wrappedActivityChoice.noActivityError", {}],
    ["applicationChangeQuestionnaire.requiredQuestionsError", {}],
    ["evaluation.answerQuestionnairesError", {}],
    ["intervalPreferencesEditor.title", {label: "Piano"}],
    ["timePreferences.title", {}],
    ["evaluationChoice.noIntervalMessage", {}],
    ["evaluationChoice.forKind", {kind: "Piano"}],
    ["evaluationChoice.selectedSlots", {}],
    ["evaluationChoiceTable.selectedSlotsForKind", {kind: "Piano"}],
    ["choices.choiceN", {n: 1}],
    ["timePreferencesTable.myChoicesFor", {label: "Piano"}],
    ["selectedActivitiesTable.activity", {}],
    ["selectedActivitiesTable.duration", {}],
    ["selectedActivitiesTable.estimatedPrice", {}],
    ["selectedActivitiesTable.estimatedTotal", {}],
    ["addPreApp.confirmHtml", {firstName: "Jean", lastName: "Dupont", season: "2025-2026"}],
    ["addPreApp.alreadyDone", {}],
    ["addPreApp.openButton", {}],
];

describe.each(["fr", "en"])("activityApplications namespace resolves in %s", lng => {
    const t = i18n.getFixedT(lng, NS);

    test.each(KEYS)("%s resolves to real copy", (key, opts) => {
        const value = t(key, opts);
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
        expect(value).not.toBe(key);
        expect(value).not.toMatch(/\{\{/);
    });
});

describe("interpolation substitutes placeholders", () => {
    test.each(["fr", "en"])("intervalPreferencesEditor.title carries {label} in %s", lng => {
        expect(i18n.getFixedT(lng, NS)("intervalPreferencesEditor.title", {label: "Piano"})).toContain("Piano");
    });

    test("evaluationChoice.forKind reads 'Pour <kind>' / 'For <kind>'", () => {
        expect(i18n.getFixedT("fr", NS)("evaluationChoice.forKind", {kind: "Piano"})).toBe("Pour Piano");
        expect(i18n.getFixedT("en", NS)("evaluationChoice.forKind", {kind: "Piano"})).toBe("For Piano");
    });

    test("evaluationChoiceTable.selectedSlotsForKind ends with the kind", () => {
        expect(i18n.getFixedT("fr", NS)("evaluationChoiceTable.selectedSlotsForKind", {kind: "Piano"}))
            .toBe("Créneaux d'évaluation sélectionnés pour Piano");
        expect(i18n.getFixedT("en", NS)("evaluationChoiceTable.selectedSlotsForKind", {kind: "Piano"}))
            .toBe("Selected evaluation slots for Piano");
    });

    test("choices.choiceN reads 'Choix n°1' / 'Choice no. 1'", () => {
        expect(i18n.getFixedT("fr", NS)("choices.choiceN", {n: 1})).toBe("Choix n°1");
        expect(i18n.getFixedT("en", NS)("choices.choiceN", {n: 1})).toBe("Choice no. 1");
    });

    test("timePreferencesTable.myChoicesFor carries {label}", () => {
        expect(i18n.getFixedT("fr", NS)("timePreferencesTable.myChoicesFor", {label: "Piano"}))
            .toBe("Mes choix de créneaux pour Piano");
        expect(i18n.getFixedT("en", NS)("timePreferencesTable.myChoicesFor", {label: "Piano"}))
            .toBe("My slot choices for Piano");
    });

    test.each(["fr", "en"])("addPreApp.confirmHtml substitutes firstName/lastName/season in %s", lng => {
        const value = i18n.getFixedT(lng, NS)("addPreApp.confirmHtml", {
            firstName: "Jean",
            lastName: "Dupont",
            season: "2025-2026",
        });
        expect(value).toContain("Jean Dupont");
        expect(value).toContain("2025-2026");
        expect(value).not.toMatch(/\{\{/);
    });
});

// AddPreAppFromStopApp.onClick also pulls two cross-namespace common keys for the Swal buttons.
describe("cross-namespace common keys used by AddPreAppFromStopApp", () => {
    test.each(["fr", "en"])("common:actions.confirm / .cancel resolve in %s", lng => {
        const t = i18n.getFixedT(lng, "common");
        expect(t("actions.confirm")).not.toBe("actions.confirm");
        expect(t("actions.cancel")).not.toBe("actions.cancel");
        expect(t("actions.confirm").length).toBeGreaterThan(0);
        expect(t("actions.cancel").length).toBeGreaterThan(0);
    });
});
