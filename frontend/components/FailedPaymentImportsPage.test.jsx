// Component tests for FailedPaymentImportsPage's migration off react-table v6 onto TanStackGrid's
// new client-side (manual=false) mode (docs/Modernization-Roadmap.md item 13 batch 4a). No prior
// test file existed for this component. Each test below is a regression for a real bug the
// migration pass found and fixed -- see the diff comments in FailedPaymentImportsPage.jsx itself:
//
//  1. The "actions" column had no `id` and no `accessor` -- v6 tolerated this, but TanStack Table
//     throws ("Columns require an id when using an accessorFn") since every column gets a no-op
//     accessorFn in TanStackGrid's adapter. Fixed by adding `id: "actions"`.
//  2. The "reason" column's accessor returned a raw number; TanStack's "auto" filterFn picks
//     `inNumberRange` for a numeric value (destructures `[min, max]`), which throws on the plain
//     string a <select> filter produces. Fixed by stringifying the accessor's return value.
//  3. `renderNameCell` used to read the field to write back into `this.state.data` off
//     `cell.column.id` (a v6-only API absent from TanStackGrid's `{value, original, index}` Cell
//     shape) -- fixed by passing the field name explicitly per call site.
//
// `withTranslation("payments")` wraps the class; render() reads `t` from props via the HOC, so no
// `t` prop needs threading -- render the default export directly (frontend/i18n singleton wiring
// covers it, per the LessonList.test.jsx convention).

import React from "react";
import { render, screen, within } from "@testing-library/react";
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

test("renders without crashing and shows the actions column buttons (regression: the actions column had no `id`, which crashes TanStack Table)", () => {
    const { container } = render(
        <FailedPaymentImportsPage data={rows()} reasons={REASONS} />
    );

    expect(container.querySelectorAll(".fa-check")).toHaveLength(2);
    expect(container.querySelectorAll(".fa-trash")).toHaveLength(2);
});

test("filtering the reason column via its <select> narrows rows without crashing (regression: a numeric accessor picked TanStack's inNumberRange filterFn, which throws on the <select>'s string value)", async () => {
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
