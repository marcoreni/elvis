// i18n extraction test — i18n-06 "activities" domain, lot 3f (`activityApplications` namespace,
// `summaryActivity.*` keys). Covers `Activity.jsx` (the per-activity admin panel inside the
// application summary page).
//
// The file has three units:
//   1. `LevelCell`  — module-local fn component (`useTranslation`), fires an `api.set().get(...)`
//      on mount. NOT exported → its keys (`common:loading`, `summaryActivity.notSpecified`) are
//      reachable only through `SubStudentList`, which needs deep `row.original` fixture data, so
//      they are asserted at the i18n layer.
//   2. `SubStudentList` — module-local fn component (`useTranslation`), rendered via
//      `TanStackGrid`'s `renderSubComponent`. NOT exported → its keys (`headcountAt`, `ageYears`,
//      the `col*` <th>s) are asserted at the i18n layer.
//   3. `Activity` — default export, `class` wrapped in `withTranslation("activityApplications")`.
//      `componentDidMount → loadSuggestions()` does `fetch(".../suggestions?mode=...")`. Its
//      `render()` threads `t` (from props, injected by the HOC) into the column Headers, the
//      header toggle buttons + <i> labels, and the level-edit `<ReactModal>`. Mounted here with
//      `TanStackGrid` / `react-modal` / `./WorkGroupEditor` mocked so the translated strings render
//      synchronously.

import React from "react";
import {
    render,
    screen,
    within,
    waitFor,
    fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../../i18n";
import enActivityApplications from "../../../locales/en/activityApplications.json";
import Activity from "./Activity";

// --- mocks -----------------------------------------------------------------------------------

// A row fixture `renderSubComponent` (= `SubStudentList`) can render against.
export const SUB_ROW = {
    original: {
        id: 10,
        closest_lesson: "2025-09-01T00:00:00",
        activity_ref: { is_work_group: false, id: 3 },
        activity_ref_id: 3,
        time_interval: { id: 7, start: "2025-09-01T17:00:00" },
        users: [
            {
                id: 99,
                first_name: "Jean",
                last_name: "Dupont",
                birthday: "2014-01-01",
                // Paris-zone midnight timestamps (config.time_zone = "Paris") -- exercises the
                // Started/Stopped-date columns' timezone-safe formatting, see the dedicated
                // describe block below.
                application: {
                    id: 1,
                    begin_at: "2020-01-01T00:00:00+01:00",
                    stopped_at: "2030-06-15T00:00:00+02:00",
                },
            },
        ],
        inactive_users: [],
        options: [],
        activities_instruments: [],
    },
};

// Stashes the live grid props (same technique as LessonList.test.jsx) so a test can invoke the
// raw `renderSubComponent` with synthetic row data, without needing a real TanStack mount.
let lastGridProps = null;
vi.mock("../../common/baseDataTable/TanStackGrid", () => ({
    default: (props) => {
        lastGridProps = props;
        return (
            <div data-testid="react-table">
                <div data-testid="rt-headers">
                    {(props.columns || []).map((c, i) => (
                        <span key={i} className="rt-th">
                            {typeof c.Header === "string" ? c.Header : null}
                        </span>
                    ))}
                </div>
            </div>
        );
    },
}));

// LevelCell fires api.set().get(...).then(...) on mount, and falls back to
// TimeIntervalHelpers.levelDisplayForActivity. Keep the real helpers except level display, which
// we force to the "NON INDIQUÉ" sentinel so the translated placeholder path is exercised.
vi.mock("../../planning/TimeIntervalHelpers", async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, levelDisplayForActivity: () => "NON INDIQUÉ" };
});

// react-modal — render children unconditionally so the level-edit modal body is in the DOM.
vi.mock("react-modal", () => ({
    default: ({ children }) => <div data-testid="react-modal">{children}</div>,
}));

// Exposes `onUpdateActivity` via a clickable button (instead of an inert stub) so tests can drive
// the real `renderSubComponent` -> `WorkGroupEditor.onUpdateActivity` callback path -- see the
// id-keyed re-expand regression tests below. `activity_ref.is_work_group` is false in every
// existing fixture above (SUB_ROW, baseProps' empty suggestions), so this change doesn't affect
// any test that already passes.
vi.mock("./WorkGroupEditor", () => ({
    default: ({ activity, onUpdateActivity }) => (
        <div data-testid="work-group-editor">
            <button onClick={() => onUpdateActivity(activity)}>
                save-{activity.id}
            </button>
        </div>
    ),
}));

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
    return { set: () => chain };
});

// --- props ---------------------------------------------------------------------------------------

// Minimum the constructor + a single render pass dereference. `activityRef.kind` is deliberately
// NOT "Enfance" (that branch walks `application.user.activity_applications`), and
// `pre_application_activity` is null (skips the pre-application `previousActivity` branch).
// `instruments` is non-empty so the `summaryActivity.instruments` <i> label renders — the guard is
// `!this.props.instruments.length == 0`, which is falsy (i.e. block hidden) for an empty array.
const baseProps = () => ({
    desiredActivity: { id: 5, is_validated: false },
    activityRef: { id: 7, kind: "Ado", label: "Piano" },
    application: {
        id: 100,
        season_id: 1,
        user_id: 2,
        user: { id: 2, levels: [] },
        pre_application_activity: null,
    },
    desiredActivities: [],
    activityRefs: [],
    suggestions: [],
    instruments: [{ label: "Piano" }],
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
    global.fetch = vi
        .fn()
        .mockResolvedValue({ json: () => Promise.resolve([]) });
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
        expect(
            Activity.WrappedComponent.prototype instanceof React.Component
        ).toBe(true);
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
            suggestedCourses: "Cours suggérés",
            allCoursesOf: /Tous les cours de/,
            studentLevel: "Niveau de l'élève",
            groupChange: "Changement de groupe",
            instruments: "Instruments",
            suggestionCriteria: /critères pour les cours suggérés/,
            modal: {
                title: /Édition du niveau de Piano/,
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

    test.each(["fr", "en"])("%s", async (lng) => {
        await i18n.changeLanguage(lng);
        const expected = CASES[lng];

        render(<Activity {...baseProps()} />);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        // fetch URL carries the suggestions mode (loadSuggestions mechanic)
        expect(global.fetch.mock.calls[0][0]).toMatch(
            /\/applications\/100\/desired_activities\/5\/suggestions\?mode=CUSTOM/
        );

        // --- TanStackGrid column Headers ---
        const headers = screen.getByTestId("rt-headers");
        for (const label of Object.values(expected.headers)) {
            expect(within(headers).getByText(label)).toBeInTheDocument();
        }

        // --- header toggle button + <i> labels ---
        expect(screen.getByText(expected.suggestedCourses)).toBeInTheDocument();
        expect(screen.getByText(expected.allCoursesOf)).toBeInTheDocument();
        expect(screen.getByText(expected.studentLevel)).toBeInTheDocument();
        expect(screen.getByText(expected.groupChange)).toBeInTheDocument();
        expect(screen.getByText(expected.instruments)).toBeInTheDocument();
        expect(
            screen.getByText(expected.suggestionCriteria)
        ).toBeInTheDocument();

        // --- level-edit ReactModal ---
        const modal = screen.getByTestId("react-modal");
        expect(
            within(modal).getByText(expected.modal.title)
        ).toBeInTheDocument();
        expect(
            within(modal).getByText(expected.modal.notSpecified)
        ).toBeInTheDocument();
        expect(
            within(modal).getByText(expected.modal.cancel)
        ).toBeInTheDocument();
        expect(
            within(modal).getByText(expected.modal.save)
        ).toBeInTheDocument();

        // --- SubStudentList (via TanStackGrid's renderSubComponent) + its nested <LevelCell> ---
        const sub = render(lastGridProps.renderSubComponent(SUB_ROW)).container;
        expect(
            within(sub).getByText(expected.sub.headcountAt)
        ).toBeInTheDocument();
        for (const col of expected.sub.cols) {
            expect(within(sub).getByText(col)).toBeInTheDocument();
        }
        expect(
            within(sub).getByText(expected.sub.ageYears)
        ).toBeInTheDocument();
        // LevelCell resolves its useEffect async; the fallback path (levelDisplayForActivity
        // mocked to "NON INDIQUÉ") renders summaryActivity.notSpecified.
        await waitFor(() =>
            expect(
                within(sub).getByText(expected.sub.levelCell)
            ).toBeInTheDocument()
        );
    });
});

// Regression: SubStudentList's Started/Stopped date columns formatted begin_at/stopped_at with
// Intl.DateTimeFormat('fr') -- hardcoded to French AND with no `timeZone` option. Since those
// fields are Paris-zone timestamps at local midnight (config.time_zone = "Paris"), formatting
// without an explicit timeZone uses the *machine's* zone instead, silently rolling the displayed
// date back a day for anyone west of Paris (the exact en-US audience the locale-aware fix is for).
// SUB_ROW's user carries a Paris-midnight begin_at/stopped_at pair for this reason.
describe("Activity — SubStudentList Started/Stopped dates are locale-aware and timezone-safe", () => {
    test("en: dates render in en format without rolling back a day", async () => {
        await i18n.changeLanguage("en");
        render(<Activity {...baseProps()} />);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        const sub = render(lastGridProps.renderSubComponent(SUB_ROW)).container;
        expect(within(sub).getByText("1/1/2020")).toBeInTheDocument();
        expect(within(sub).getByText("6/15/2030")).toBeInTheDocument();
    });

    test("fr: dates render in fr format", async () => {
        await i18n.changeLanguage("fr");
        render(<Activity {...baseProps()} />);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        const sub = render(lastGridProps.renderSubComponent(SUB_ROW)).container;
        expect(within(sub).getByText("01/01/2020")).toBeInTheDocument();
        expect(within(sub).getByText("15/06/2030")).toBeInTheDocument();
    });
});

// Regression: `Activity#displayDuration` (rendered in the change-activity <select>'s <option>s)
// was a third hardcoded duration formatter -- `- ${minutes} min` / `- ${hours}h${minutes}` -- not
// routed through i18n. It now uses the shared activityApplications:units.{minutes,hoursMinutes}.
describe("Activity — displayDuration goes through activityApplications:units.*", () => {
    const withRefs = () => ({
        ...baseProps(),
        activityRefs: [
            { id: 20, label: "Guitare", duration: 45 },
            { id: 21, label: "Batterie", duration: 90 },
        ],
    });

    const optionText = (t) =>
        screen.getByText(
            (_c, node) =>
                node.tagName === "OPTION" &&
                node.textContent.replace(/\s+/g, " ").trim() === t
        );

    for (const lng of ["fr", "en"]) {
        test(`${lng}: minutes-only and hours+minutes durations render via units.*`, async () => {
            await i18n.changeLanguage(lng);
            render(<Activity {...withRefs()} />);
            await waitFor(() => expect(global.fetch).toHaveBeenCalled());

            expect(optionText("Guitare - 45 min")).toBeInTheDocument();
            expect(optionText("Batterie - 1h30")).toBeInTheDocument();
        });
    }

    // Distinguishable-value check: prove the string is read from the catalogue at render time,
    // not baked in (fr and en units.* are byte-identical so a plain assertion can't tell).
    test("en: reflects a runtime override of units.minutes and units.hoursMinutes", async () => {
        await i18n.changeLanguage("en");
        i18n.addResourceBundle(
            "en",
            "activityApplications",
            {
                units: {
                    minutes: "{{minutes}} MINS",
                    hoursMinutes: "{{hours}}HR{{minutes}}",
                },
            },
            true,
            true
        );
        try {
            render(<Activity {...withRefs()} />);
            await waitFor(() => expect(global.fetch).toHaveBeenCalled());
            expect(optionText("Guitare - 45 MINS")).toBeInTheDocument();
            expect(optionText("Batterie - 1HR30")).toBeInTheDocument();
        } finally {
            i18n.addResourceBundle(
                "en",
                "activityApplications",
                enActivityApplications,
                true,
                true
            );
        }
    });
});

// ==============================================================================================
// D. Suggestion editing keeps expansion pinned to a suggestion's id, not its array position
// ==============================================================================================
// Item 13's final batch: the old react-table v6 code reached into the table's internal ref API to
// recompute a suggestion's *index* after an active sort, so it could re-expand "whatever's now
// there". The TanStack version instead passes `getRowId={(row) => String(row.id)}` to
// TanStackGrid and keys `tableState.expanded` off that same id (see `onUpdateActivity` in
// Activity.jsx's `renderSubComponent`). These tests drive the update through that real callback,
// captured off `lastGridProps.renderSubComponent` per the mocked-TanStackGrid technique above,
// rather than calling any internal method directly.

const workGroupSuggestion = (id, extra = {}) => ({
    id,
    time_interval: {
        start: "2025-09-01T09:00:00",
        end: "2025-09-01T10:00:00",
    },
    activity_ref: { is_work_group: true, label: `WG-${id}` },
    location: { label: "Salle" },
    teacher: { first_name: "A", last_name: "B" },
    users: [],
    inactive_users: [],
    options: [],
    ...extra,
});

describe("Activity — editing a suggestion via WorkGroupEditor re-expands it by id, surviving a reorder", () => {
    test("the edited suggestion stays expanded by id after the suggestions array reorders", async () => {
        const s1 = workGroupSuggestion(1);
        const s2 = workGroupSuggestion(2);
        const handleUpdateSuggestion = vi.fn();

        const { rerender } = render(
            <Activity
                {...baseProps()}
                suggestions={[s1, s2]}
                handleUpdateSuggestion={handleUpdateSuggestion}
            />
        );
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        // Real path: renderSubComponent -> mounted WorkGroupEditor -> click -> onUpdateActivity.
        const editor = render(
            lastGridProps.renderSubComponent({ original: s2, index: 1 })
        );
        await userEvent.click(editor.getByText("save-2"));

        expect(handleUpdateSuggestion).toHaveBeenCalledWith(s2);
        // Keyed by the suggestion's own id ("2"), not its array index (1).
        expect(lastGridProps.expanded).toEqual({ 2: true });
        expect(lastGridProps.getRowId(s2)).toBe("2");

        // Simulate the parent re-rendering with suggestions reordered after the update -- exactly
        // the scenario the deleted index-based hack existed to handle.
        rerender(
            <Activity
                {...baseProps()}
                suggestions={[s2, s1]}
                handleUpdateSuggestion={handleUpdateSuggestion}
            />
        );

        // s2 is now at index 0 instead of 1; the expanded key is untouched -- still id "2" -- proof
        // it tracks the suggestion's own identity, not its position in the array.
        expect(lastGridProps.data.map((s) => s.id)).toEqual([2, 1]);
        expect(lastGridProps.expanded).toEqual({ 2: true });
    });
});

// ==============================================================================================
// E. createAllExpanded — id-keyed, and scoped to the currently-filtered suggestions
// ==============================================================================================

describe("Activity — expand all uses suggestion ids, not row indexes", () => {
    test("expand all marks every visible suggestion's id as expanded", async () => {
        const s1 = workGroupSuggestion(11);
        const s2 = workGroupSuggestion(12);
        const s3 = workGroupSuggestion(13);

        const { container } = render(
            <Activity {...baseProps()} suggestions={[s1, s2, s3]} />
        );
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        await userEvent.click(
            container.querySelector(".fa-caret-down").closest("button")
        );

        expect(lastGridProps.expanded).toEqual({
            11: true,
            12: true,
            13: true,
        });
    });

    test("expand all only expands the currently-filtered-in suggestions, not filtered-out ones", async () => {
        const piano = workGroupSuggestion(21, {
            activity_ref: { is_work_group: true, label: "Piano" },
        });
        const guitare = workGroupSuggestion(22, {
            activity_ref: { is_work_group: true, label: "Guitare" },
        });

        const { container } = render(
            <Activity {...baseProps()} suggestions={[piano, guitare]} />
        );
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        const typeCourFilter = lastGridProps.columns.find(
            (c) => c.id === "type_cour"
        ).Filter;
        const filterRender = render(React.createElement(typeCourFilter));
        await userEvent.selectOptions(
            within(filterRender.container).getByRole("combobox"),
            "Piano"
        );

        // Sanity check: the post-filter data handed to TanStackGrid narrowed to Piano only.
        expect(lastGridProps.data.map((s) => s.id)).toEqual([21]);

        await userEvent.click(
            container.querySelector(".fa-caret-down").closest("button")
        );

        expect(lastGridProps.expanded).toEqual({ 21: true });
    });
});

// ==============================================================================================
// F. The three custom-filtered columns (day/type_cour/time) narrow suggestions via applyCustomFilters
// ==============================================================================================

describe("Activity — day/type_cour/time custom filters narrow the suggestion list", () => {
    const suggestion = (id, extra = {}) => ({
        id,
        time_interval: {
            start: "2025-09-01T09:00:00",
            end: "2025-09-01T10:00:00",
        },
        activity_ref: { is_work_group: false, label: "Piano" },
        location: { label: "Salle" },
        teacher: { first_name: "A", last_name: "B" },
        users: [],
        inactive_users: [],
        options: [],
        ...extra,
    });

    test("day filter keeps only suggestions on the selected weekday", async () => {
        // 2025-09-01 is a Monday (isoWeekday 1); 2025-09-03 is a Wednesday (isoWeekday 3). Picked
        // deliberately away from Sunday, where WEEKDAYS' 0-based option id (0) and moment's
        // 1-based isoWeekday() (7) don't line up -- not this test's concern.
        const monday = suggestion(31);
        const wednesday = suggestion(32, {
            time_interval: {
                start: "2025-09-03T09:00:00",
                end: "2025-09-03T10:00:00",
            },
        });

        render(<Activity {...baseProps()} suggestions={[monday, wednesday]} />);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        const dayFilter = lastGridProps.columns.find(
            (c) => c.id === "day"
        ).Filter;
        const filterRender = render(React.createElement(dayFilter));
        await userEvent.selectOptions(
            within(filterRender.container).getByRole("combobox"),
            "1"
        ); // Lundi

        expect(lastGridProps.data.map((s) => s.id)).toEqual([31]);
    });

    test("type_cour filter keeps only suggestions of the selected activity ref label", async () => {
        const piano = suggestion(41, {
            activity_ref: { is_work_group: false, label: "Piano" },
        });
        const guitare = suggestion(42, {
            activity_ref: { is_work_group: false, label: "Guitare" },
        });

        render(<Activity {...baseProps()} suggestions={[piano, guitare]} />);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        const typeCourFilter = lastGridProps.columns.find(
            (c) => c.id === "type_cour"
        ).Filter;
        const filterRender = render(React.createElement(typeCourFilter));
        await userEvent.selectOptions(
            within(filterRender.container).getByRole("combobox"),
            "Guitare"
        );

        expect(lastGridProps.data.map((s) => s.id)).toEqual([42]);
    });

    test("time filter keeps only suggestions whose start is on/after the selected start time", async () => {
        const early = suggestion(51, {
            time_interval: {
                start: "2025-09-01T08:00:00",
                end: "2025-09-01T09:00:00",
            },
        });
        const late = suggestion(52, {
            time_interval: {
                start: "2025-09-01T15:00:00",
                end: "2025-09-01T16:00:00",
            },
        });

        render(<Activity {...baseProps()} suggestions={[early, late]} />);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        const timeFilter = lastGridProps.columns.find(
            (c) => c.id === "time"
        ).Filter;
        const { container: filterContainer } = render(
            React.createElement(timeFilter)
        );
        const [startInput] =
            filterContainer.querySelectorAll('input[type="time"]');
        fireEvent.change(startInput, { target: { value: "10:00" } });

        expect(lastGridProps.data.map((s) => s.id)).toEqual([52]);
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

    test.each(["fr", "en"])(
        "all 39 keys resolve to real, fully-interpolated copy in %s",
        (lng) => {
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
        }
    );

    test("headcountAt keeps the French space before the colon; en reads naturally", () => {
        const fr = i18n.getFixedT("fr", "activityApplications");
        const en = i18n.getFixedT("en", "activityApplications");
        expect(fr("summaryActivity.headcountAt", { date: "01/09/2025" })).toBe(
            "Effectifs au : 01/09/2025"
        );
        expect(en("summaryActivity.headcountAt", { date: "01/09/2025" })).toBe(
            "Headcount as of 01/09/2025"
        );
    });

    test("ageYears interpolates {{age}}", () => {
        expect(
            i18n.getFixedT("fr", "activityApplications")(
                "summaryActivity.ageYears",
                { age: 9 }
            )
        ).toBe("9 ans");
        expect(
            i18n.getFixedT("en", "activityApplications")(
                "summaryActivity.ageYears",
                { age: 9 }
            )
        ).toBe("9 years old");
    });

    test("allCoursesOf interpolates {{name}}", () => {
        for (const lng of ["fr", "en"]) {
            const v = i18n.getFixedT(lng, "activityApplications")(
                "summaryActivity.allCoursesOf",
                { name: "Piano" }
            );
            expect(v).toContain("Piano");
            expect(v).not.toContain("{{");
        }
    });

    test("editLevelTitle interpolates {{label}} and uses the accented 'Édition' (fr typo fixed)", () => {
        const fr = i18n.getFixedT("fr", "activityApplications")(
            "summaryActivity.editLevelTitle",
            {
                label: "Piano",
            }
        );
        expect(fr).toContain("Édition");
        expect(fr).toContain("Piano");

        const en = i18n.getFixedT("en", "activityApplications")(
            "summaryActivity.editLevelTitle",
            {
                label: "Piano",
            }
        );
        expect(en).toContain("Piano");
    });

    test("notSpecified (all-caps) and notIndicated (sentence case) are distinct fr strings", () => {
        const fr = i18n.getFixedT("fr", "activityApplications");
        expect(fr("summaryActivity.notSpecified")).toBe("NON INDIQUÉ");
        expect(fr("summaryActivity.notIndicated")).toBe("Non indiqué");
        expect(fr("summaryActivity.notSpecified")).not.toBe(
            fr("summaryActivity.notIndicated")
        );
    });

    test("lot-3f new keys removeFromSlot / select resolve in both locales", () => {
        const fr = i18n.getFixedT("fr", "activityApplications");
        const en = i18n.getFixedT("en", "activityApplications");
        expect(fr("summaryActivity.removeFromSlot")).toBe(
            "Retirer de ce créneau"
        );
        expect(en("summaryActivity.removeFromSlot")).toBe(
            "Remove from this slot"
        );
        expect(fr("summaryActivity.select")).toBe("Sélectionner");
        expect(en("summaryActivity.select")).toBe("Select");
    });
});
