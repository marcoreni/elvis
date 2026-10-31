// Component tests for courses/LessonList.tsx (converted from a class to a typed functional
// component -- see docs/KnownIssues.md's former "courses/LessonList.jsx's 'season' filter calls
// setState during render" entry for why). `render` reads `t` from a live `useTranslation("courses")`
// call now instead of a `withTranslation` HOC prop, so language is still driven through the
// frontend/i18n singleton (no <I18nextProvider> needed; the initReactI18next wiring covers it).
//
// What is mocked and why:
//  - `common/baseDataTable/TanStackGrid` (the real grid since item 13 batch 3) is headless and
//    renders fine in jsdom (unlike v6's `react-table`, which did DOM measurement that didn't) --
//    mocked here anyway because the point of this file is the i18n wiring, not the grid itself
//    (covered directly by TanStackGrid.test.tsx and by its other consumers' tests, e.g.
//    PlanningsSettings.test.jsx, PaymentsSettings.test.jsx). The stub renders the resolved string
//    `Header`s of the `columns` prop and stashes every prop so a test can invoke `Cell`/`Filter`/
//    `renderSubComponent` directly with synthetic row data, without needing a real table mount.
//  - `MessageModal`, `ListPreferences`, `DeleteCourseModal` — heavy children that carry none of
//    this component's own copy.
//  - `sweetalert2` / `react-toastify` — only used in event handlers (not render); stubbed so the
//    import graph stays light.
//
// The mount effect -> fetchData -> module fn `fetchInstancesList` does
// `fetch("/activities.json", {POST})`, but behind a module-level `_.debounce(fn, 400)`, so the
// fetch fires ~400ms after mount. `globalThis.fetch` is stubbed to resolve
// `{ data: [], pages: 1, total: 7 }`; a trailing `waitFor(fetch called)` drains that pending
// update. Assertions target the synchronously-rendered header row and the `courseCount` <h2>
// (state.total starts at 0).
//
// UserList / UserRow are module-local functions (not exported) — unreachable from a test. Their
// interpolated + plural keys are guarded at the i18n layer instead (see the last describe block).

import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import i18n from "../../i18n";
import LessonList from "./LessonList";

// Stashes the live grid props so a test can invoke the raw `Cell`/`Filter`/`renderSubComponent`
// functions LessonList builds, and reach the otherwise-unexported UserList / UserRow.
let lastGridProps: any = null;
vi.mock("../common/baseDataTable/TanStackGrid", () => ({
    default: (props: any) => {
        lastGridProps = props;
        return (
            <div data-testid="tanstack-grid-stub">
                {(props.columns || []).map((c: any, i: number) => (
                    <span key={i} data-testid="rt-header">
                        {typeof c.Header === "string" ? c.Header : ""}
                    </span>
                ))}
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
// ANYTHING in this render", not "the studentLevel fetch's callback" -- LessonList.tsx itself
// registers two more `.success()` handlers (onSubmit's delete-all/delete-selected branches), which
// don't fire today only because nothing in these tests clicks the buttons that would trigger them.
// Resetting both in beforeEach + asserting the captured URL keeps a future test from silently
// asserting against the wrong callback if that ever changes.
let lastApiSuccess: ((data: any) => void) | null = null;
let lastApiSuccessUrl: string | null = null;
vi.mock("../../tools/api", () => {
    const chain: any = {};
    chain.set = () => chain;
    chain.success = (cb: any) => {
        lastApiSuccess = cb;
        return chain;
    };
    chain.error = () => chain;
    chain.get = (url: string) => {
        lastApiSuccessUrl = url;
        return chain;
    };
    chain.post = () => chain;
    chain.del = () => chain;
    return { ...chain, set: () => chain };
});

// Partial mock: keep every real helper except force levelDisplayForActivity to return the French
// "NON INDIQUÉ" sentinel (its real no-level-rows return) so the English row must still show the
// translated placeholder, not the raw sentinel.
vi.mock(
    "../planning/TimeIntervalHelpers",
    async (importOriginal: () => Promise<object>) => {
        const actual = await importOriginal();
        return {
            ...actual,
            levelDisplayForActivity: () => "NON INDIQUÉ",
        };
    }
);

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
    default: { fire: vi.fn() },
}));

vi.mock("react-toastify", () => ({
    toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const fetchOk = (body: unknown) =>
    vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => null },
        json: () => Promise.resolve(body),
    });

beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = fetchOk({ data: [], pages: 1, total: 7 });
    lastApiSuccess = null;
    lastApiSuccessUrl = null;
    lastGridProps = null;
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

// Converted from a withTranslation-wrapped class to a plain functional component (the fix for the
// render-time setState below required real hooks). Replaces the old ".WrappedComponent is a
// React.Component" assertion, which tested exactly the implementation this conversion removes.
test("is a plain function component (no class, no withTranslation HOC)", () => {
    expect(LessonList.prototype instanceof React.Component).toBe(false);
    expect((LessonList as any).WrappedComponent).toBeUndefined();
});

describe("LessonList — column header row (i18n)", () => {
    const headerTexts = () =>
        screen.getAllByTestId("rt-header").map((n) => n.textContent);

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

        // courseCount <h2> — state.total starts at 0 (fetch is debounced), fr plural _other.
        expect(
            screen.getByRole("heading", { name: "0 cours" })
        ).toBeInTheDocument();

        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
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

        expect(
            screen.getByRole("heading", { name: "0 courses" })
        ).toBeInTheDocument();

        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    });

    // isTeacherView hides the teacher column — proves the conditional column spread still keys
    // its Header off the translation, and that the header row is genuinely coming from `t`.
    test("omits the Professeur column when isTeacherView is true", async () => {
        await i18n.changeLanguage("fr");
        render(<LessonList {...makeProps()} isTeacherView={true} />);

        const headers = headerTexts();
        expect(headers).toEqual(expect.arrayContaining(["Jour", "Horaires"]));
        expect(headers).not.toContain("Professeur");

        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    });
});

// Regression for the render-time setState documented in docs/KnownIssues.md's former "courses/
// LessonList.jsx's 'season' filter calls setState during render" entry: the season column's
// Filter used to call onChange()/this.setState() unconditionally from its own render body,
// producing a real React console warning ("Cannot update during an existing state transition").
// The fix moves that into a useEffect keyed off currentAppsSeason becoming available (mirroring
// componentDidMount's own dependency) -- assert both that the warning is gone AND that the season
// filter still ends up applied, since removing a side effect from render is only a real fix if
// the resulting behavior is unchanged.
describe("season filter applies without a render-time setState warning", () => {
    test("no console.error is logged while the current season's filter is applied", async () => {
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});

        render(<LessonList {...makeProps()} />);

        // Drain both the mount effect's fetch and the season-filter effect's fetch (both go
        // through the same debounced fetchInstancesList; only the season-filter one actually
        // reaches fetch(), since lodash's trailing-edge debounce drops the earlier call).
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
        // Give the effect pass that applies the season filter a tick to run and settle.
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(consoleError).not.toHaveBeenCalled();

        // The season filter actually landed in the grid's controlled columnFilters state —
        // proves the useEffect replacement still produces the same real outcome the old
        // render-time hack did, not just a quieter console.
        expect(lastGridProps.columnFilters).toEqual(
            expect.arrayContaining([{ id: "season_id", value: 1 }])
        );

        consoleError.mockRestore();
    });

    test("does not reapply the season filter on a later unrelated re-render", async () => {
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});

        const { rerender } = render(<LessonList {...makeProps()} />);
        await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        (globalThis.fetch as any).mockClear();

        // Re-render with the same props (e.g. a parent re-render) — filterApplied is already
        // true, so the season effect must not fire fetchData again.
        rerender(<LessonList {...makeProps()} />);
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
        });

        expect(globalThis.fetch).not.toHaveBeenCalled();
        expect(consoleError).not.toHaveBeenCalled();

        consoleError.mockRestore();
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
        time_interval: { id: 7, start: "2025-09-08T17:00:00" },
        time_interval_id: 7,
        activity_ref: { is_work_group: false },
        teacher: { id: 2 },
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
                stopped_at: undefined as string | undefined,
            },
        ],
    });

    const renderSubRow = async (lng: string) => {
        await i18n.changeLanguage(lng);
        render(<LessonList {...makeProps()} />);
        await waitFor(() => expect(lastGridProps).not.toBeNull());
        const sub = lastGridProps.renderSubComponent({
            original: activityFixture(),
        });
        return render(sub);
    };

    test("fr — expander header + level sentinel render in French", async () => {
        const { getByText } = await renderSubRow("fr");
        expect(getByText("0/1 évaluations remplies")).toBeInTheDocument();
        expect(getByText("Consulter les évaluations")).toBeInTheDocument();
        expect(getByText("Nom")).toBeInTheDocument();
        // displayLevel(): levelDisplayForActivity -> "NON INDIQUÉ" -> translated placeholder
        expect(getByText("NON INDIQUÉ")).toBeInTheDocument();
    });

    test("en — expander header + level sentinel render in English (no raw French)", async () => {
        const { getByText, queryByText } = await renderSubRow("en");
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
        await waitFor(() => expect(lastGridProps).not.toBeNull());
        const frSub = render(
            lastGridProps.renderSubComponent({ original: withStoppedAt() })
        );
        expect(frSub.getByText("01/01/2020")).toBeInTheDocument();
        expect(frSub.getByText("15/06/2030")).toBeInTheDocument();
        frSub.unmount();
        frList.unmount();

        await i18n.changeLanguage("en");
        const enList = render(<LessonList {...makeProps()} />);
        await waitFor(() => expect(lastGridProps).not.toBeNull());
        const enSub = render(
            lastGridProps.renderSubComponent({ original: withStoppedAt() })
        );
        expect(enSub.getByText("1/1/2020")).toBeInTheDocument();
        expect(enSub.getByText("6/15/2030")).toBeInTheDocument();
        enSub.unmount();
        enList.unmount();
    });

    // Regression: begin_at/stopped_at are Paris-zone timestamps (config.time_zone = "Paris") at
    // local midnight, but Intl.DateTimeFormat(...) with no `timeZone` option formats in the
    // *machine's* zone instead -- for a Paris-midnight instant, any machine west of Paris (e.g.
    // an en-US server or CI runner on UTC) rolls the displayed date back to the previous day. This
    // is exactly the audience the fr->i18n.language fix above was supposed to help. Verified with
    // `TZ=America/New_York` locally, where this test fails without the `timeZone: "Europe/Paris"`
    // option and passes with it, regardless of the ambient TZ.
    test("Started/Stopped dates don't roll back a day on a machine west of Paris", async () => {
        const withParisMidnight = () => {
            const fixture = activityFixture();
            fixture.users[0].begin_at = "2020-01-01T00:00:00+01:00"; // Paris midnight, winter (UTC+1)
            fixture.users[0].stopped_at = "2030-06-15T00:00:00+02:00"; // Paris midnight, summer (UTC+2)
            return fixture;
        };

        await i18n.changeLanguage("en");
        render(<LessonList {...makeProps()} />);
        await waitFor(() => expect(lastGridProps).not.toBeNull());
        const sub = render(
            lastGridProps.renderSubComponent({ original: withParisMidnight() })
        );
        expect(sub.getByText("1/1/2020")).toBeInTheDocument();
        expect(sub.getByText("6/15/2030")).toBeInTheDocument();
    });

    // Regression: UserRow used to read `data.evaluation_level_ref.label` from the API response,
    // but desired_activity_controller.rb renders evaluation_level_ref as a bare string, not an
    // object -- `.label` on a string is always undefined, so studentLevel never got set and the
    // component always fell through to the levelDisplayForActivity recompute, regardless of what
    // the API actually returned.
    test("studentLevel is set straight from the API's evaluation_level_ref string, no .label", async () => {
        await i18n.changeLanguage("fr");
        render(<LessonList {...makeProps()} />);
        await waitFor(() => expect(lastGridProps).not.toBeNull());
        render(
            lastGridProps.renderSubComponent({ original: activityFixture() })
        );

        expect(lastApiSuccess).not.toBeNull();
        // Pin which fetch this callback actually belongs to, since the mock's chain is shared
        // across every api.set() call in the module (see the mock's own comment above).
        expect(lastApiSuccessUrl).toMatch(
            /^\/desired_activities\/user\/\d+\/activity\/\d+\/ref\/\d+\/time\/\d+$/
        );
        act(() => {
            lastApiSuccess!({
                id: 1,
                evaluation_level_ref: "Débutant",
                activity_application_id: 5,
            });
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
    const cases: [string, Record<string, unknown>][] = [
        // sendReminderMail: t("lessonList.httpError", { status, statusText })
        ["lessonList.httpError", { status: 500, statusText: "Boom" }],
        // UserList: t("lessonList.userList.evaluationsFilled", { done, total })
        ["lessonList.userList.evaluationsFilled", { done: 2, total: 5 }],
        // UserRow: t("lessonList.userRow.ageYears", { age })
        ["lessonList.userRow.ageYears", { age: 9 }],
        // renderTargetsAlert: t("lessonList.selectedCount", { count })
        ["lessonList.selectedCount", { count: 1 }],
        ["lessonList.selectedCount", { count: 3 }],
        // <h2>: t("lessonList.courseCount", { count })
        ["lessonList.courseCount", { count: 1 }],
        ["lessonList.courseCount", { count: 3 }],
        // renderTargetsAlert: t("lessonList.selectRemaining", { count })
        ["lessonList.selectRemaining", { count: 4 }],
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
                const out = t("lessonList.andNOthers", { count });
                expect(out).not.toMatch(/\{\{|\}\}/);
                expect(out).not.toBe("lessonList.andNOthers");
                expect(out.startsWith(", ")).toBe(true);
                expect(out).toContain(String(count));
            }
        });
    }
});
