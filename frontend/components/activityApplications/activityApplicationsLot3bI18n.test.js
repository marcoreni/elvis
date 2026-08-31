// i18n-layer coverage — i18n-06 "activities" domain, lot 3b (`activityApplications` namespace).
//
// Every key added for lot 3b (UserSearch, TimeIntervalPreferencesEditor, FormulaActivitiesModal,
// summary/WorkGroupEditor, WizardUserSelectMember) must resolve in BOTH fr and en: non-empty, not
// echoed back as the key, and with no leftover "{{" once interpolated. The `<Trans>` key
// `userSearch.otherwiseCreate` deliberately keeps its "<1>…</1>" element placeholder (react-i18next
// fills it from the component's children at render time), so it is exempted from the no-markup
// check but still must resolve and interpolate cleanly.
//
// Uses i18n.getFixedT so it needs no changeLanguage churn.

import i18n from "../../i18n";

const NS = "activityApplications";

// [key, interpolation options]
const KEYS = [
    // UserSearch
    ["userSearch.title", {}],
    ["userSearch.saved", {}],
    ["userSearch.lastName", {}],
    ["userSearch.firstName", {}],
    ["userSearch.results", {}],
    ["userSearch.bornOn", {date: "01/09/2020", number: 42}],
    ["userSearch.noProfileFound", {}],
    ["userSearch.checkCoordinates", {}],
    ["userSearch.createNewProfile", {}],
    ["userSearch.addContactModalLabel", {}],
    // TimeIntervalPreferencesEditor
    ["timeIntervalPreferences.teacherPhotoAlt", {}],
    ["timeIntervalPreferences.with", {}],
    ["timeIntervalPreferences.availableSlots", {}],
    ["timeIntervalPreferences.chosenSlot", {}],
    ["timeIntervalPreferences.preferenceOrder", {}],
    ["timeIntervalPreferences.noSlotSuitable", {}],
    // FormulaActivitiesModal
    ["formulaActivitiesModal.modalTitle", {}],
    ["formulaActivitiesModal.individualActivities", {}],
    ["formulaActivitiesModal.activitiesInPackage", {name: "Trio"}],
    ["formulaActivitiesModal.searchPlaceholder", {}],
    ["formulaActivitiesModal.activityChoice", {}],
    ["formulaActivitiesModal.colActivity", {}],
    ["formulaActivitiesModal.colDuration", {}],
    ["formulaActivitiesModal.noActivities", {}],
    ["formulaActivitiesModal.selectedCount", {}],
    ["formulaActivitiesModal.maxSelectable", {count: 1}],
    ["formulaActivitiesModal.maxSelectable", {count: 2}],
    ["formulaActivitiesModal.selectToValidate", {count: 1}],
    ["formulaActivitiesModal.selectToValidate", {count: 2}],
    ["formulaActivitiesModal.selectAmong", {count: 1}],
    ["formulaActivitiesModal.selectAmong", {count: 2}],
    // summary/WorkGroupEditor
    ["workGroupEditor.toAssign", {}],
    ["workGroupEditor.instrumentPlaceholder", {}],
    ["workGroupEditor.deleteRole", {}],
    ["workGroupEditor.cannotAddMultiple", {}],
    ["workGroupEditor.option", {}],
    ["workGroupEditor.alreadyInAnotherWorkshop", {}],
    ["workGroupEditor.removeFromRole", {}],
    ["workGroupEditor.removeOptionError", {}],
    ["workGroupEditor.removeStudentError", {}],
    ["workGroupEditor.student", {}],
    ["workGroupEditor.instrument", {}],
    ["workGroupEditor.attemptDate", {}],
    ["workGroupEditor.actions", {}],
    ["workGroupEditor.addRole", {}],
    ["workGroupEditor.close", {}],
    // WizardUserSelectMember
    ["wizardUserSelectMember.errorTitle", {}],
    ["wizardUserSelectMember.fetchMembersError", {}],
    ["wizardUserSelectMember.close", {}],
    ["wizardUserSelectMember.selectMember", {}],
    ["wizardUserSelectMember.selectLegalRepresentative", {}],
    ["wizardUserSelectMember.legalRepresentativeMustBeAdult", {}],
    ["wizardUserSelectMember.memberConcerned", {}],
    ["wizardUserSelectMember.addMember", {}],
    ["wizardUserSelectMember.ifMinorAddMember", {}],
    ["wizardUserSelectMember.legalRepresentative", {}],
    ["wizardUserSelectMember.personToContact", {}],
    ["wizardUserSelectMember.accompanyingPerson", {}],
    ["wizardUserSelectMember.familyLinkCreation", {name: "Jean Dupont"}],
];

// react-i18next <Trans> keys — keep their "<n>…</n>" element placeholders on purpose.
const TRANS_KEYS = [["userSearch.otherwiseCreate", {}]];

describe.each(["fr", "en"])("activityApplications lot-3b keys resolve in %s", lng => {
    const t = i18n.getFixedT(lng, NS);

    test.each(KEYS)("%s (%o) resolves to real, interpolated copy", (key, opts) => {
        const value = t(key, opts);
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
        expect(value).not.toBe(key);
        expect(value).not.toMatch(/\{\{/);
    });

    test.each(TRANS_KEYS)("%s (<Trans>) resolves and interpolates, keeps <1>", (key, opts) => {
        const value = t(key, opts);
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
        expect(value).not.toBe(key);
        expect(value).not.toMatch(/\{\{/);
        expect(value).toMatch(/<1>.*<\/1>/);
    });
});

describe("cross-namespace common keys used in lot 3b", () => {
    test.each(["fr", "en"])("common:actions.cancel / .save / .validate resolve in %s", lng => {
        const t = i18n.getFixedT(lng, "common");
        for (const key of ["actions.cancel", "actions.save", "actions.validate"]) {
            expect(t(key)).not.toBe(key);
            expect(t(key).length).toBeGreaterThan(0);
        }
    });
});
