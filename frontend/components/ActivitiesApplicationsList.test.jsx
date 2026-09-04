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
// `react-table` is mocked to capture `props.columns` (same pattern as
// `activityApplications/summary/Activity.test.jsx`), so the "action" column's `accessor` function
// — the exact closure built inside `render()`, over the live `PRE_APPLICATION_ACTION_LABELS`
// binding — can be called directly with a fabricated row, without needing react-table's real grid
// to render in jsdom.
//
// `currentUserIsAdmin: false` keeps the render path light (skips
// ActivitiesApplicationsDashboard / StopList / the admin-only import/export buttons), so the
// component can be mounted with a minimal prop set.

import React from "react";
import {render} from "@testing-library/react";
import i18n from "../i18n";
import ActivitiesApplicationsList from "./ActivitiesApplicationsList";

let mockLastColumns = null;
vi.mock("react-table", () => ({
    default: props => {
        mockLastColumns = props.columns;
        return <div data-testid="react-table" />;
    },
}));

beforeEach(() => {
    mockLastColumns = null;
    global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({applications: [], pages: 0, total: 0, pending_total: 0}),
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
    const col = (mockLastColumns || []).find(c => c.id === "action");
    expect(col).toBeDefined();
    return col;
}

describe("ActivitiesApplicationsList — Action column fallback", () => {
    test.each(["fr", "en"])(
        "a row with neither pre_application_desired_activity nor pre_application_activity falls back to the 'new' label, not undefined (%s)",
        async lng => {
            await i18n.changeLanguage(lng);
            render(<ActivitiesApplicationsList {...baseProps()} />);

            const {accessor} = getActionColumn();
            const expected = lng === "fr" ? "Nouvelle inscription" : "New enrollment";

            // The pre-fix bug returned `undefined` here (indexing with the numeric enum value 0);
            // `.toBe(expected)` below already fails on that, so no separate `.not.toBeUndefined()`.
            expect(accessor({pre_application_desired_activity: null, pre_application_activity: null})).toBe(
                expected,
            );
        },
    );

    test("prefers pre_application_desired_activity's action over pre_application_activity's", async () => {
        await i18n.changeLanguage("fr");
        render(<ActivitiesApplicationsList {...baseProps()} />);
        const {accessor} = getActionColumn();

        expect(
            accessor({
                pre_application_desired_activity: {action: "renew"},
                pre_application_activity: {action: "change"},
            }),
        ).toBe("Renouvellement");
    });

    test("falls back to pre_application_activity's action when no pre_application_desired_activity", async () => {
        await i18n.changeLanguage("fr");
        render(<ActivitiesApplicationsList {...baseProps()} />);
        const {accessor} = getActionColumn();

        expect(
            accessor({pre_application_desired_activity: null, pre_application_activity: {action: "change"}}),
        ).toBe("Changement");
    });

    test.each(["fr", "en"])("action labels follow the active UI language (%s)", async lng => {
        await i18n.changeLanguage(lng);
        render(<ActivitiesApplicationsList {...baseProps()} />);
        const {accessor} = getActionColumn();

        const expected = lng === "fr" ? "Arrêt" : "Stop";
        expect(accessor({pre_application_desired_activity: {action: "stop"}, pre_application_activity: null})).toBe(
            expected,
        );
    });
});
