// i18n extraction test for PaymentList (i18n-06 payments lot 2b — the "Règlements" tab).
// Same setup as DuePaymentList.test.jsx: stub the inspinia globals + fetch, assert on the
// synchronously-rendered column headers, season filter option and row-count heading.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import PaymentList from "./PaymentList";

beforeEach(() => {
    // DateRangePicker -> update-input-width measures text via <canvas>, unimplemented in jsdom
    HTMLCanvasElement.prototype.getContext = () => ({ measureText: () => ({ width: 0 }) });
    global.loadTippy = vi.fn();
    global.getTippyNodes = vi.fn(() => []);
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
            Promise.resolve({
                payments: [],
                pages: 1,
                rowsCount: 0,
                totalAmount: 0,
            }),
    });
});

afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
});

const props = {
    paymentMethods: [],
    statuses: [],
    paymentStatuses: [],
    locations: {},
    seasons: [],
    minYear: 2020,
    maxYear: 2025,
};

describe("PaymentList", () => {
    test("French column headers + heading by default", async () => {
        await i18n.changeLanguage("fr");
        render(<PaymentList {...props} />);

        expect(screen.getByText("Date encaissement")).toBeInTheDocument();
        expect(screen.getByText("Mode règlement")).toBeInTheDocument();
        expect(screen.getByText("Emplacement")).toBeInTheDocument();
        expect(screen.getByText("0 règlements")).toBeInTheDocument();
        expect(screen.getByText("SAISON")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    test("English strings when active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<PaymentList {...props} />);

        await waitFor(() =>
            expect(screen.getByText("Cashing date")).toBeInTheDocument()
        );
        expect(screen.getByText("Payment method")).toBeInTheDocument();
        expect(screen.getByText("0 payments")).toBeInTheDocument();
        expect(screen.getByText("SEASON")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });
});
