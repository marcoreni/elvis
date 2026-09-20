// Smoke test for PaymentScheduleList's migration off react-table v6 onto TanStackGrid
// (docs/Modernization-Roadmap.md item 13 batch 4b). No prior test file existed for this
// component (GeneralPayments.test.jsx stubs it out entirely). Mounts the real component with a
// real `global.fetch` and lets TanStackGrid's mount-time `onFetchData` actually run, covering the
// controlled `pagination` + `onPaginationChange` / `onColumnFiltersChange` wiring this batch
// added.

import React from "react";
import { render, screen } from "@testing-library/react";
import i18n from "../../i18n";
import PaymentScheduleList from "./PaymentScheduleList";

beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
            Promise.resolve({
                users: [
                    {
                        id: 7,
                        first_name: "Ana",
                        last_name: "Blin",
                        payment_schedules: [{ season_id: 1 }],
                    },
                ],
                pages: 1,
                total: 1,
            }),
    });
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
    vi.clearAllMocks();
});

const SEASONS = [{ id: 1, label: "2025-2026", is_current: true }];

describe("PaymentScheduleList", () => {
    test("renders the translated column headers and one real row in fr", async () => {
        await i18n.changeLanguage("fr");
        render(<PaymentScheduleList seasons={SEASONS} />);

        expect(await screen.findByText("Ana Blin")).toBeInTheDocument();
        expect(screen.getByText("Nom")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    test("renders the translated column headers in en", async () => {
        await i18n.changeLanguage("en");
        render(<PaymentScheduleList seasons={SEASONS} />);

        expect(await screen.findByText("Ana Blin")).toBeInTheDocument();
        expect(screen.getByText("Name")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();
    });
});
