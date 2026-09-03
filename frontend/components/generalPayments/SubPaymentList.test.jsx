// i18n extraction test for SubPaymentList (i18n-06 payments lot 2a). Columns were moved from the
// constructor into render() so they pick up language changes; this checks the translated column
// headers in both locales. DateFilter is left real (renders selects, no strings of ours).

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import SubPaymentList from "./SubPaymentList";

const props = { paymentMethods: [], data: [], minYear: 2020, maxYear: 2025 };

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("SubPaymentList", () => {
    test("French column headers by default", async () => {
        await i18n.changeLanguage("fr");
        render(<SubPaymentList {...props} />);

        expect(screen.getByText("Mode de règlement")).toBeInTheDocument();
        expect(screen.getByText("Réception")).toBeInTheDocument();
        expect(screen.getByText("Encaissement")).toBeInTheDocument();
        expect(screen.getByText("N° du Chèque")).toBeInTheDocument();
        expect(screen.getByText("Émetteur du chèque")).toBeInTheDocument();
        expect(screen.getByText("Montant")).toBeInTheDocument();
    });

    test("English column headers when active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<SubPaymentList {...props} />);

        await waitFor(() =>
            expect(screen.getByText("Payment method")).toBeInTheDocument()
        );
        expect(screen.getByText("Received")).toBeInTheDocument();
        expect(screen.getByText("Cashed")).toBeInTheDocument();
        expect(screen.getByText("Cheque no.")).toBeInTheDocument();
        expect(screen.getByText("Cheque issuer")).toBeInTheDocument();
        expect(screen.getByText("Amount")).toBeInTheDocument();
    });
});
