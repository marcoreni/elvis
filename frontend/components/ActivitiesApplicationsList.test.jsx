// i18n extraction test — constants-i18n lot 3 (branch feature/i18n-constants-lot3-labels).
//
// Covers the "Action" column of ActivitiesApplicationsList.jsx (a `react-table` column config
// built inline in `render()`) and specifically the bug found while extracting
// `PRE_APPLICATION_ACTION_LABELS`: the fallback branch used to read
// `PRE_APPLICATION_ACTION_LABELS[PRE_APPLICATION_ACTIONS.NEW]` — indexing the string-keyed
// `PRE_APPLICATION_ACTION_LABELS` object with `PRE_APPLICATION_ACTIONS.NEW` (the *numeric* enum
// value `0`), which is always `undefined` — instead of `PRE_APPLICATION_ACTION_LABELS.new`. The
// unused `PRE_APPLICATION_ACTIONS` import was removed alongside the fix.
//
// `TanStackGrid` (docs/Modernization-Roadmap.md item 13 -- ActivitiesApplicationsList moved off
// `react-table` onto it) is rendered for REAL here (wrapped only to capture the live props,
// mirroring the `lastGridProps` technique in `activityApplications/summary/Activity.test.jsx`) so
// the checkbox-controlled-state, row-click-to-open, and pagination-clamp regressions below (added
// during the item-13 final-3-files migration, see docs/Modernization-Roadmap.md) exercise real DOM
// behaviour. The "action" column test still just grabs `columns` off the captured props to call
// its `accessor` closure directly, without needing fabricated fetched data.
//
// `currentUserIsAdmin: false` keeps the render path light (skips
// ActivitiesApplicationsDashboard / StopList / the admin-only import/export buttons), so the
// component can be mounted with a minimal prop set.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../i18n";
import ActivitiesApplicationsList from "./ActivitiesApplicationsList";

let lastGridProps = null;
vi.mock("./common/baseDataTable/TanStackGrid", async (importOriginal) => {
    const actual = await importOriginal();
    const RealTanStackGrid = actual.default;
    return {
        ...actual,
        default: (props) => {
            lastGridProps = props;
            return <RealTanStackGrid {...props} />;
        },
    };
});

// Builds a fetch mock for `/inscriptions/list*` (the applications page) plus a generic-but-valid
// `/users/:id/infos` response (UserWithInfos' popover data, fired as a side effect of clicking the
// "name" column) so neither crashes on an unexpected response shape.
function mockFetchApplications(
    applications,
    { pages = 1, total = applications.length, pendingTotal = 0 } = {}
) {
    global.fetch = vi.fn((url) => {
        const u = String(url);
        if (u.includes("/inscriptions/list")) {
            return Promise.resolve({
                json: () =>
                    Promise.resolve({
                        applications,
                        pages,
                        total,
                        pending_total: pendingTotal,
                    }),
            });
        }
        if (u.includes("/infos")) {
            return Promise.resolve({
                ok: true,
                headers: { get: () => "application/json" },
                json: () =>
                    Promise.resolve({
                        id: 1,
                        first_name: "Info",
                        last_name: "User",
                        birthday: "2000-01-01",
                        email: "info@example.com",
                        telephones: [],
                        family_links_with_user: [],
                    }),
            });
        }
        return Promise.resolve({
            ok: true,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({}),
        });
    });
}

function makeRow(id, overrides = {}) {
    return {
        id,
        user_id: id * 10,
        user: {
            adherent_number: `A${id}`,
            first_name: `First${id}`,
            last_name: `Last${id}`,
            birthday: null,
        },
        created_at: "2024-01-15T00:00:00Z",
        activity_refs: [],
        activity_application_status_id: 1,
        referent: null,
        season: null,
        mail_sent: false,
        pre_application_desired_activity: null,
        pre_application_activity: null,
        ...overrides,
    };
}

beforeEach(() => {
    lastGridProps = null;
    global.fetch = vi.fn().mockResolvedValue({
        json: () =>
            Promise.resolve({
                applications: [],
                pages: 0,
                total: 0,
                pending_total: 0,
            }),
    });
});

afterEach(async () => {
    vi.clearAllMocks();
    delete global.fetch;
    await i18n.changeLanguage("fr");
});

const baseProps = () => ({
    currentUserIsAdmin: false,
    activities: [],
    statuses: [],
    admins: [],
    seasons: [],
    evaluationLevelRefs: [],
    dashboardInfos: {},
});

function getActionColumn() {
    const col = (lastGridProps?.columns || []).find((c) => c.id === "action");
    expect(col).toBeDefined();
    return col;
}

describe("ActivitiesApplicationsList — Action column fallback", () => {
    test.each(["fr", "en"])(
        "a row with neither pre_application_desired_activity nor pre_application_activity falls back to the 'new' label, not undefined (%s)",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(<ActivitiesApplicationsList {...baseProps()} />);

            const { accessor } = getActionColumn();
            const expected =
                lng === "fr" ? "Nouvelle inscription" : "New enrollment";

            // The pre-fix bug returned `undefined` here (indexing with the numeric enum value 0);
            // `.toBe(expected)` below already fails on that, so no separate `.not.toBeUndefined()`.
            expect(
                accessor({
                    pre_application_desired_activity: null,
                    pre_application_activity: null,
                })
            ).toBe(expected);
        }
    );

    test("prefers pre_application_desired_activity's action over pre_application_activity's", async () => {
        await i18n.changeLanguage("fr");
        render(<ActivitiesApplicationsList {...baseProps()} />);
        const { accessor } = getActionColumn();

        expect(
            accessor({
                pre_application_desired_activity: { action: "renew" },
                pre_application_activity: { action: "change" },
            })
        ).toBe("Renouvellement");
    });

    test("falls back to pre_application_activity's action when no pre_application_desired_activity", async () => {
        await i18n.changeLanguage("fr");
        render(<ActivitiesApplicationsList {...baseProps()} />);
        const { accessor } = getActionColumn();

        expect(
            accessor({
                pre_application_desired_activity: null,
                pre_application_activity: { action: "change" },
            })
        ).toBe("Changement");
    });

    test.each(["fr", "en"])(
        "action labels follow the active UI language (%s)",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(<ActivitiesApplicationsList {...baseProps()} />);
            const { accessor } = getActionColumn();

            const expected = lng === "fr" ? "Arrêt" : "Stop";
            expect(
                accessor({
                    pre_application_desired_activity: { action: "stop" },
                    pre_application_activity: null,
                })
            ).toBe(expected);
        }
    );
});

// ==================================================================================================
// Regression: the "selection" column's checkboxes are now fully controlled
// ==================================================================================================
//
// Pre-fix, the row `Cell` only had `defaultChecked` (no `checked` prop at all) -- so once a row's
// checkbox mounted, it never reflected a later change to `bulkTargets` driven from elsewhere (e.g.
// the header's "select all"), only a direct click on that same checkbox. Asserting on the DOM
// node's `.checked` after the interaction (not just on internal `bulkTargets` state) is what would
// have caught it -- a purely-internal-state assertion passes even with the old uncontrolled input.
describe("ActivitiesApplicationsList — selection checkboxes stay fully controlled (regression)", () => {
    test("selecting all via the header checkbox visually checks every row's own checkbox", async () => {
        mockFetchApplications([makeRow(1), makeRow(2)], { pages: 1, total: 2 });

        render(<ActivitiesApplicationsList {...baseProps()} />);

        // header + one checkbox per fetched row
        await waitFor(() =>
            expect(screen.getAllByRole("checkbox")).toHaveLength(3)
        );

        const getSelectionColumn = () =>
            lastGridProps.columns.find((c) => c.id === "selection");

        // Standalone mounts of the row Cell's own closure (the exact function TanStackGrid
        // renders -- captured off the live props, same technique as the "action" column test
        // above). TanStackGrid's real rendering always remounts every cell on any state change
        // (`flexRender` treats a function `cell` as a distinct component type every render --
        // see @tanstack/react-table's `isReactComponent`), which would mask the very bug this
        // guards against: a fresh mount reads the current value either way, `checked` or
        // `defaultChecked`. Rendering the closures' own output here and `rerender`-ing them in
        // place after the interaction instead exercises a real DOM *update* -- exactly where a
        // controlled `checked` (kept in sync) and an uncontrolled `defaultChecked` (frozen at
        // first mount) actually diverge.
        const cell1 = render(
            <div>
                {getSelectionColumn().Cell({ original: { id: 1 }, index: 0 })}
            </div>
        );
        const cell2 = render(
            <div>
                {getSelectionColumn().Cell({ original: { id: 2 }, index: 1 })}
            </div>
        );
        expect(cell1.container.querySelector("input").checked).toBe(false);
        expect(cell2.container.querySelector("input").checked).toBe(false);

        // Real UI action: click the actual "select all" checkbox the grid renders.
        await userEvent.click(screen.getAllByRole("checkbox")[0]);

        const freshColumn = getSelectionColumn();
        cell1.rerender(
            <div>{freshColumn.Cell({ original: { id: 1 }, index: 0 })}</div>
        );
        cell2.rerender(
            <div>{freshColumn.Cell({ original: { id: 2 }, index: 1 })}</div>
        );

        expect(cell1.container.querySelector("input").checked).toBe(true);
        expect(cell2.container.querySelector("input").checked).toBe(true);
    });
});

// ==================================================================================================
// Regression: row-click-to-open, replicated via getRowProps + per-column stopRowClick
// ==================================================================================================
//
// v6's per-cell `getTdProps` excluded the "selection" and "name" columns from the row's
// open-in-a-new-tab click handler for their whole `<td>` box, padding included. TanStackGrid only
// exposes a per-ROW hook (`getRowProps`), so the migration attaches
// `onClick={() => window.open(...)}` to the row and sets `stopRowClick: true` on those two
// columns, which makes TanStackGrid itself attach `onClick={(e) => e.stopPropagation()}` directly
// to their `<td>` elements -- covering the raw `<td>` (its padding included), not just whatever
// element the column's own `Cell` renders inside it (an earlier version of this fix stopped
// propagation from a `<span>` wrapping the Cell's content, which left the `<td>`'s own padding
// unguarded).
describe("ActivitiesApplicationsList — row click opens the application, excluding selection & name cells (regression)", () => {
    let originalOpen;

    beforeEach(() => {
        originalOpen = window.open;
        window.open = vi.fn();
    });

    afterEach(() => {
        window.open = originalOpen;
    });

    test("a non-excluded cell opens the application; the selection checkbox and the name cell do not", async () => {
        mockFetchApplications([makeRow(7)], { pages: 1, total: 1 });

        const { container } = render(
            <ActivitiesApplicationsList {...baseProps()} />
        );

        // A loading-spinner row (a single <td colspan> cell) renders first, so waiting on
        // "1 tbody row" alone is satisfied by that placeholder -- wait for the actual data row's
        // cells (one <td> per column, not the spinner's single colspan cell) instead.
        await waitFor(() =>
            expect(
                container.querySelectorAll("tbody tr td").length
            ).toBeGreaterThan(1)
        );

        // Column order for a non-admin (season_id / mail_sent filtered out):
        // 0 selection, 1 adherent_number, 2 id, 3 date, 4 name, ...
        const cells = container.querySelectorAll("tbody tr td");

        await userEvent.click(cells[3]); // "date" -- not excluded
        expect(window.open).toHaveBeenCalledWith("/inscriptions/7");
        window.open.mockClear();

        await userEvent.click(cells[0].querySelector('input[type="checkbox"]'));
        expect(window.open).not.toHaveBeenCalled();
        window.open.mockClear();

        await userEvent.click(cells[4].querySelector("a"));
        expect(window.open).not.toHaveBeenCalled();
        window.open.mockClear();

        // The raw <td> itself (its padding, not the checkbox/link inside it) must also be
        // excluded -- this is what the stopRowClick fix covers that a Cell-content-only
        // stopPropagation span didn't.
        await userEvent.click(cells[0]);
        expect(window.open).not.toHaveBeenCalled();
        window.open.mockClear();

        await userEvent.click(cells[4]);
        expect(window.open).not.toHaveBeenCalled();
    });
});

// ==================================================================================================
// Regression: pagination is clamped, not left stranded on an out-of-range page
// ==================================================================================================
//
// Added during this migration (matching the same fix already applied to Activity.jsx /
// DuePaymentList.jsx): `fetchData` itself re-fetches when a response reports fewer pages than
// requested (`res.pages > 0 && filter.page >= res.pages`), landing `this.state.filter.page` back
// in range -- not a render-time clamp on the `pagination` prop (there isn't one; `pageIndex` is
// just `this.state.filter.page`). Exercised here via a reload (the refresh button) that returns
// fewer pages than before -- unlike a filter change, a plain refresh keeps `filter.page` unchanged,
// so only this fetchData-level re-fetch (not the separate `page: 0` reset on filter changes) can
// keep the table from being stranded.
describe("ActivitiesApplicationsList — pagination clamp (regression)", () => {
    test("paging forward then reloading with fewer pages clamps back into range", async () => {
        let shrunk = false;
        global.fetch = vi.fn((url) => {
            const u = String(url);
            if (u.includes("/inscriptions/list")) {
                return Promise.resolve({
                    json: () =>
                        Promise.resolve({
                            applications: [makeRow(1)],
                            pages: shrunk ? 1 : 3,
                            total: shrunk ? 1 : 40,
                            pending_total: 0,
                        }),
                });
            }
            return Promise.resolve({
                ok: true,
                headers: { get: () => "application/json" },
                json: () => Promise.resolve({}),
            });
        });

        const tCommon = i18n.getFixedT("fr", "common");
        const tApp = i18n.getFixedT("fr", "activityApplications");
        const pageOf = (page, of) =>
            `${tCommon("reactTable.pageText")} ${page} ${tCommon(
                "reactTable.ofText"
            )} ${of}`;

        const { container } = render(
            <ActivitiesApplicationsList {...baseProps()} />
        );
        const normalized = () => container.textContent.replace(/\s+/g, " ");

        await waitFor(() => expect(normalized()).toContain(pageOf(1, 3)), {
            timeout: 2000,
        });

        const nextButton = screen.getByText(tCommon("reactTable.nextText"));
        await userEvent.click(nextButton);
        await waitFor(() => expect(normalized()).toContain(pageOf(2, 3)), {
            timeout: 2000,
        });

        await userEvent.click(nextButton);
        await waitFor(() => expect(normalized()).toContain(pageOf(3, 3)), {
            timeout: 2000,
        });

        // Simulate a reload (e.g. rows removed elsewhere) reporting fewer total pages, without
        // resetting `filter.page` the way a filter change would.
        shrunk = true;
        const refreshButton = container.querySelector(
            `[data-tippy-content="${tApp("list.tooltips.refreshData")}"]`
        );
        await userEvent.click(refreshButton);

        await waitFor(() => expect(normalized()).toContain(pageOf(1, 1)), {
            timeout: 2000,
        });
        expect(normalized()).not.toContain(tCommon("reactTable.noDataText"));
    });
});

// ==================================================================================================
// Regression: fetchData itself re-fetches a stale out-of-range page instead of committing it
// ==================================================================================================
//
// The above test's mock always returns a row regardless of the requested page, so it never actually
// exercises a real backend's behaviour for an out-of-range page (an empty `applications` array).
// This reproduces the persisted-stale-page scenario from the bug report directly: `localStorage`
// holds `filter.page: 2` from a previous session (e.g. rows were deleted elsewhere, shrinking the
// list to 1 page), `componentDidMount` fetches page 2 first and gets an empty response, and
// `fetchData` must re-fetch page 0 itself -- landing `this.state.filter.page` at `0`, not just
// clamping what's displayed -- rather than committing the stale, empty page.
describe("ActivitiesApplicationsList — fetchData re-fetches a stale out-of-range page (regression)", () => {
    const FILTER_STORAGE_KEY = "activities_application_list_filters";

    afterEach(() => {
        localStorage.removeItem(FILTER_STORAGE_KEY);
    });

    test("mounting on a persisted stale page recovers onto the real last page, not an empty one", async () => {
        localStorage.setItem(
            FILTER_STORAGE_KEY,
            JSON.stringify({
                page: 2,
                pageSize: 16,
                sorted: [{ id: "date", desc: true }],
                filtered: [],
                resized: [],
                expanded: {},
            })
        );

        const requestedPages = [];
        global.fetch = vi.fn((url, options) => {
            const u = String(url);
            if (u.includes("/inscriptions/list")) {
                const { page } = JSON.parse(options.body);
                requestedPages.push(page);
                return Promise.resolve({
                    json: () =>
                        Promise.resolve(
                            page >= 1
                                ? {
                                      applications: [],
                                      pages: 1,
                                      total: 1,
                                      pending_total: 0,
                                  }
                                : {
                                      applications: [makeRow(1)],
                                      pages: 1,
                                      total: 1,
                                      pending_total: 0,
                                  }
                        ),
                });
            }
            return Promise.resolve({
                ok: true,
                headers: { get: () => "application/json" },
                json: () => Promise.resolve({}),
            });
        });

        const tCommon = i18n.getFixedT("fr", "common");
        const pageOf = (page, of) =>
            `${tCommon("reactTable.pageText")} ${page} ${tCommon(
                "reactTable.ofText"
            )} ${of}`;

        const { container } = render(
            <ActivitiesApplicationsList {...baseProps()} />
        );
        const normalized = () => container.textContent.replace(/\s+/g, " ");

        // Wait for the recovered row itself (not just the "Page 1 sur 1" text, which can already
        // read that way transiently -- `pages` defaults to 0 and `Math.max(getPageCount(), 1)`
        // floors the "of" count to 1 -- before the second fetch has actually landed).
        await waitFor(() => expect(requestedPages).toEqual([2, 0]), {
            timeout: 5000,
        });
        await waitFor(() => expect(normalized()).toContain("A1"), {
            timeout: 5000,
        });
        expect(normalized()).toContain(pageOf(1, 1));
        expect(normalized()).not.toContain(tCommon("reactTable.noDataText"));
    });
});

// ==================================================================================================
// Regression: a stale page-clamp recovery re-fetch must not clobber a fresher, superseded request
// ==================================================================================================
//
// Code-review finding on this branch: the recovery branch above (and the plain `setState` path
// beneath it) closed over the `filter` argument `fetchData` was originally called with, with no
// check that it was still the *current* one. Since `fetchData` synchronously commits
// `this.state.filter` on every call, a slow/gated response landing after a newer `fetchData` call
// (e.g. the user typing a filter) would resolve using the OLD filter -- silently overwriting the
// user's fresh filter and page with the stale one. `fetchData`'s `.then` now bails out early
// (`this.state.filter !== filter`) whenever a newer call has already superseded it.
describe("ActivitiesApplicationsList — fetchData guards against a superseded stale response (regression)", () => {
    afterEach(() => {
        localStorage.removeItem("activities_application_list_filters");
    });

    test("a filter typed while a stale out-of-range page is still in flight is not discarded", async () => {
        localStorage.setItem(
            "activities_application_list_filters",
            JSON.stringify({
                page: 5,
                pageSize: 16,
                sorted: [{ id: "date", desc: true }],
                filtered: [],
                resized: [],
                expanded: {},
            })
        );

        let resolveStalePage;
        const stalePageGate = new Promise((resolve) => {
            resolveStalePage = resolve;
        });

        const requestedBodies = [];
        global.fetch = vi.fn((url, options) => {
            const u = String(url);
            if (!u.includes("/inscriptions/list")) {
                return Promise.resolve({
                    ok: true,
                    headers: { get: () => "application/json" },
                    json: () => Promise.resolve({}),
                });
            }

            const body = JSON.parse(options.body);
            requestedBodies.push(body);

            if (body.page === 5) {
                // The persisted stale page-5 request: held open until the test releases it,
                // simulating a slow response landing after the user has already moved on.
                return stalePageGate.then(() => ({
                    json: () =>
                        Promise.resolve({
                            applications: [],
                            pages: 3,
                            total: 40,
                            pending_total: 0,
                        }),
                }));
            }

            return Promise.resolve({
                json: () =>
                    Promise.resolve({
                        applications: [makeRow(1)],
                        pages: 2,
                        total: 20,
                        pending_total: 0,
                    }),
            });
        });

        render(<ActivitiesApplicationsList {...baseProps()} />);

        // componentDidMount's fetchData({page: 5, ...}) debounces 400ms before the gated request
        // actually fires.
        await waitFor(
            () => expect(requestedBodies.some((b) => b.page === 5)).toBe(true),
            { timeout: 5000 }
        );

        // While that request is still in flight, the user types a filter -- the exact
        // onColumnFiltersChange wiring a real filter box uses, which resets to page 0.
        const freshFilter = [{ id: "adherent_number", value: "A1" }];
        lastGridProps.onColumnFiltersChange(freshFilter);

        // Let the fresh request's own debounce/fetch/setState fully land before releasing the
        // stale one.
        await waitFor(
            () => expect(requestedBodies.some((b) => b.page === 0)).toBe(true),
            { timeout: 5000 }
        );
        await waitFor(() => expect(screen.queryByText("A1")).not.toBeNull(), {
            timeout: 5000,
        });

        // Now release the earlier, superseded page-5 response and give its guarded `.then` (plus,
        // if the bug were present, its own 400ms-debounced recovery re-fetch) time to run.
        resolveStalePage();
        await new Promise((resolve) => setTimeout(resolve, 800));

        // No recovery re-fetch for `page: res.pages - 1 (2)` using the stale, now-discarded
        // `filtered: []` should ever have been made.
        expect(
            requestedBodies.some((b) => b.page === 2 && b.filtered.length === 0)
        ).toBe(false);
        // The fresh filter must still be the last (and current) one in effect.
        expect(requestedBodies[requestedBodies.length - 1].filtered).toEqual(
            freshFilter
        );
        expect(screen.queryByText("A1")).not.toBeNull();
    });
});
