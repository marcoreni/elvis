// Domain bilingual smoke test for the `userPayments` area (Phase 07 P0 checkpoint strategy —
// docs/I18n-Roadmap.md §P0). The per-component "renders the fr / renders the en" string-echo
// pairs for PaymentsList / DuePaymentsList / SwitchPayerModal / UserPaymentsV2 were redundant now
// that the i18n pipeline is proven and have been removed; this container render is the single
// locale checkpoint for the area. The four heavy child components are mocked, so this exercises
// the strings owned by PaymentsManagement itself (page heading, printable form headings, season
// label, empty-state) and guards that none of them fall through to a "translation missing" marker.

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

const REPRESENTATIVE = {
    fr: {
        heading: "Règlements concernant Alice Durand",
        sample: "Nombre d'échéance(s)",
        emptyState: "Aucun échéancier pour cette saison",
    },
    en: {
        heading: "Payments for Alice Durand",
        sample: "Number of due date(s)",
        emptyState: "No schedule for this season",
    },
};

describe.each(["fr", "en"])("userPayments area — bilingual smoke (%s)", lng => {
    test("renders PaymentsManagement with real translated copy, no missing-key markers", async () => {
        await i18n.changeLanguage(lng);
        render(<PaymentsManagement {...props} />);

        await waitFor(() =>
            expect(
                screen.getByRole("heading", { name: REPRESENTATIVE[lng].heading })
            ).toBeInTheDocument()
        );
        expect(screen.getByText(REPRESENTATIVE[lng].sample)).toBeInTheDocument();
        expect(screen.getByText(REPRESENTATIVE[lng].emptyState)).toBeInTheDocument();
        expect(document.body.textContent).not.toMatch(/translation missing/i);
    });
});
