// Component tests for FailedPaymentImportsPage's migration off react-table v6 onto TanStackGrid's
// new client-side (manual=false) mode (docs/Modernization-Roadmap.md item 13 batch 4a). No prior
// test file existed for this component. Each test below is a regression for a real bug the
// migration pass found and fixed -- see the diff comments in FailedPaymentImportsPage.jsx itself:
//
//  1. The "actions" column had no `id` and no `accessor` -- v6 tolerated this. TanStack doesn't
//     throw on this either: `createColumn` falls back to the column's `header` when it's a string,
//     so the column silently got the *translated label string* as its id instead (a locale-dependent
//     column id -- a real bug, just not a crash). Fixed by adding `id: "actions"`.
//  2. The "reason" column's accessor returned a raw number; TanStack's "auto" filterFn picks
//     `inNumberRange` for a numeric value (destructures `[min, max]`). It doesn't throw on the
//     plain string a <select> filter produces: `resolveFilterValue` destructures it into
//     `[min, undefined]`, `parseFloat(undefined)` -> `NaN` -> the upper bound becomes `Infinity`,
//     so the filter silently behaved as "reason id >= selected" instead of an exact match (e.g.
//     selecting reason 1 wrongly showed every row). Fixed by stringifying the accessor's return
//     value, which keeps the auto-picked filterFn as a "contains" match instead.
//  3. `renderNameCell` used to read the field to write back into `this.state.data` off
//     `cell.column.id` (a v6-only API absent from TanStackGrid's `{original, index}` Cell
//     shape) -- fixed by passing the field name explicitly per call site.
//
// `withTranslation("payments")` wraps the class; render() reads `t` from props via the HOC, so no
// `t` prop needs threading -- render the default export directly (frontend/i18n singleton wiring
// covers it, per the LessonList.test.jsx convention).

import React from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../i18n";
import FailedPaymentImportsPage from "./FailedPaymentImportsPage";

beforeEach(async () => {
    await i18n.changeLanguage("fr");
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

// render() does `this.props.reasons.find(d => d.code === "...")` for each of these three codes and
// then reads `.id` off the result unconditionally inside every row's Cell -- all three must be
// present in `reasons` or the component throws before any of these tests get to assert anything.
const REASONS = [
    { id: 1, code: "payer_not_found", label: "Payeur introuvable" },
    { id: 2, code: "due_not_found", label: "Échéance introuvable" },
    { id: 3, code: "different_amounts", label: "Montants différents" },
];

const rows = () => [
    {
        id: 101,
        failed_payment_import_reason_id: 1, // payer_not_found -> name cells editable
        first_name: "Jean",
        last_name: "Dupont",
        due_date: "2026-01-15",
        cashing_date: "2026-01-20",
        created_at: "2026-01-01T10:00:00",
        amount: 42.5,
        user_id: null,
    },
    {
        id: 102,
        failed_payment_import_reason_id: 2, // due_not_found -> due_date cell editable
        first_name: "Marie",
        last_name: "Martin",
        due_date: "2026-02-15",
        cashing_date: "2026-02-20",
        created_at: "2026-02-01T10:00:00",
        amount: 30,
        user_id: 55,
    },
];

test("renders without crashing and shows the actions column buttons (regression: the actions column had no `id`, so it silently got the translated header string as its id)", () => {
    const { container } = render(
        <FailedPaymentImportsPage data={rows()} reasons={REASONS} />
    );

    expect(container.querySelectorAll(".fa-check")).toHaveLength(2);
    expect(container.querySelectorAll(".fa-trash")).toHaveLength(2);
});

test('filtering the reason column via its <select> narrows rows to an exact match (regression: a numeric accessor picked TanStack\'s inNumberRange filterFn, which silently matched every row "reason id >= selected" instead of throwing)', async () => {
    render(<FailedPaymentImportsPage data={rows()} reasons={REASONS} />);

    const table = screen.getByRole("table");
    // The only <select> inside the table itself is the reason column's FilterSelect -- the
    // "select all" column uses a checkbox, and every other column is `filterable: false`.
    const reasonSelect = within(table).getByRole("combobox");

    expect(screen.getByText("Jean")).toBeInTheDocument();
    expect(screen.getByText("Marie")).toBeInTheDocument();

    await userEvent.selectOptions(reasonSelect, "1");

    expect(screen.getByText("Jean")).toBeInTheDocument();
    expect(screen.queryByText("Marie")).not.toBeInTheDocument();
});

test("editable name cells use the caller-supplied field name for each column, not a shared/missing one (regression: `field` used to come from `cell.column.id`, absent on TanStackGrid's Cell shape)", () => {
    render(<FailedPaymentImportsPage data={rows()} reasons={REASONS} />);

    // Row 101's reason is payer_not_found -> both first_name and last_name cells are editable.
    const row = screen.getByText("Jean").closest("tr");
    const cells = within(row).getAllByRole("cell");
    // Column order: selection(0), reason(1), first_name(2), last_name(3), ...
    expect(cells[2]).toHaveTextContent("Jean");
    expect(cells[3]).toHaveTextContent("Dupont");
});

test("editing the amount cell displays the newly typed value, and doesn't remount the input (regression: onChange used to mutate `this.state.data` in place instead of copying it, and `columns` used to be rebuilt fresh every render)", async () => {
    const editableAmountRow = {
        id: 103,
        failed_payment_import_reason_id: 3, // different_amounts -> amount cell editable
        first_name: "Paul",
        last_name: "Durand",
        due_date: "2026-03-15",
        cashing_date: "2026-03-20",
        created_at: "2026-03-01T10:00:00",
        amount: 42.5,
        user_id: 77,
    };

    render(
        <FailedPaymentImportsPage
            data={[editableAmountRow]}
            reasons={REASONS}
        />
    );

    // Held onto (not re-queried) across the edit below: `columns` is now cached across renders
    // (see `getColumns()` in FailedPaymentImportsPage.jsx), so the `cell` function TanStack's
    // `flexRender` calls keeps the same identity across the `this.setState({data})` each keystroke
    // triggers, and React treats it as the same component type rather than unmounting/remounting
    // it. Before that fix, this same node would have been detached from the document after the
    // edit below (a real regression this branch introduced: the amount input lost focus on every
    // keystroke).
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveValue(42.5);

    // A single fireEvent (rather than userEvent.clear + type) avoids an intermediate "" ->
    // parseFloat -> NaN keystroke, which is a separate, pre-existing rough edge of this controlled
    // number input and not what this regression is about.
    fireEvent.change(input, {
        target: { value: "99.9" },
    });

    // `renderAmountCell` reads `cell.original[field]` directly (this commit's change, item 13
    // batch 4d part 1) -- this display no longer goes through TanStack's `getValue()` cache
    // either way, so on its own this assertion would pass even with the in-place-mutation bug
    // the array-copy fix below still guards against (verified: reverting just that copy, this
    // assertion alone still passes 4/4). The client-mode-sorting test right below is what
    // actually still exercises the cache and would catch that regression.
    expect(input).toHaveValue(99.9);
    // Same DOM node, not a freshly-mounted replacement -- confirms the cell subtree wasn't
    // unmounted/remounted by this edit (the focus-loss regression this branch introduced).
    expect(screen.getByRole("spinbutton")).toBe(input);
});

test("editing the amount cell is reflected by a subsequent client-mode sort (regression: onChange used to mutate `this.state.data` in place instead of copying it, leaving TanStack's per-row `getValue()` cache stale)", async () => {
    // `renderAmountCell` (like every other Cell since this commit) reads `cell.original[field]`
    // directly, not `getValue()` -- so the cell's own displayed text no longer proves the
    // array-copy fix is still needed (see the previous test's comment). This table is
    // `manual={false}` though, so its "amount" column's client-mode *sort* still calls
    // `row.getValue("amount")` under the hood, which does go through TanStack's per-row
    // `_valuesCache` -- keyed on `data`'s reference, not on the mutated object itself. That cache
    // is what this test actually exercises.
    const rowsForSort = [
        {
            id: 201,
            failed_payment_import_reason_id: 3, // different_amounts -> amount cell editable
            first_name: "Alice",
            last_name: "Martin",
            due_date: "2026-03-15",
            cashing_date: "2026-03-20",
            created_at: "2026-03-01T10:00:00",
            amount: 10,
            user_id: 77,
        },
        {
            id: 202,
            failed_payment_import_reason_id: 1, // payer_not_found -> amount not editable
            first_name: "Bruno",
            last_name: "Petit",
            due_date: "2026-04-15",
            cashing_date: "2026-04-20",
            created_at: "2026-04-01T10:00:00",
            amount: 50,
            user_id: null,
        },
    ];

    render(<FailedPaymentImportsPage data={rowsForSort} reasons={REASONS} />);

    const dataRows = () => screen.getAllByRole("row").slice(2); // skip the header + filter rows

    // Unsorted: input order (Alice, then Bruno).
    expect(within(dataRows()[0]).getByText("Alice")).toBeInTheDocument();
    expect(within(dataRows()[1]).getByText("Bruno")).toBeInTheDocument();

    // A single click sorts descending (TanStack's default first click direction here) -- this is
    // what actually populates the per-row `_valuesCache` for the "amount" column: 50 > 10 flips
    // the order to Bruno first, Alice second.
    await userEvent.click(
        screen.getByRole("columnheader", { name: "Montant import" })
    );
    expect(within(dataRows()[0]).getByText("Bruno")).toBeInTheDocument();
    expect(within(dataRows()[1]).getByText("Alice")).toBeInTheDocument();

    // Edit Alice's amount from 10 to 100 -- now bigger than Bruno's fixed 50.
    fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "100" },
    });

    // Regression: with the old in-place mutation, `this.state.data` kept the same array
    // *reference* across the edit, so the descending sort above (driven by the now-stale
    // `_valuesCache`) would never re-flow even though `row.original.amount` was actually 100 --
    // Bruno would incorrectly stay sorted ahead of Alice. The array-copy fix produces a fresh
    // `data` reference, invalidating that cache and letting the still-descending sort put Alice
    // (now 100) back ahead of Bruno (50).
    expect(within(dataRows()[0]).getByText("Alice")).toBeInTheDocument();
    expect(within(dataRows()[1]).getByText("Bruno")).toBeInTheDocument();
});
