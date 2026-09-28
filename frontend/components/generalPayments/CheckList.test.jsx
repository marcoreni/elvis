// Regression coverage for CheckList's check_status column, added alongside the react-switch
// 6->7 bump (chore/bump-react-switch). GeneralPayments.test.jsx stubs CheckList out entirely, so
// its react-switch call site (the only one in this component) had zero coverage before this file.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../i18n";
import CheckList from "./CheckList";

const ROW = {
    id: 101,
    amount: 42,
    check_number: "CHK-1",
    check_status: false,
    due_payment: {
        payment_schedule: {
            user: {
                id: 5,
                first_name: "Ana",
                last_name: "Blin",
                adherent_number: "001",
                students: [],
                get_users_paying_for_self: [],
            },
        },
    },
};

beforeEach(async () => {
    await i18n.changeLanguage("fr");
    localStorage.clear();
    global.fetch = vi.fn((url) => {
        if (url.startsWith("/payments/checklist")) {
            return Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve({
                        payments: [ROW],
                        pages: 1,
                        rowsCount: 1,
                        totalAmount: 42,
                    }),
            });
        }
        if (url.startsWith("/payments/check_status")) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({}),
            });
        }
        return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
    vi.clearAllMocks();
});

describe("CheckList — check_status switch", () => {
    test("toggling the switch POSTs the new status and flips the switch on", async () => {
        render(<CheckList />);

        expect(await screen.findByText("Blin Ana")).toBeInTheDocument();

        const toggle = screen.getByRole("switch");
        expect(toggle).not.toBeChecked();

        await userEvent.click(toggle);

        await waitFor(() =>
            expect(global.fetch).toHaveBeenCalledWith(
                "/payments/check_status.json",
                expect.objectContaining({ method: "POST" })
            )
        );
        const [, options] = global.fetch.mock.calls.find(([url]) =>
            url.startsWith("/payments/check_status")
        );
        expect(JSON.parse(options.body)).toEqual({
            id: ROW.id,
            check_status: true,
        });

        await waitFor(() => expect(screen.getByRole("switch")).toBeChecked());
    });
});
