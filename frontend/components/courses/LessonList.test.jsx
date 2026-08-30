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
import {render, screen, waitFor} from "@testing-library/react";
import i18n from "../../i18n";
import LessonList from "./LessonList";

vi.mock("react-table", () => ({
    default: props => (
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
    ),
}));

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
