// Smoke test for PaymentScheduleList's migration off react-table v6 onto TanStackGrid
// (docs/Modernization-Roadmap.md item 13 batch 4b). No prior test file existed for this
// component (GeneralPayments.test.jsx stubs it out entirely). Mounts the real component with a
// real `global.fetch` and lets TanStackGrid's mount-time `onFetchData` actually run, covering the
// controlled `pagination` + `onPaginationChange` / `onColumnFiltersChange` wiring this batch
// added.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

    // Regression for the "selection" column's row-checkbox going stale (item 13 batch 4d part
    // 1, docs/Modernization-Roadmap.md): its `accessor` (`isTargeted`) reads `this.state.targets`
    // -- clicking a row's own checkbox only `setState`s `targets`, not `data`, so TanStack's
    // per-row `_valuesCache` (keyed on `data`'s reference, not on unrelated component state)
    // never recomputed that accessor. Before this commit the Cell displayed the cached `value`
    // from that accessor; now it reads `isTargeted(d.original)` straight off
    // `this.state.targets` inside `Cell`, bypassing the stale cache entirely. The header "select
    // all" checkbox (in the column's `Filter`) was never affected -- it already read
    // `this.state.targets` directly -- so this drives a single row's own checkbox, not the
    // header.
    test("clicking a row's own checkbox visually checks that row, without affecting the other row or the header", async () => {
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
                        {
                            id: 8,
                            first_name: "Bob",
                            last_name: "Colin",
                            payment_schedules: [{ season_id: 1 }],
                        },
                    ],
                    pages: 1,
                    total: 2,
                }),
        });

        render(<PaymentScheduleList seasons={SEASONS} />);

        await screen.findByText("Ana Blin");
        await screen.findByText("Bob Colin");

        // Header "select all" checkbox (column Filter) + one checkbox per row, in DOM order.
        const before = screen.getAllByRole("checkbox");
        expect(before).toHaveLength(3);
        expect(before[0]).not.toBeChecked();
        expect(before[1]).not.toBeChecked();
        expect(before[2]).not.toBeChecked();

        // Click the FIRST ROW's own checkbox -- not the header.
        await userEvent.click(before[1]);

        const after = screen.getAllByRole("checkbox");
        expect(after[1]).toBeChecked();
        // Only one of two rows selected -- the header must stay unchecked.
        expect(after[0]).not.toBeChecked();
        // The other row is untouched.
        expect(after[2]).not.toBeChecked();
    });
});
