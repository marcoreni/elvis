// i18n extraction test for DuePaymentList (i18n-06 payments lot 2b — the "Échéances" tab).
// The component fetches on mount and calls loadTippy()/getTippyNodes() (inspinia globals) from
// componentDidUpdate, so both are stubbed alongside global.fetch. Assertions cover the strings
// that render synchronously: the column headers, the season filter option, and the row-count
// heading.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import DuePaymentList from "./DuePaymentList";

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
                totalDueAmount: 0,
                totalPaidAmount: 0,
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

describe("DuePaymentList", () => {
    test("French column headers + heading by default", async () => {
        await i18n.changeLanguage("fr");
        render(<DuePaymentList {...props} />);

        expect(screen.getByText("Validité")).toBeInTheDocument();
        expect(screen.getByText("Date prévisionnelle")).toBeInTheDocument();
        expect(screen.getByText("Mode règlement échéance")).toBeInTheDocument();
        expect(screen.getByText("Emplacement")).toBeInTheDocument();
        expect(screen.getByText("0 échéances")).toBeInTheDocument();
        expect(screen.getByText("SAISON")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    test("English strings when active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<DuePaymentList {...props} />);

        await waitFor(() =>
            expect(screen.getByText("Validity")).toBeInTheDocument()
        );
        expect(screen.getByText("Expected date")).toBeInTheDocument();
        expect(screen.getByText("Due-date payment method")).toBeInTheDocument();
        expect(screen.getByText("0 due dates")).toBeInTheDocument();
        expect(screen.getByText("SEASON")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });
});
