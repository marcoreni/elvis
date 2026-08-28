// i18n extraction test for userPayments/PaymentsManagement (i18n-06 payments lot 2c-iii), the
// container. The four heavy child components are mocked; assertions target the strings that live
// directly in PaymentsManagement — the printable form headings, the page heading, the season
// label and the empty-state text.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import PaymentsManagement from "./PaymentsManagement";

vi.mock("./PaymentsSummary", () => ({ default: () => <div>PaymentsSummary stub</div> }));
vi.mock("./DuePaymentsList", () => ({ default: () => <div>DuePaymentsList stub</div> }));
vi.mock("./PaymentsList", () => ({ default: () => <div>PaymentsList stub</div> }));
vi.mock("./SwitchPayerModal", () => ({ default: () => <div>SwitchPayerModal stub</div> }));
vi.mock("./../CommentSection", () => ({ default: () => <div>CommentSection stub</div> }));

const season = { id: 1, label: "2024-2025" };

const props = {
    currentSeason: season,
    seasons: [season],
    user: { id: 7, first_name: "Alice", last_name: "Durand" },
    user_id: 7,
    activities: [],
    options: [],
    schedule: null,
    schedules: {},
    payments: {},
    payers: [{ season_id: 1, payers: [] }],
    adhesions: [],
    desiredActivities: {},
    formulas: [],
    schedule_statuses: [],
    adhesionPrices: [],
    pricingCategories: [],
    packs: {},
    coupons: [],
    locations: [],
    paymentMethods: [],
    paymentStatuses: [],
    duePaymentStatuses: [],
    adhesionEnabled: false,
    is_upcoming_payment_defined: false,
};

beforeEach(() => {
    localStorage.clear();
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("userPayments/PaymentsManagement", () => {
    test("French strings by default", async () => {
        await i18n.changeLanguage("fr");
        render(<PaymentsManagement {...props} />);

        expect(
            screen.getByRole("heading", { name: "Règlements concernant Alice Durand" })
        ).toBeInTheDocument();
        expect(screen.getByText("Nombre d'échéance(s)")).toBeInTheDocument();
        expect(screen.getByText("Pour les prélèvements, date souhaitée")).toBeInTheDocument();
        expect(screen.getByText("Adhésion réglée différemment")).toBeInTheDocument();
        expect(screen.getByText("Saison")).toBeInTheDocument();
        expect(screen.getByText("Aucun échéancier pour cette saison")).toBeInTheDocument();
    });

    test("English strings when the active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<PaymentsManagement {...props} />);

        await waitFor(() =>
            expect(
                screen.getByRole("heading", { name: "Payments for Alice Durand" })
            ).toBeInTheDocument()
        );
        expect(screen.getByText("Number of due date(s)")).toBeInTheDocument();
        expect(screen.getByText("For direct debits, preferred date")).toBeInTheDocument();
        expect(screen.getByText("Membership paid separately")).toBeInTheDocument();
        expect(screen.getByText("Season")).toBeInTheDocument();
        expect(screen.getByText("No schedule for this season")).toBeInTheDocument();
    });
});
