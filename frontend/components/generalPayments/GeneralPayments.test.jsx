// i18n extraction test for the generalPayments shell (i18n-06 payments lot 2a). The four tab
// bodies (DuePaymentList / PaymentList / PaymentScheduleList / CheckList) are mocked out — this
// only checks the tab headers that live in GeneralPayments.jsx itself. The TabbedComponent is
// mocked to a trivial header list so we don't depend on its markup.

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

describe("GeneralPayments", () => {
    test("renders the French tab headers by default", async () => {
        await i18n.changeLanguage("fr");
        render(<GeneralPayments {...props} />);

        expect(screen.getByText("Échéances")).toBeInTheDocument();
        expect(screen.getByText("Règlements")).toBeInTheDocument();
        expect(screen.getByText("Échéanciers sans payeur")).toBeInTheDocument();
        expect(screen.getByText("Chèques")).toBeInTheDocument();
    });

    test("renders the English tab headers when the active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<GeneralPayments {...props} />);

        await waitFor(() =>
            expect(screen.getByText("Due dates")).toBeInTheDocument()
        );
        expect(screen.getByText("Payments")).toBeInTheDocument();
        expect(screen.getByText("Schedules without a payer")).toBeInTheDocument();
        expect(screen.getByText("Cheques")).toBeInTheDocument();
    });
});
