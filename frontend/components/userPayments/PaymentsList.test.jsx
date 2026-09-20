// Smoke test for PaymentsList's TanStack-migrated table (docs/Modernization-Roadmap.md item 13,
// batch 4c). Only the table itself is covered here -- the surrounding create/edit/bulk-edit
// modals have their own extensive markup but no test coverage before this migration, per this
// repo's "test what changed" convention.
//
// The "select all" header column is a specific regression target: its `Header` is a checkbox
// element (not a string) and it has no `accessor`, so it relies entirely on the explicit
// `id: "select_all"` added during the migration for TanStack to identify it (see
// `toTanStackColumn` in TanStackGrid.tsx). Without that id, TanStack falls back to deriving an id
// from the header content, which fails for a non-string Header.
//
// Note: TanStackGrid rebuilds its column defs (and re-renders every cell) on every state change
// here, since PaymentsList/DuePaymentsList build a fresh `columns` array inline on every render
// -- checkbox DOM nodes captured before an interaction are not the same nodes afterwards, so
// assertions below re-query rather than reuse a pre-click reference.

import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../i18n";
import PaymentsList from "./PaymentsList";

const payer = { id: 1 };

const duePayments = [{ id: 100, number: 1 }];

const payments = [
    {
        id: 10,
        due_payment_id: 100,
        payment_method_id: 1,
        payment_status_id: 1,
        reception_date: null,
        cashing_date: null,
        check_number: "1234",
        check_issuer_name: null,
        operation: "+",
        amount: 50,
    },
];

const paymentMethods = [{ id: 1, label: "Chèque" }];
const statuses = [{ id: 1, label: "Validé", color: "#0a0" }];

const baseProps = {
    payer,
    payments,
    duePayments,
    paymentMethods,
    statuses,
    handleCreateNewPayment: vi.fn(),
    handleDeletePayment: vi.fn(),
    handleBulkDelete: vi.fn(),
    handleBulkEditPayments: vi.fn(),
    handlePromptStatusEdit: vi.fn(),
};

beforeEach(async () => {
    await i18n.changeLanguage("fr");
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("PaymentsList", () => {
    test("renders the migrated table with real headers and a real data row", () => {
        render(<PaymentsList {...baseProps} />);

        const table = screen.getByTestId("payments-list");
        expect(table).toBeInTheDocument();

        expect(
            within(table).getByRole("columnheader", { name: "Montant" })
        ).toBeInTheDocument();
        expect(within(table).getByText("(+) 50 €")).toBeInTheDocument();
        expect(within(table).getByText("1234")).toBeInTheDocument();
        // "Validé" also appears (unselected) as a <select> option inside the hidden edit modal --
        // scope to the table to assert on the rendered status badge specifically.
        expect(within(table).getByText("Validé")).toBeInTheDocument();
    });

    test("select-all checkbox column renders (explicit id: select_all) and toggles row selection", async () => {
        render(<PaymentsList {...baseProps} />);

        const table = screen.getByTestId("payments-list");
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
