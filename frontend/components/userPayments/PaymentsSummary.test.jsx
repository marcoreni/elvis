// i18n extraction test for userPayments/PaymentsSummary (i18n-06 payments lot 2c-i). Class
// component; generalColumns + the ibox title are built in render() from t(). Rendered with an
// empty data set so react-table paints only the column headers.

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
    // The plain "renders the fr / renders the en column headers" pair was a pure string-echo and
    // has been dropped under the Phase 07 P0 checkpoint strategy — the interaction test below
    // still renders this component in both locales, and the `userPayments` area locale checkpoint
    // lives in PaymentsManagement.test.jsx.

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
