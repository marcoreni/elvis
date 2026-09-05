// Domain bilingual smoke test for the `generalPayments` area (Phase 07 P0 checkpoint strategy —
// docs/I18n-Roadmap.md §P0). The per-component "renders the fr / renders the en" string-echo
// pairs for DuePaymentList / PaymentList / SubPaymentList / PaymentScheduleList / CheckList /
// BulkEditModal / MessageModal were redundant once the i18n pipeline was proven and have been
// removed; this shell render is the single locale checkpoint for the area. The four tab bodies
// are mocked out, so this checks the tab headers owned by GeneralPayments.jsx and that none of
// them fall through to a "translation missing" marker.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import GeneralPayments from "./GeneralPayments";

vi.mock("../utils/ui/tabs", () => ({
    default: ({ tabs }) => (
        <div>
            {tabs.map(t => (
                <div key={t.id}>{t.header}</div>
            ))}
        </div>
    ),
}));
vi.mock("./DuePaymentList", () => ({ default: () => <div>DuePaymentList stub</div> }));
vi.mock("./PaymentList", () => ({ default: () => <div>PaymentList stub</div> }));
vi.mock("./PaymentScheduleList", () => ({ default: () => <div>PaymentScheduleList stub</div> }));
vi.mock("./CheckList", () => ({ default: () => <div>CheckList stub</div> }));

const props = {
    paymentMethods: [],
    locations: {},
    minYear: 2020,
    maxYear: 2025,
    failedCount: 0,
    paymentStatuses: [],
    duePaymentStatuses: [],
    seasons: [],
};

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

const TAB_HEADERS = {
    fr: ["Échéances", "Règlements", "Échéanciers sans payeur", "Chèques"],
    en: ["Due dates", "Payments", "Schedules without a payer", "Cheques"],
};

describe.each(["fr", "en"])("generalPayments area — bilingual smoke (%s)", lng => {
    test("renders the shell tab headers with real translated copy, no missing-key markers", async () => {
        await i18n.changeLanguage(lng);
        render(<GeneralPayments {...props} />);

        await waitFor(() =>
            expect(screen.getByText(TAB_HEADERS[lng][0])).toBeInTheDocument()
        );
        for (const header of TAB_HEADERS[lng]) {
            expect(screen.getByText(header)).toBeInTheDocument();
        }
        expect(document.body.textContent).not.toMatch(/translation missing/i);
    });
});
