// Component tests for the i18n extraction on the "courses" domain lot 4 — LessonList.jsx.
//
// The default export is a large `withTranslation("courses")`-wrapped react-table class. `render`
// reads `t` from the HOC, so no `t` prop is threaded — render it directly and drive language
// through the frontend/i18n singleton (no <I18nextProvider> needed; the initReactI18next wiring
// covers it).
//
// What is mocked and why:
//  - `react-table` (v6 default export) does DOM measurement / virtualisation that does not run in
//    jsdom, and the point here is the i18n wiring, not the grid. The stub renders the resolved
//    string `Header`s of the `columns` prop plus the `noDataText` / `previousText` / `nextText`
//    i18n props, so the `t("lessonList.columns.*")` and `t("common:reactTable.*")` threading is
//    what gets asserted.
//  - `MessageModal`, `ListPreferences`, `DeleteCourseModal` — heavy children that carry none of
//    this component's own copy.
//  - `sweetalert2` / `react-toastify` — only used in event handlers (not render); stubbed so the
//    import graph stays light.
//
// `componentDidMount` -> `fetchData` -> module fn `fetchInstancesList` does
// `fetch("/activities.json", {POST})`, but behind a module-level `_.debounce(fn, 400)`, so the
// fetch fires ~400ms after mount. `global.fetch` is stubbed to resolve
// `{ data: [], pages: 1, total: 7 }`; a trailing `waitFor(fetch called)` drains that pending
// update. Assertions target the synchronously-rendered header row and the `courseCount` <h2>
// (state.total starts at 0).
//
// UserList / UserRow are module-local `const`s (not exported) — unreachable from a test. Their
// interpolated + plural keys are guarded at the i18n layer instead (see the last describe block).

import React from "react";
import {act, render, screen, waitFor} from "@testing-library/react";
import i18n from "../../i18n";
import LessonList from "./LessonList";

// The stub also stashes the live `SubComponent` render prop so a test can invoke it and reach
// the otherwise-unexported UserList / UserRow.
let lastReactTableProps = null;
vi.mock("react-table", () => ({
    default: props => {
        lastReactTableProps = props;
        return (
            <div data-testid="react-table-stub">
                {(props.columns || []).map((c, i) => (
                    <span key={i} data-testid="rt-header">
                        {typeof c.Header === "string" ? c.Header : ""}
                    </span>
                ))}
                <span data-testid="rt-noDataText">{props.noDataText}</span>
                <span data-testid="rt-previousText">{props.previousText}</span>
                <span data-testid="rt-nextText">{props.nextText}</span>
                <span data-testid="rt-loadingText">{props.loadingText}</span>
            </div>
        );
    },
}));

// UserRow fires api.set().error().success().get(url) in a useEffect. Chainable no-op stub whose
// .get never invokes the success callback, so `studentLevel` stays null and displayLevel() falls
// through to the levelDisplayForActivity branch — the one the lot-4 review flagged. The success
// callback (and the URL it was registered against) is stashed so a test can invoke it directly
// with fixture data (see the studentLevel describe block below), without any test relying on it
// firing spontaneously.
//
// Caveat found by a retroactive code-reviewer audit: this is ONE shared `chain` object reused by
// every `api.set()` call in the module under test, unlike the real tools/api (which returns a
// fresh chain per call). `lastApiSuccess` therefore means "the last .success() registered by
// ANYTHING in this render", not "the studentLevel fetch's callback" -- LessonList.jsx itself
// registers two more `.success()` handlers (onSubmit's delete-all/delete-selected branches), which
// don't fire today only because nothing in these tests clicks the buttons that would trigger them.
// Resetting both in beforeEach + asserting the captured URL keeps a future test from silently
// asserting against the wrong callback if that ever changes.
let lastApiSuccess = null;
let lastApiSuccessUrl = null;
vi.mock("../../tools/api", () => {
    const chain = {};
    chain.set = () => chain;
    chain.success = cb => {
        lastApiSuccess = cb;
        return chain;
    };
    chain.error = () => chain;
    chain.get = url => {
        lastApiSuccessUrl = url;
        return chain;
    };
    chain.post = () => chain;
    chain.del = () => chain;
    return {...chain, set: () => chain};
});

// Partial mock: keep every real helper except force levelDisplayForActivity to return the French
// "NON INDIQUÉ" sentinel (its real no-level-rows return) so the English row must still show the
// translated placeholder, not the raw sentinel.
vi.mock("../planning/TimeIntervalHelpers", async importOriginal => {
    const actual = await importOriginal();
    return {
        ...actual,
        levelDisplayForActivity: () => "NON INDIQUÉ",
    };
});

vi.mock("../generalPayments/MessageModal", () => ({
    default: () => <div data-testid="message-modal-stub" />,
}));

vi.mock("../common/ListPreferences", () => ({
    default: () => <div data-testid="list-preferences-stub" />,
}));

vi.mock("./DeleteCourseModal", () => ({
    default: () => <div data-testid="delete-course-modal-stub" />,
}));

vi.mock("sweetalert2", () => ({
    default: Object.assign(vi.fn(), {fire: vi.fn()}),
}));

vi.mock("react-toastify", () => ({
    toast: {error: vi.fn(), success: vi.fn(), info: vi.fn()},
}));

const fetchOk = body =>
    vi.fn().mockResolvedValue({
        ok: true,
        headers: {get: () => null},
        json: () => Promise.resolve(body),
    });

beforeEach(() => {
    localStorage.clear();
    global.fetch = fetchOk({data: [], pages: 1, total: 7});
    lastApiSuccess = null;
    lastApiSuccessUrl = null;
});

afterEach(async () => {
    vi.restoreAllMocks();
    localStorage.clear();
    await i18n.changeLanguage("fr");
});

const makeProps = () => ({
    seasons: [
        {
            id: 1,
            label: "2025",
            is_current: true,
            start: "2025-09-01",
            end: "2026-06-30",
        },
    ],
    activityRefs: [],
    teachers: [],
    rooms: [],
    locations: [],
    evaluationLevelRefs: [],
    isTeacherView: false,
});

// This component IS withTranslation()-wrapped (opposite of the StepZilla AddXForCourse steps),
// so react-i18next exposes the inner class as `.WrappedComponent`. render() reads `t` from
// props — if the HOC is ever dropped that call breaks. Keep it wrapped.
test("is exported as a withTranslation-wrapped class (.WrappedComponent is a React.Component)", () => {
    expect(LessonList.WrappedComponent).toBeDefined();
    expect(
        LessonList.WrappedComponent.prototype instanceof React.Component
    ).toBe(true);
});

describe("LessonList — column header row (i18n)", () => {
    const headerTexts = () =>
        screen.getAllByTestId("rt-header").map(n => n.textContent);

    test("renders the French column headers and react-table i18n props", async () => {
        await i18n.changeLanguage("fr");
        render(<LessonList {...makeProps()} />);

        const headers = headerTexts();
        expect(headers).toEqual(
            expect.arrayContaining([
                "Jour",
                "Horaires",
                "Professeur",
                "Occupation",
                "Action",
            ])
        );

        // common:reactTable.* threading
        expect(screen.getByTestId("rt-noDataText")).toHaveTextContent(
            "Aucune donnée"
        );
        expect(screen.getByTestId("rt-previousText")).toHaveTextContent(
            "Précédent"
        );

        // courseCount <h2> — state.total starts at 0 (fetch is debounced), fr plural _other.
        expect(
            screen.getByRole("heading", {name: "0 cours"})
        ).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    test("renders the English column headers and react-table i18n props", async () => {
        await i18n.changeLanguage("en");
        render(<LessonList {...makeProps()} />);

        const headers = headerTexts();
        expect(headers).toEqual(
            expect.arrayContaining([
                "Day",
                "Schedule",
                "Teacher",
                // en value from frontend/locales/en/courses.json is "Occupancy", not "Occupation"
                "Occupancy",
                "Action",
            ])
        );

        expect(screen.getByTestId("rt-noDataText")).toHaveTextContent("No data");
        expect(screen.getByTestId("rt-previousText")).toHaveTextContent(
            "Previous"
        );

        expect(
            screen.getByRole("heading", {name: "0 courses"})
        ).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    // isTeacherView hides the teacher column — proves the conditional column spread still keys
    // its Header off the translation, and that the header row is genuinely coming from `t`.
    test("omits the Professeur column when isTeacherView is true", async () => {
        await i18n.changeLanguage("fr");
        render(<LessonList {...makeProps()} isTeacherView={true} />);

        const headers = headerTexts();
        expect(headers).toEqual(expect.arrayContaining(["Jour", "Horaires"]));
        expect(headers).not.toContain("Professeur");

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });
});

// Regression for the moment.locale("fr") global side effect (see docs/KnownIssues.md's former
// "courses/LessonList.jsx" entry): the component used to force moment's process-wide locale to
// French at module scope *and* on every render(), clobbering the active-language sync that
// frontend/i18n/index.js otherwise maintains -- so the day column's Cell/Filter (and any other
// component rendered after LessonList on the same page) stayed French regardless of the UI
// language. Both forced calls are removed; moment now just follows whatever frontend/i18n/index.js
// already set. Reached via the "day" column's Cell/Filter, extracted from the stashed react-table
// stub props (same technique as the SubComponent reach below).
describe("day column follows the active UI language (moment locale no longer forced to fr)", () => {
    const dayColumn = () => lastReactTableProps.columns.find(c => c.id === "day");

    test("Cell renders the weekday in French by default", async () => {
        await i18n.changeLanguage("fr");
        render(<LessonList {...makeProps()} />);

        // 2026-01-12 is a Monday.
        expect(dayColumn().Cell({value: {start: "2026-01-12T10:00:00"}})).toBe("lundi");
    });

    test("Cell renders the weekday in English when the active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<LessonList {...makeProps()} />);

        expect(dayColumn().Cell({value: {start: "2026-01-12T10:00:00"}})).toBe("Monday");
    });

    test("Filter's day options render in the active language", async () => {
        // daysOptions is built once per LessonList render() call (closure), using whichever
        // moment locale is active *at that render* -- so each language needs its own fresh mount,
        // not just a fresh <Filter> render off a stale closure.
        await i18n.changeLanguage("en");
        const enList = render(<LessonList {...makeProps()} />);
        const enFilter = render(<>{dayColumn().Filter({filter: null, onChange: () => {}})}</>);
        expect(enFilter.getByRole("option", {name: "Monday"})).toBeInTheDocument();
        enFilter.unmount();
        enList.unmount();

        await i18n.changeLanguage("fr");
        const frList = render(<LessonList {...makeProps()} />);
        const frFilter = render(<>{dayColumn().Filter({filter: null, onChange: () => {}})}</>);
        expect(frFilter.getByRole("option", {name: "Lundi"})).toBeInTheDocument();
        frFilter.unmount();
        frList.unmount();
    });
});

// Reach UserList / UserRow through the react-table `SubComponent` render prop (the stub stashes
// it). This is the diff's riskiest edit — UserList was rewritten from `=> ( … )` to
// `=> { … return ( … ) }` — and it's where the lot-4 review found the Level cell rendering a raw
// French sentinel in English mode.
describe("row expander (UserList / UserRow) — i18n", () => {
    const activityFixture = () => ({
        id: 10,
        activity_ref_id: 3,
        time_interval: {id: 7, start: "2025-09-08T17:00:00"},
        time_interval_id: 7,
        activity_ref: {is_work_group: false},
        teacher: {id: 2},
        student_evaluations: [],
        options: [],
        activities_instruments: [],
        users: [
            {
                id: 99,
                first_name: "Jean",
                last_name: "Dupont",
                birthday: "2014-01-01",
                // begin_at must be <= the reference date (≈ today) or SubComponent filters the
                // user out and renders null.
                begin_at: "2020-01-01",
                stopped_at: undefined,
            },
        ],
    });

    const renderSubRow = async lng => {
        await i18n.changeLanguage(lng);
        render(<LessonList {...makeProps()} />);
        await waitFor(() => expect(lastReactTableProps).not.toBeNull());
        const sub = lastReactTableProps.SubComponent({original: activityFixture()});
        return render(sub);
    };

    test("fr — expander header + level sentinel render in French", async () => {
        const {getByText} = await renderSubRow("fr");
        expect(getByText("0/1 évaluations remplies")).toBeInTheDocument();
        expect(getByText("Consulter les évaluations")).toBeInTheDocument();
        expect(getByText("Nom")).toBeInTheDocument();
        // displayLevel(): levelDisplayForActivity -> "NON INDIQUÉ" -> translated placeholder
        expect(getByText("NON INDIQUÉ")).toBeInTheDocument();
    });

    test("en — expander header + level sentinel render in English (no raw French)", async () => {
        const {getByText, queryByText} = await renderSubRow("en");
        expect(getByText("0/1 evaluations completed")).toBeInTheDocument();
        expect(getByText("View evaluations")).toBeInTheDocument();
        expect(getByText("Name")).toBeInTheDocument();
        // regression: this used to render the raw "NON INDIQUÉ" from the helper in en mode
        expect(queryByText("NON INDIQUÉ")).not.toBeInTheDocument();
        expect(getByText("NOT SPECIFIED")).toBeInTheDocument();
        // UserRow age cell: t("lessonList.userRow.ageYears", { age })
        expect(getByText(/\d+ years old/)).toBeInTheDocument();
    });

    // Regression: Started/Stopped dates used to be hardcoded to Intl.DateTimeFormat("fr")
    // regardless of the active UI language -- always DD/MM/YYYY, ambiguous for en-US users.
    //
    // stopped_at must be in the future (beyond the "reference date", which defaults to today)
    // or the SubComponent's own `hasUser` filter drops the row entirely -- see the begin_at
    // comment on activityFixture() above for the same constraint on begin_at.
    test("Started/Stopped dates follow the active UI language, not a hardcoded fr locale", async () => {
        const withStoppedAt = () => {
            const fixture = activityFixture();
            fixture.users[0].stopped_at = "2030-06-15";
            return fixture;
        };

        await i18n.changeLanguage("fr");
        const frList = render(<LessonList {...makeProps()} />);
        await waitFor(() => expect(lastReactTableProps).not.toBeNull());
        const frSub = render(lastReactTableProps.SubComponent({original: withStoppedAt()}));
        expect(frSub.getByText("01/01/2020")).toBeInTheDocument();
        expect(frSub.getByText("15/06/2030")).toBeInTheDocument();
        frSub.unmount();
        frList.unmount();

        await i18n.changeLanguage("en");
        const enList = render(<LessonList {...makeProps()} />);
        await waitFor(() => expect(lastReactTableProps).not.toBeNull());
        const enSub = render(lastReactTableProps.SubComponent({original: withStoppedAt()}));
        expect(enSub.getByText("1/1/2020")).toBeInTheDocument();
        expect(enSub.getByText("6/15/2030")).toBeInTheDocument();
        enSub.unmount();
        enList.unmount();
    });

    // Regression: UserRow used to read `data.evaluation_level_ref.label` from the API response,
    // but desired_activity_controller.rb renders evaluation_level_ref as a bare string, not an
    // object -- `.label` on a string is always undefined, so studentLevel never got set and the
    // component always fell through to the levelDisplayForActivity recompute, regardless of what
    // the API actually returned.
    test("studentLevel is set straight from the API's evaluation_level_ref string, no .label", async () => {
        await i18n.changeLanguage("fr");
        render(<LessonList {...makeProps()} />);
        await waitFor(() => expect(lastReactTableProps).not.toBeNull());
        render(lastReactTableProps.SubComponent({original: activityFixture()}));

        expect(lastApiSuccess).not.toBeNull();
        // Pin which fetch this callback actually belongs to, since the mock's chain is shared
        // across every api.set() call in the module (see the mock's own comment above).
        expect(lastApiSuccessUrl).toMatch(/^\/desired_activities\/user\/\d+\/activity\/\d+\/ref\/\d+\/time\/\d+$/);
        act(() => {
            lastApiSuccess({id: 1, evaluation_level_ref: "Débutant", activity_application_id: 5});
        });

        expect(screen.getByText("Débutant")).toBeInTheDocument();
    });
});

// UserList / UserRow are not exported, and several keys (httpError, andNOthers, selectRemaining,
// selectedCount, courseCount) live in render branches driven by hard-to-fixture state. A
// placeholder rename in the JSON fails silently (i18next substitutes "" for an unknown name, no
// throw), and a dropped plural form falls back to the key. Guard them at the i18n layer against
// the exact args the component passes at its call sites.
describe("interpolated & plural keys resolve with the component's call-site args", () => {
    const cases = [
        // sendReminderMail: t("lessonList.httpError", { status, statusText })
        ["lessonList.httpError", {status: 500, statusText: "Boom"}],
        // UserList: t("lessonList.userList.evaluationsFilled", { done, total })
        ["lessonList.userList.evaluationsFilled", {done: 2, total: 5}],
        // UserRow: t("lessonList.userRow.ageYears", { age })
        ["lessonList.userRow.ageYears", {age: 9}],
        // renderTargetsAlert: t("lessonList.selectedCount", { count })
        ["lessonList.selectedCount", {count: 1}],
        ["lessonList.selectedCount", {count: 3}],
        // <h2>: t("lessonList.courseCount", { count })
        ["lessonList.courseCount", {count: 1}],
        ["lessonList.courseCount", {count: 3}],
        // renderTargetsAlert: t("lessonList.selectRemaining", { count })
        ["lessonList.selectRemaining", {count: 4}],
    ];

    for (const lng of ["fr", "en"]) {
        for (const [key, args] of cases) {
            test(`${lng} · ${key} ${JSON.stringify(args)}`, async () => {
                await i18n.changeLanguage(lng);
                const t = i18n.getFixedT(lng, "courses");
                const out = t(key, args);

                expect(out).not.toMatch(/\{\{|\}\}/); // no unfilled placeholder
                expect(out).not.toBe(key); // key + plural form resolved
                expect(out.length).toBeGreaterThan(0);
                for (const v of Object.values(args)) {
                    expect(out).toContain(String(v)); // every supplied value landed
                }
            });
        }

        // render(): `recipients += t("lessonList.andNOthers", { count: restCount })` — it is
        // concatenated onto a name list, so it must keep its leading ", ".
        test(`${lng} · lessonList.andNOthers keeps its leading ", "`, async () => {
            await i18n.changeLanguage(lng);
            const t = i18n.getFixedT(lng, "courses");

            for (const count of [1, 2]) {
                const out = t("lessonList.andNOthers", {count});
                expect(out).not.toMatch(/\{\{|\}\}/);
                expect(out).not.toBe("lessonList.andNOthers");
                expect(out.startsWith(", ")).toBe(true);
                expect(out).toContain(String(count));
            }
        });
    }
});
