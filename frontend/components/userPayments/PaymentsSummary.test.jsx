// i18n extraction test for userPayments/PaymentsSummary (i18n-06 payments lot 2c-i). Class
// component; generalColumns + the ibox title are built in render() from t(). Rendered with an
// empty data set so react-table paints only the column headers.

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import i18n from "../../i18n";
import PaymentsSummary from "./PaymentsSummary";

const props = {
    data: [],
    payers: [],
    schedules: {},
    locations: [],
    coupons: [],
    formulas: [],
    pricingCategories: [],
    adhesionPrices: [],
    seasons: [],
    season: 1,
    totalDue: null,
    previsionalTotal: null,
    totalPayments: 0,
    totalPaymentsToDay: 0,
    isStudentView: false,
};

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("userPayments/PaymentsSummary", () => {
    test("French column headers + title by default", async () => {
        await i18n.changeLanguage("fr");
        render(<PaymentsSummary {...props} />);

        expect(screen.getByRole("heading", { name: "Infos générales" })).toBeInTheDocument();
        expect(screen.getByText("Créer un taux de remise")).toBeInTheDocument();
        expect(screen.getByText("Activité")).toBeInTheDocument();
        expect(screen.getByText("N° d'adhérent")).toBeInTheDocument();
        expect(screen.getByText("Prix unitaire")).toBeInTheDocument();
        expect(screen.getByText("Montant total remisé")).toBeInTheDocument();
    });

    test("English when active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<PaymentsSummary {...props} />);

        await waitFor(() =>
            expect(
                screen.getByRole("heading", { name: "General information" })
            ).toBeInTheDocument()
        );
        expect(screen.getByText("Create a discount rate")).toBeInTheDocument();
        expect(screen.getByText("Activity")).toBeInTheDocument();
        expect(screen.getByText("Member no.")).toBeInTheDocument();
        expect(screen.getByText("Unit price")).toBeInTheDocument();
        expect(screen.getByText("Discounted total")).toBeInTheDocument();
    });

    // ItemFormModal (aliased here as CreateCouponModal) is this component's second real caller,
    // alongside BaseDataTable.jsx -- and unlike the ItemFormModal.test.jsx suite, this one doesn't
    // mock it away. Opening the modal for real is the only place that proves this call site
    // actually resolves ItemFormModal's own translated Cancel/Save buttons, not just the
    // createTitle prop this component passes explicitly.
    test.each([
        ["fr", "Créer un taux de remise", "Annuler", "Sauvegarder"],
        ["en", "Create a discount rate", "Cancel", "Save"],
    ])("%s: opening the create-coupon modal resolves ItemFormModal's translated Cancel/Save buttons", async (lng, openButtonText, cancel, save) => {
        await i18n.changeLanguage(lng);
        render(<PaymentsSummary {...props} />);

        fireEvent.click(await screen.findByText(openButtonText));

        expect(await screen.findByText(cancel)).toBeInTheDocument();
        expect(screen.getByText(save)).toBeInTheDocument();
    });
});
