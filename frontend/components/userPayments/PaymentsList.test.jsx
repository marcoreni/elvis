// i18n extraction test for userPayments/PaymentsList (i18n-06 payments lot 2c-i). Class
// component, columns + two modals built in render(). Assertions cover the table headers, the
// "Actions règlements" dropdown items and the new/bulk-edit modal labels, in both locales.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import PaymentsList from "./PaymentsList";

const props = {
    payments: [],
    duePayments: [],
    paymentMethods: [],
    statuses: [],
    payer: { id: 1 },
    isStudentView: false,
};

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("userPayments/PaymentsList", () => {
    test("French by default", async () => {
        await i18n.changeLanguage("fr");
        render(<PaymentsList {...props} />);

        expect(screen.getByRole("heading", { name: /Règlements/ })).toBeInTheDocument();
        expect(screen.getByText("Encaissement")).toBeInTheDocument();
        expect(screen.getByText("# Chèque")).toBeInTheDocument();
        expect(screen.getByText("Actions règlements")).toBeInTheDocument();
        expect(screen.getByText("Suppression de masse")).toBeInTheDocument();
        expect(screen.getByText("Choix de l'échéance")).toBeInTheDocument();
        expect(screen.getByText("Edition de règlements")).toBeInTheDocument();
    });

    test("English when active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<PaymentsList {...props} />);

        await waitFor(() =>
            expect(screen.getByText("Cashed")).toBeInTheDocument()
        );
        expect(screen.getByText("Cheque #")).toBeInTheDocument();
        expect(screen.getByText("Payment actions")).toBeInTheDocument();
        expect(screen.getByText("Bulk delete")).toBeInTheDocument();
        expect(screen.getByText("Due-date choice")).toBeInTheDocument();
        expect(screen.getByText("Edit payments")).toBeInTheDocument();
    });
});
