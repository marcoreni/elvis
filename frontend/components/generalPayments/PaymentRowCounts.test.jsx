// RESTORED BY CODE REVIEW (Phase 07 P0). The deleted DuePaymentList.test.jsx / PaymentList.test.jsx
// were not pure string-echoes: each asserted the `{{n}}` row-count interpolation
// (payments:general.dueDates.rowCount / general.payments.rowCount) AND a real mount side-effect
// (`expect(global.fetch).toHaveBeenCalled()` — both components fetch on mount and call the
// inspinia loadTippy()/getTippyNodes() globals from componentDidUpdate).
//
// GeneralPayments.test.jsx — the claimed "generalPayments area smoke" — `vi.mock`s both of these
// components away by name, so after the prune neither is mounted by any test. Restored here as a
// single behaviour-only file: the {{n}} interpolation + the fetch-on-mount assertion. The plain
// column-header echoes stay deleted.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import DuePaymentList from "./DuePaymentList";
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

describe.each(["fr", "en"])("generalPayments row-count interpolation + fetch-on-mount (%s)", lng => {
    const EXPECTED = {
        fr: { due: "0 échéances", payments: "0 règlements" },
        en: { due: "0 due dates", payments: "0 payments" },
    };

    test("DuePaymentList interpolates {{n}} into general.dueDates.rowCount and fetches on mount", async () => {
        await i18n.changeLanguage(lng);
        const { unmount } = render(<DuePaymentList {...props} />);

        expect(screen.getByText(EXPECTED[lng].due)).toBeInTheDocument();
        expect(document.body.textContent).not.toMatch(/\{\{|\}\}/);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        unmount();
    });

    test("PaymentList interpolates {{n}} into general.payments.rowCount and fetches on mount", async () => {
        await i18n.changeLanguage(lng);
        render(<PaymentList {...props} />);

        expect(screen.getByText(EXPECTED[lng].payments)).toBeInTheDocument();
        expect(document.body.textContent).not.toMatch(/\{\{|\}\}/);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });
});
