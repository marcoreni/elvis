// i18n extraction test — i18n-06 "activities" domain, lot 3b (`activityApplications` namespace).
//
// FormulaActivitiesModal (function component, `useTranslation`) renders inside a plain-div
// `ModalCustom` (also `useTranslation`) — no react-modal, no aria-hidden. With `formule_items: []`
// the activities list is empty so the `formulaActivitiesModal.noActivities` alert shows. The
// footer buttons pull the cross-namespace `common:actions.cancel` / `common:actions.save`.
//
// The plural keys (`maxSelectable`, `selectToValidate`, `selectAmong`) are asserted at the i18n
// layer: `{count: 1}` -> the `_one` form (singular), `{count: 2}` -> the `_other` form (plural),
// with `selectAmong` keeping its trailing ":" (the missing space before the colon is intentional
// in the source). `selectAmong` is also always rendered by the component, so the count=2 render is
// asserted too.

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../../i18n";
import FormulaActivitiesModal from "./FormulaActivitiesModal";

const props = {
    isOpen: true,
    activeFormula: {id: 1, name: "Trio", number_of_items: 2, formule_items: []},
    isNewFormula: true,
    allActivityRefs: [],
    initialSelectedActivities: [],
    onCancel() {},
    onSave() {},
    onRemoveFormula() {},
};

afterEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("fr");
});

describe("FormulaActivitiesModal — rendered copy", () => {
    test.each([
        [
            "fr",
            {
                modalTitle: "Sélectionner les activités pour la formule",
                activitiesInPackage: 'Activités dans la formule "Trio"',
                activityChoice: "Choix des activités",
                selectAmong: "Sélectionnez 2 activités parmi les suivantes :",
                noActivities: "Aucune activité disponible dans cette formule",
                cancel: "Annuler",
                save: "Enregistrer",
            },
        ],
        [
            "en",
            {
                modalTitle: "Select the activities for the package",
                activitiesInPackage: 'Activities in the "Trio" package',
                activityChoice: "Activity choice",
                selectAmong: "Select 2 activities from the following:",
                noActivities: "No activities available in this package",
                cancel: "Cancel",
                save: "Save",
            },
        ],
    ])("%s", async (lng, x) => {
        await i18n.changeLanguage(lng);
        render(<FormulaActivitiesModal {...props} />);

        expect(screen.getByText(x.modalTitle)).toBeInTheDocument();
        expect(screen.getByText(x.activitiesInPackage)).toBeInTheDocument();
        expect(screen.getByText(x.activityChoice)).toBeInTheDocument();
        expect(screen.getByText(x.selectAmong)).toBeInTheDocument();
        expect(screen.getByText(x.noActivities)).toBeInTheDocument();
        expect(screen.getByRole("button", {name: x.cancel})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: x.save})).toBeInTheDocument();
    });
});

describe("FormulaActivitiesModal — plural keys (i18n layer)", () => {
    const PLURALS = [
        [
            "maxSelectable",
            {fr_one: "activité", fr_other: "activités", en_one: "activity", en_other: "activities"},
        ],
        [
            "selectToValidate",
            {fr_one: "activité", fr_other: "activités", en_one: "activity", en_other: "activities"},
        ],
        [
            "selectAmong",
            {fr_one: "activité", fr_other: "activités", en_one: "activity", en_other: "activities"},
        ],
    ];

    test.each(PLURALS)("%s: count=1 -> singular, count=2 -> plural (fr + en)", key => {
        const fr = i18n.getFixedT("fr", "activityApplications");
        const en = i18n.getFixedT("en", "activityApplications");

        const frOne = fr(`formulaActivitiesModal.${key}`, {count: 1});
        const frOther = fr(`formulaActivitiesModal.${key}`, {count: 2});
        const enOne = en(`formulaActivitiesModal.${key}`, {count: 1});
        const enOther = en(`formulaActivitiesModal.${key}`, {count: 2});

        for (const v of [frOne, frOther, enOne, enOther]) {
            expect(v).not.toMatch(/\{\{/);
            expect(v).not.toBe(`formulaActivitiesModal.${key}`);
        }

        // fr: "activité" is a substring of "activités", so pin the singular by *excluding* the plural.
        expect(frOne).toContain("1 activité");
        expect(frOne).not.toContain("activités");
        expect(frOther).toContain("2 activités");

        expect(enOne).toContain("1 activity");
        expect(enOne).not.toContain("activities");
        expect(enOther).toContain("2 activities");
    });

    test("selectAmong has its trailing colon spaced (fr typo fixed)", () => {
        const fr = i18n.getFixedT("fr", "activityApplications");
        const en = i18n.getFixedT("en", "activityApplications");
        expect(fr("formulaActivitiesModal.selectAmong", {count: 2})).toBe(
            "Sélectionnez 2 activités parmi les suivantes :"
        );
        expect(en("formulaActivitiesModal.selectAmong", {count: 2})).toBe(
            "Select 2 activities from the following:"
        );
    });
});

// Regression: the duration cell's "min" suffix used to be a hardcoded literal, not routed through
// i18n (activityApplications:units.minuteAbbrev) -- the "--" placeholder for a missing duration is
// left as a plain sentinel (not language text), matching the same convention as the "/" fallback in
// the sibling SelectedActivitiesTable.
describe("FormulaActivitiesModal — duration cell goes through activityApplications:units.minuteAbbrev", () => {
    const formulaProps = {
        ...props,
        activeFormula: {
            id: 1,
            name: "Trio",
            number_of_items: 2,
            formule_items: [
                {item_type: "ActivityRef", item: {id: 5}},
                {item_type: "ActivityRef", item: {id: 6}},
            ],
        },
        allActivityRefs: [
            {id: 5, label: "Piano", duration: 45},
            {id: 6, label: "Solfège", duration: null},
        ],
    };

    // The cell's "45" / "min" / "--" pieces are separate JSX text nodes, so match on the <td>'s
    // combined textContent rather than an exact getByText (which only joins direct text children).
    const cellWithText = text =>
        screen.getByText((_content, node) => node.tagName === "TD" && node.textContent.trim() === text);

    for (const lng of ["fr", "en"]) {
        test(`${lng}: a set duration renders "45 min", a missing one renders "--" with no suffix`, async () => {
            await i18n.changeLanguage(lng);
            render(<FormulaActivitiesModal {...formulaProps} />);

            expect(cellWithText("45 min")).toBeInTheDocument();
            expect(cellWithText("--")).toBeInTheDocument();
        });
    }
});
