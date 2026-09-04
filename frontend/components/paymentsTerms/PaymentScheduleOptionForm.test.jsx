// i18n extraction test for PaymentScheduleOptionForm (i18n-06 payments lot 2d). Plain function
// component using useTranslation("payments"); the whole form renders synchronously.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import PaymentScheduleOptionForm from "./PaymentScheduleOptionForm";

const props = { pricingCategories: [], action: "/x", method: "post", return_url: "/y" };

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("PaymentScheduleOptionForm", () => {
    test("French labels by default (create mode)", async () => {
        await i18n.changeLanguage("fr");
        render(<PaymentScheduleOptionForm {...props} />);

        expect(
            screen.getByRole("heading", { name: "Ajouter une option d'échéancier de paiement" })
        ).toBeInTheDocument();
        expect(screen.getByText(/Nom de l'option d'échéancier de paiement/)).toBeInTheDocument();
        expect(screen.getByText("Tarif associé")).toBeInTheDocument();
        expect(screen.getByText("Sélectionner le ou les mois de règlement")).toBeInTheDocument();
        expect(screen.getByText("Jour du règlement")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Enregistrer" })).toBeInTheDocument();
        // Month toggle buttons are built from MONTHS (tools/constants) — French names by default.
        expect(screen.getByText("Janvier")).toBeInTheDocument();
        expect(screen.getByText("Décembre")).toBeInTheDocument();
    });

    test("English labels when active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<PaymentScheduleOptionForm {...props} />);

        await waitFor(() =>
            expect(
                screen.getByRole("heading", { name: "Add a payment-schedule option" })
            ).toBeInTheDocument()
        );
        expect(screen.getByText("Associated pricing")).toBeInTheDocument();
        expect(screen.getByText("Payment day")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
        // MONTHS follows the active language since constants-i18n lot 1.
        expect(screen.getByText("January")).toBeInTheDocument();
        expect(screen.getByText("December")).toBeInTheDocument();
    });
});
