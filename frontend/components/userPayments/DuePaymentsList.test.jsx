// Smoke test for DuePaymentsList's TanStack-migrated table (docs/Modernization-Roadmap.md item
// 13, batch 4c). Only the table itself is covered here -- the surrounding schedule-generation /
// edit / bulk-edit modals have their own extensive markup but no test coverage before this
// migration, per this repo's "test what changed" convention.
//
// Same regression target as PaymentsList: the "select all" header column's `Header` is a
// checkbox element (not a string) with no `accessor`, so it relies on the explicit
// `id: "select_all"` added during the migration for TanStack to identify it (see
// `toTanStackColumn` in TanStackGrid.tsx).
//
// Note: TanStackGrid rebuilds its column defs (and re-renders every cell) on every state change
// here, since DuePaymentsList builds a fresh `columns` array inline on every render -- checkbox
// DOM nodes captured before an interaction are not the same nodes afterwards, so assertions below
// re-query rather than reuse a pre-click reference.

import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../i18n";
import DuePaymentsList from "./DuePaymentsList";

const payer = { id: 1 };

const data = [
    {
        id: 100,
        number: 1,
        due_payment_status_id: 1,
        previsional_date: "2024-01-01",
        payment_method_id: 1,
        operation: "+",
        amount: 50,
    },
];

const paymentMethods = [{ id: 1, label: "Chèque" }];
const statuses = [{ id: 1, label: "Validé", color: "#0a0" }];

const baseProps = {
    payer,
    data,
    adhesionEnabled: false,
    scheduleId: null,
    payersNumber: 1,
    paymentMethods,
    statuses,
    itemsForPayment: [],
    handleCreatePaymentSchedule: vi.fn(),
    handleCreatePayments: vi.fn(),
    handleSaveNewDuePayment: vi.fn(),
    handleSaveDuePayment: vi.fn(),
    handleDeleteDuePayment: vi.fn(),
    handleBulkDelete: vi.fn(),
    handleBulkEditCommit: vi.fn(),
    seasonId: 1,
};

beforeEach(async () => {
    await i18n.changeLanguage("fr");
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("DuePaymentsList", () => {
    test("renders the migrated table with real headers and a real data row", () => {
        render(<DuePaymentsList {...baseProps} />);

        const table = screen.getByTestId("due-payments-list");
        expect(table).toBeInTheDocument();

        expect(
            within(table).getByRole("columnheader", { name: "Montant" })
        ).toBeInTheDocument();
        expect(within(table).getByText("(+) 50 €")).toBeInTheDocument();
        // "Validé" also appears (unselected) as a <select> option inside a hidden modal -- scope
        // to the table to assert on the rendered status badge specifically.
        expect(within(table).getByText("Validé")).toBeInTheDocument();
    });

    test("select-all checkbox column renders (explicit id: select_all) and toggles row selection", async () => {
        render(<DuePaymentsList {...baseProps} />);

        const table = screen.getByTestId("due-payments-list");
        const checkboxesBefore = within(table).getAllByRole("checkbox");
        // One header "select all" checkbox + one per row.
        expect(checkboxesBefore).toHaveLength(2);
        expect(checkboxesBefore[0]).not.toBeChecked();
        expect(checkboxesBefore[1]).not.toBeChecked();

        await userEvent.click(checkboxesBefore[0]);

        const [selectAllAfter, rowCheckboxAfter] =
            within(table).getAllByRole("checkbox");
        expect(selectAllAfter).toBeChecked();
        expect(rowCheckboxAfter).toBeChecked();
    });
});
