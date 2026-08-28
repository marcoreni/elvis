// i18n extraction test for PayerPaymentTerms + PayerPaymentTermsInfo (i18n-06 payments lot 2d).
// Both are plain function components using useTranslation("payments").

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../i18n";
import PayerPaymentTerms from "./PayerPaymentTerms";
import PayerPaymentTermsInfo from "./PayerPaymentTermsInfo";

const scheduleOptions = [
    { id: 1, label: "Mensuel", available_payments_days: [5, 15], payments_number: 10, payments_months: [], available_payments_days: [5] },
];

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("PayerPaymentTerms", () => {
    const props = {
        user: { id: 1, first_name: "Ana", last_name: "Blin" },
        family: [],
        initialSelectedPayers: [],
        paymentTerms: {},
        availPaymentScheduleOptions: scheduleOptions,
        availPaymentMethods: [{ id: 1, label: "Chèque" }],
    };

    test("French headings by default", async () => {
        await i18n.changeLanguage("fr");
        render(<PayerPaymentTerms {...props} />);

        expect(screen.getByText("Modalités de paiement")).toBeInTheDocument();
        expect(screen.getByText("Moyens de paiement")).toBeInTheDocument();
        expect(screen.getByText("Payeur(s)")).toBeInTheDocument();
        expect(screen.getAllByText("Choisissez une option").length).toBeGreaterThan(0);
    });

    test("English headings when active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<PayerPaymentTerms {...props} />);

        await waitFor(() =>
            expect(screen.getByText("Payment terms")).toBeInTheDocument()
        );
        expect(screen.getByText("Payment methods")).toBeInTheDocument();
        expect(screen.getByText("Payer(s)")).toBeInTheDocument();
    });
});

describe("PayerPaymentTermsInfo", () => {
    test("French, pluralised option word", async () => {
        await i18n.changeLanguage("fr");
        render(<PayerPaymentTermsInfo availPaymentScheduleOptions={scheduleOptions} />);

        expect(screen.getByText("Type de paiement")).toBeInTheDocument();
        expect(
            screen.getByText("Nous proposons 1 option d'échéancier de paiement :")
        ).toBeInTheDocument();
    });

    test("English", async () => {
        await i18n.changeLanguage("en");
        render(
            <PayerPaymentTermsInfo
                availPaymentScheduleOptions={[scheduleOptions[0], { ...scheduleOptions[0], id: 2 }]}
            />
        );

        await waitFor(() =>
            expect(screen.getByText("Payment type")).toBeInTheDocument()
        );
        expect(
            screen.getByText("We offer 2 payment-schedule options:")
        ).toBeInTheDocument();
    });
});
