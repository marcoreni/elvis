// Component test for StopList's migration off react-table v6 onto TanStackGrid's client-side
// (manual=false) mode (docs/Modernization-Roadmap.md item 13 batch 4a). No prior test file existed
// for this component. No bug was found migrating this file beyond the general filterable-gating
// change common to every batch 4a file (spot-checked directly in PlanningListRooms.test.jsx).
//
// StopList fetches its full dataset via tools/api only once its modal is opened (the toggle
// button's onClick). The api module is mocked so `.get()` synchronously delivers a fixture
// straight to the registered `.success()` callback, matching this repo's chainable-stub
// convention (see courses/LessonList.test.jsx's api mock) but resolving eagerly instead of being
// driven by a captured callback, since this component has no debounce to work around.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../i18n";
import * as api from "../tools/api";
import StopList from "./StopList";

vi.mock("../tools/api", () => {
    const chain = {};
    let successCb = null;
    chain.set = () => chain;
    chain.success = (cb) => {
        successCb = cb;
        return chain;
    };
    chain.error = () => chain;
    chain.get = () => {
        if (successCb) successCb(queuedDataRef.current);
        return chain;
    };
    const queuedDataRef = { current: [] };
    return {
        set: () => chain,
        __setData: (data) => {
            queuedDataRef.current = data;
        },
    };
});

beforeEach(async () => {
    await i18n.changeLanguage("fr");
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

const STOP_ROWS = [
    {
        id: 1,
        comment: "not_a_known_reason_code",
        pre_application: {
            id: 11,
            season_id: 1,
            user: { first_name: "Jean", last_name: "Dupont" },
            season: { label: "2025-2026" },
        },
        activity: {
            activity_ref: { label: "Piano" },
            teacher: { first_name: "Alice", last_name: "Martin" },
        },
    },
];

test("opening the modal fetches and renders stop rows in the table (client-side/manual=false mode)", async () => {
    api.__setData(STOP_ROWS);
    render(<StopList seasons={[]} />);

    await userEvent.click(screen.getByRole("button"));

    expect(await screen.findByText("Jean Dupont")).toBeInTheDocument();
    expect(screen.getByText("2025-2026")).toBeInTheDocument();
});

// StopList's pagination is controlled (fixed pageSize 15) and its `filteredData` passed into
// TanStackGrid used to be a fresh array every render (an inline `.filter(...)` call), which under
// TanStack's manual={false} row-model memoization triggers `_autoResetPageIndex` and silently
// snaps `pageIndex` back to 0 on every render -- "next page" looked clickable (the footer's own
// "Page X sur Y" text is computed from `pagination` state directly, so it updated fine) but the
// actual row set never changed. 31 rows spans exactly 3 pages (15 + 15 + 1) -- enough to click
// "next" twice and confirm the visible rows really move forward each time, not just the footer.
const buildStopRows = (count) =>
    Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        comment: "not_a_known_reason_code",
        pre_application: {
            id: 100 + i,
            season_id: 1,
            user: { first_name: `Prenom${i}`, last_name: `Nom${i}` },
            season: { label: "2025-2026" },
        },
        activity: {
            activity_ref: { label: "Piano" },
            teacher: { first_name: "Alice", last_name: "Martin" },
        },
    }));

test("pagination past page 1 is reachable and keeps advancing on repeated clicks (regression: an unstable `data` reference reset pageIndex to 0 every render)", async () => {
    api.__setData(buildStopRows(31));
    render(<StopList seasons={[]} />);

    await userEvent.click(screen.getByRole("button"));

    // Page 1: row 0 visible, the last page's row not yet.
    expect(await screen.findByText("Prenom0 Nom0")).toBeInTheDocument();
    expect(screen.queryByText("Prenom30 Nom30")).not.toBeInTheDocument();

    const nextButton = screen.getByRole("button", { name: "Suivant" });
    await userEvent.click(nextButton);

    // Page 2: row 15 (first row of page 2) visible, page-1-only row 0 gone. If the bug were still
    // present this render would have reset back to pageIndex 0 and row 0 would still be showing.
    expect(await screen.findByText("Prenom15 Nom15")).toBeInTheDocument();
    expect(screen.queryByText("Prenom0 Nom0")).not.toBeInTheDocument();

    await userEvent.click(nextButton);

    // Page 3: the lone row 30 visible, page-2's row 15 gone, and (again) no reversion to page 1.
    expect(await screen.findByText("Prenom30 Nom30")).toBeInTheDocument();
    expect(screen.queryByText("Prenom15 Nom15")).not.toBeInTheDocument();
    expect(screen.queryByText("Prenom0 Nom0")).not.toBeInTheDocument();
});
