// i18n extraction test for the two remaining generalPayments lot-2a tables: PaymentScheduleList
// (the "schedules without a payer" tab) and CheckList (the "cheques" tab). Both fetch on mount /
// via react-table's onFetchData, so global.fetch is stubbed; assertions only cover strings that
// render synchronously (column headers, the schedule-list heading, the cheque radio filters).

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import PaymentScheduleList from "./PaymentScheduleList";
import CheckList from "./CheckList";

beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
            Promise.resolve({
                users: [],
                payments: [],
                pages: 1,
                total: 0,
                rowsCount: 0,
                totalAmount: 0,
            }),
    });
});

afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
});

describe("PaymentScheduleList (schedules without a payer)", () => {
    test("French by default", async () => {
        await i18n.changeLanguage("fr");
        render(<PaymentScheduleList seasons={[]} />);

        expect(
            screen.getByText(/payeurs sans échéancier pour/)
        ).toBeInTheDocument();
        expect(screen.getByText("Nom")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    test("English when active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<PaymentScheduleList seasons={[]} />);

        await waitFor(() =>
            expect(
                screen.getByText(/payers without a schedule for/)
            ).toBeInTheDocument()
        );
        expect(screen.getByText("Name")).toBeInTheDocument();
    });
});

describe("CheckList (cheques)", () => {
    test("French by default", async () => {
        await i18n.changeLanguage("fr");
        render(<CheckList />);

        expect(screen.getByText("Date de règlement :")).toBeInTheDocument();
        expect(screen.getByText("Tous les chèques")).toBeInTheDocument();
        expect(screen.getByText("Chèques pointés")).toBeInTheDocument();
        expect(screen.getByText("Payeur")).toBeInTheDocument();
        expect(screen.getByText("Statut")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    test("English when active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<CheckList />);

        await waitFor(() =>
            expect(screen.getByText("Payment date:")).toBeInTheDocument()
        );
        expect(screen.getByText("All cheques")).toBeInTheDocument();
        expect(screen.getByText("Cleared cheques")).toBeInTheDocument();
        expect(screen.getByText("Payer")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });
});
