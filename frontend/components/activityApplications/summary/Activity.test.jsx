// i18n extraction test — i18n-06 "activities" domain, lot 3f (`activityApplications` namespace,
// `summaryActivity.*` keys). Covers `Activity.jsx` (the per-activity admin panel inside the
// application summary page).
//
// The file has three units:
//   1. `LevelCell`  — module-local fn component (`useTranslation`), fires an `api.set().get(...)`
//      on mount. NOT exported → its keys (`common:loading`, `summaryActivity.notSpecified`) are
//      reachable only through `SubStudentList`, which needs deep `row.original` fixture data, so
//      they are asserted at the i18n layer.
//   2. `SubStudentList` — module-local fn component (`useTranslation`), rendered as the
//      `<ReactTable>` `SubComponent`. NOT exported → its keys (`headcountAt`, `ageYears`, the
//      `col*` <th>s) are asserted at the i18n layer.
//   3. `Activity` — default export, `class` wrapped in `withTranslation("activityApplications")`.
//      `componentDidMount → loadSuggestions()` does `fetch(".../suggestions?mode=...")`. Its
//      `render()` threads `t` (from props, injected by the HOC) into the column Headers, the
//      header toggle buttons + <i> labels, the `<ReactTable>` `common:reactTable.*` props and the
//      level-edit `<ReactModal>`. Mounted here with `react-table` / `react-modal` /
//      `./WorkGroupEditor` mocked so the translated strings render synchronously.

import React from "react";
import {render, screen, within, waitFor} from "@testing-library/react";
import _ from "lodash";
import i18n from "../../../i18n";
import Activity from "./Activity";

// `global._ = (await import("lodash")).default` equivalent — some transitive helpers in this tree
// read the lodash global without importing it.
global._ = _;

// --- mocks -----------------------------------------------------------------------------------

// react-table@6 default export. Render the string Headers + the `common:reactTable.*` text props
// so the translated copy is assertable without a real grid.
// A row fixture the `SubComponent` (= `SubStudentList`) can render against.
export const SUB_ROW = {
    original: {
        id: 10,
        closest_lesson: "2025-09-01T00:00:00",
        activity_ref: {is_work_group: false, id: 3},
        activity_ref_id: 3,
        time_interval: {id: 7, start: "2025-09-01T17:00:00"},
        users: [{id: 99, first_name: "Jean", last_name: "Dupont", birthday: "2014-01-01"}],
        inactive_users: [],
        options: [],
        activities_instruments: [],
    },
};

vi.mock("react-table", () => ({
    default: props => (
        <div data-testid="react-table">
            <div data-testid="rt-headers">
                {(props.columns || []).map((c, i) => (
                    <span key={i} className="rt-th">
                        {typeof c.Header === "string" ? c.Header : null}
                    </span>
                ))}
            </div>
            <span data-testid="rt-previousText">{props.previousText}</span>
            <span data-testid="rt-nextText">{props.nextText}</span>
            <span data-testid="rt-loadingText">{props.loadingText}</span>
            <span data-testid="rt-noDataText">{props.noDataText}</span>
            <span data-testid="rt-pageText">{props.pageText}</span>
            <span data-testid="rt-ofText">{props.ofText}</span>
            <span data-testid="rt-rowsText">{props.rowsText}</span>
            {typeof props.SubComponent === "function" ? (
                <div data-testid="rt-sub">{props.SubComponent(SUB_ROW)}</div>
            ) : null}
        </div>
    ),
}));

// LevelCell fires api.set().get(...).then(...) on mount, and falls back to
// TimeIntervalHelpers.levelDisplayForActivity. Keep the real helpers except level display, which
// we force to the "NON INDIQUÉ" sentinel so the translated placeholder path is exercised.
vi.mock("../../planning/TimeIntervalHelpers", async importOriginal => {
    const actual = await importOriginal();
    return {...actual, levelDisplayForActivity: () => "NON INDIQUÉ"};
});

// react-modal — render children unconditionally so the level-edit modal body is in the DOM.
vi.mock("react-modal", () => ({
    default: ({children}) => <div data-testid="react-modal">{children}</div>,
}));

vi.mock("./WorkGroupEditor", () => ({default: () => <div data-testid="work-group-editor" />}));

// `../../../tools/api` chainable — `handleSubmitStudentLevel` uses `api.set().success(cb).post/del`;
// not hit on mount/render, stubbed defensively.
vi.mock("../../../tools/api", () => {
    const chain = {
        before: () => chain,
        useLoading: () => chain,
        success: () => chain,
        error: () => chain,
        get: vi.fn(() => Promise.resolve()),
        post: vi.fn(() => Promise.resolve()),
        patch: vi.fn(() => Promise.resolve()),
        del: vi.fn(() => Promise.resolve()),
    };
    return {set: () => chain};
});

// --- props ---------------------------------------------------------------------------------------

// Minimum the constructor + a single render pass dereference. `activityRef.kind` is deliberately
// NOT "Enfance" (that branch walks `application.user.activity_applications`), and
// `pre_application_activity` is null (skips the pre-application `previousActivity` branch).
// `instruments` is non-empty so the `summaryActivity.instruments` <i> label renders — the guard is
// `!this.props.instruments.length == 0`, which is falsy (i.e. block hidden) for an empty array.
const baseProps = () => ({
    desiredActivity: {id: 5, is_validated: false},
    activityRef: {id: 7, kind: "Ado", label: "Piano"},
    application: {
        id: 100,
        season_id: 1,
        user_id: 2,
        user: {id: 2, levels: []},
        pre_application_activity: null,
    },
    desiredActivities: [],
    activityRefs: [],
    suggestions: [],
    instruments: [{label: "Piano"}],
    studentEvaluationQuestions: [],
    detectedEvaluation: null,
    evaluationLevelRefs: [],
    seasons: [],
    handleChangeDesiredActivity() {},
    handleAddSuggestions: vi.fn(() => Promise.resolve()),
    isAlreadyBusy: () => false,
    handleSelectSuggestion: () => Promise.resolve(),
    handleRemoveStudent: () => Promise.resolve(),
    handleSelectSuggestionOption: () => Promise.resolve(),
    handleRemoveSuggestionOption: () => Promise.resolve(),
    handleUpdateStudentLevel() {},
    handleDeleteStudentLevel() {},
});

beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({json: () => Promise.resolve([])});
});

afterEach(async () => {
    vi.clearAllMocks();
    delete global.fetch;
    await i18n.changeLanguage("fr");
});

// ==============================================================================================
// A. WrappedComponent guard
// ==============================================================================================

describe("Activity — withTranslation HOC shape", () => {
    test("default export wraps a React.Component class that is not a StepZilla step", () => {
        expect(Activity.WrappedComponent).toBeDefined();
        expect(Activity.WrappedComponent.prototype instanceof React.Component).toBe(true);
        // StepZilla steps expose `isValidated` on the prototype; this panel must not.
        expect(Activity.WrappedComponent.prototype.isValidated).toBeUndefined();
    });
});

// ==============================================================================================
// B. Shallow mount — translated Headers, toggle buttons, <i> labels, reactTable props, modal
// ==============================================================================================

describe("Activity — rendered copy per locale", () => {
    const CASES = {
        fr: {
            headers: {
                colGroup: "Groupe",
                colDay: "Jour",
                colTeacher: "Professeur",
                colSchedule: "Horaires",
                colOccupied: "Occupées",
                colActions: "Actions",
            },
            previousText: "Précédent",
            noDataText: "Aucune donnée",
            suggestedCourses: "Cours suggérés",
            allCoursesOf: /Tous les cours de/,
            studentLevel: "Niveau de l'élève",
            groupChange: "Changement de groupe",
            instruments: "Instruments",
            suggestionCriteria: /critères pour les cours suggérés/,
            modal: {
                title: /Edition du niveau de Piano/,
                notSpecified: "NON INDIQUÉ",
                cancel: "Annuler",
                save: "Enregistrer",
            },
            sub: {
                headcountAt: /Effectifs au :/,
                cols: ["Nom", "Âge", "Niveau", "Début le", "Arrêt le"],
                ageYears: /\d+ ans/,
                levelCell: "NON INDIQUÉ", // LevelCell -> summaryActivity.notSpecified
            },
        },
        en: {
            headers: {
                colGroup: "Group",
                colDay: "Day",
                colTeacher: "Teacher",
                colSchedule: "Schedule",
                colOccupied: "Occupied",
                colActions: "Actions",
            },
            previousText: "Previous",
            noDataText: "No data",
            suggestedCourses: "Suggested courses",
            allCoursesOf: /All courses of/,
            studentLevel: "Student level",
            groupChange: "Group change",
            instruments: "Instruments",
            suggestionCriteria: /criteria for suggested courses/,
            modal: {
                title: /Edit Piano's level/,
                notSpecified: "NOT SPECIFIED",
                cancel: "Cancel",
                save: "Save",
            },
            sub: {
                headcountAt: /Headcount as of/,
                cols: ["Name", "Age", "Level", "Start on", "Stop on"],
                ageYears: /\d+ years old/,
                levelCell: "NOT SPECIFIED",
            },
        },
    };

    test.each(["fr", "en"])("%s", async lng => {
        await i18n.changeLanguage(lng);
        const expected = CASES[lng];

        render(<Activity {...baseProps()} />);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        // fetch URL carries the suggestions mode (loadSuggestions mechanic)
        expect(global.fetch.mock.calls[0][0]).toMatch(
            /\/applications\/100\/desired_activities\/5\/suggestions\?mode=CUSTOM/,
        );

        // --- ReactTable column Headers ---
        const headers = screen.getByTestId("rt-headers");
        for (const label of Object.values(expected.headers)) {
            expect(within(headers).getByText(label)).toBeInTheDocument();
        }

        // --- ReactTable common:reactTable.* text props ---
        expect(screen.getByTestId("rt-previousText")).toHaveTextContent(expected.previousText);
        expect(screen.getByTestId("rt-noDataText")).toHaveTextContent(expected.noDataText);

        // --- header toggle button + <i> labels ---
        expect(screen.getByText(expected.suggestedCourses)).toBeInTheDocument();
        expect(screen.getByText(expected.allCoursesOf)).toBeInTheDocument();
        expect(screen.getByText(expected.studentLevel)).toBeInTheDocument();
        expect(screen.getByText(expected.groupChange)).toBeInTheDocument();
        expect(screen.getByText(expected.instruments)).toBeInTheDocument();
        expect(screen.getByText(expected.suggestionCriteria)).toBeInTheDocument();

        // --- level-edit ReactModal ---
        const modal = screen.getByTestId("react-modal");
        expect(within(modal).getByText(expected.modal.title)).toBeInTheDocument();
        expect(within(modal).getByText(expected.modal.notSpecified)).toBeInTheDocument();
        expect(within(modal).getByText(expected.modal.cancel)).toBeInTheDocument();
        expect(within(modal).getByText(expected.modal.save)).toBeInTheDocument();

        // --- SubStudentList (the <ReactTable> SubComponent) + its nested <LevelCell> ---
        const sub = screen.getByTestId("rt-sub");
        expect(within(sub).getByText(expected.sub.headcountAt)).toBeInTheDocument();
        for (const col of expected.sub.cols) {
            expect(within(sub).getByText(col)).toBeInTheDocument();
        }
        expect(within(sub).getByText(expected.sub.ageYears)).toBeInTheDocument();
        // LevelCell resolves its useEffect async; the fallback path (levelDisplayForActivity
        // mocked to "NON INDIQUÉ") renders summaryActivity.notSpecified.
        await waitFor(() =>
            expect(within(sub).getByText(expected.sub.levelCell)).toBeInTheDocument(),
        );
    });
});

// ==============================================================================================
// C. i18n layer — every summaryActivity.* key resolves in both locales
// ==============================================================================================

describe("Activity — summaryActivity.* i18n layer", () => {
    const KEYS = [
        "notSpecified",
        "notAssigned",
        "headcountAt",
        "ageYears",
        "collapseAll",
        "expandAll",
        "noLevel",
        "removeOption",
        "option",
        "newRequest",
        "previousActivity",
        "slotNotFound",
        "notIndicated",
        "notSpecifiedShort",
        "suggestedCourses",
        "allCoursesOf",
        "studentLevel",
        "groupChange",
        "accompanyingPerson",
        "instruments",
        "suggestionCriteria",
        "editLevelTitle",
        "colName",
        "colAge",
        "colLevel",
        "colInstrument",
        "colStartDate",
        "colStopDate",
        "colRank",
        "colGroup",
        "colDay",
        "colCourseFamily",
        "colSchedule",
        "colTeacher",
        "colLocation",
        "colOccupied",
        "colActions",
        "removeFromSlot",
        "select",
    ];

    test("the key list is exactly the 39 summaryActivity keys", () => {
        expect(KEYS).toHaveLength(39);
        expect(new Set(KEYS).size).toBe(39);
    });

    test.each(["fr", "en"])("all 39 keys resolve to real, fully-interpolated copy in %s", lng => {
        const t = i18n.getFixedT(lng, "activityApplications");
        for (const key of KEYS) {
            const v = t(`summaryActivity.${key}`, {
                date: "01/09/2025",
                age: 9,
                name: "Piano",
                label: "Piano",
            });
            expect(typeof v).toBe("string");
            expect(v.length).toBeGreaterThan(0);
            expect(v).not.toBe(`summaryActivity.${key}`);
            expect(v).not.toContain("{{");
            expect(v).not.toContain("}}");
        }
    });

    test("headcountAt keeps the French space before the colon; en reads naturally", () => {
        const fr = i18n.getFixedT("fr", "activityApplications");
        const en = i18n.getFixedT("en", "activityApplications");
        expect(fr("summaryActivity.headcountAt", {date: "01/09/2025"})).toBe(
            "Effectifs au : 01/09/2025",
        );
        expect(en("summaryActivity.headcountAt", {date: "01/09/2025"})).toBe(
            "Headcount as of 01/09/2025",
        );
    });

    test("ageYears interpolates {{age}}", () => {
        expect(
            i18n.getFixedT("fr", "activityApplications")("summaryActivity.ageYears", {age: 9}),
        ).toBe("9 ans");
        expect(
            i18n.getFixedT("en", "activityApplications")("summaryActivity.ageYears", {age: 9}),
        ).toBe("9 years old");
    });

    test("allCoursesOf interpolates {{name}}", () => {
        for (const lng of ["fr", "en"]) {
            const v = i18n.getFixedT(lng, "activityApplications")(
                "summaryActivity.allCoursesOf",
                {name: "Piano"},
            );
            expect(v).toContain("Piano");
            expect(v).not.toContain("{{");
        }
    });

    test("editLevelTitle interpolates {{label}} and preserves the 'Edition' typo (fr)", () => {
        const fr = i18n.getFixedT("fr", "activityApplications")("summaryActivity.editLevelTitle", {
            label: "Piano",
        });
        expect(fr).toContain("Edition");
        expect(fr).not.toContain("Édition");
        expect(fr).toContain("Piano");

        const en = i18n.getFixedT("en", "activityApplications")("summaryActivity.editLevelTitle", {
            label: "Piano",
        });
        expect(en).toContain("Piano");
    });

    test("notSpecified (all-caps) and notIndicated (sentence case) are distinct fr strings", () => {
        const fr = i18n.getFixedT("fr", "activityApplications");
        expect(fr("summaryActivity.notSpecified")).toBe("NON INDIQUÉ");
        expect(fr("summaryActivity.notIndicated")).toBe("Non indiqué");
        expect(fr("summaryActivity.notSpecified")).not.toBe(fr("summaryActivity.notIndicated"));
    });

    test("lot-3f new keys removeFromSlot / select resolve in both locales", () => {
        const fr = i18n.getFixedT("fr", "activityApplications");
        const en = i18n.getFixedT("en", "activityApplications");
        expect(fr("summaryActivity.removeFromSlot")).toBe("Retirer de ce créneau");
        expect(en("summaryActivity.removeFromSlot")).toBe("Remove from this slot");
        expect(fr("summaryActivity.select")).toBe("Sélectionner");
        expect(en("summaryActivity.select")).toBe("Select");
    });
});
