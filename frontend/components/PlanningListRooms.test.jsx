// Component test for PlanningListRooms's migration off react-table v6 onto TanStackGrid's
// client-side (manual=false) mode (docs/Modernization-Roadmap.md item 13 batch 4a). No prior test
// file existed for this component. No bug was found migrating this file beyond the general
// filterable-gating change common to every batch 4a file (v6 defaulted filtering off unless a
// column opted in; TanStackGrid defaults every column filterable-on) -- spot-checked here.
//
// `withTranslation("planning")` wraps the class; render() reads `t` from props via the HOC.

import React from "react";
import { render, screen, within } from "@testing-library/react";
import i18n from "../i18n";
import PlanningListRooms from "./PlanningListRooms";

beforeEach(async () => {
    await i18n.changeLanguage("fr");
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

test("renders room rows with the expected columns and planning link", () => {
    render(
        <PlanningListRooms
            plannings={[
                { id: 1, label: "Salle A" },
                { id: 2, label: "Salle B" },
            ]}
        />
    );

    // "Salle" is the initially-sorted column (defaultSorted), so its header carries a sort arrow --
    // scope to the columnheader role to avoid also matching the "Salle A"/"Salle B" cell text.
    expect(
        screen.getByRole("columnheader", { name: /^Salle/ })
    ).toBeInTheDocument();
    expect(screen.getByText("Salle A")).toBeInTheDocument();
    expect(screen.getByText("Salle B")).toBeInTheDocument();
    expect(
        screen.getAllByRole("link", { name: "Voir le planning" })
    ).toHaveLength(2);
});

// Regression check: every column here is explicit `filterable: false` (v6 never showed a filter
// row on this table) -- TanStackGrid defaults a column with no `filterable` key to filterable-on,
// so a column left un-migrated would silently grow a filter input it never had under v6. Scoped to
// the table itself (not the whole page) so it doesn't also trip on the unrelated page-size
// <select> that TanStackGrid's footer renders outside the <table>.
test("no column renders a filter input (every column is explicitly filterable: false)", () => {
    render(<PlanningListRooms plannings={[{ id: 1, label: "Salle A" }]} />);

    const table = screen.getByRole("table");
    expect(within(table).queryAllByRole("textbox")).toHaveLength(0);
    expect(within(table).queryAllByRole("combobox")).toHaveLength(0);
});
