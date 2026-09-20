// Smoke test for UserAttach's migration off react-table v6 onto TanStackGrid
// (docs/Modernization-Roadmap.md item 13 batch 4b). No prior test file existed for this
// component. Covers the mechanic of the diff: `sortable={false}` (consolidating every column's
// old per-column `sortable: false` into one table-wide override) and the dynamic `noDataText`
// prop (UserAttach passes `this.state.no_data_text`, not a static string).

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../i18n";

vi.mock("sweetalert2", () => ({
    default: {
        fire: vi.fn(() => Promise.resolve({})),
        close: vi.fn(),
        showLoading: vi.fn(),
        isLoading: vi.fn(() => false),
    },
}));

import UserAttach from "./UserAttach";

beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ attached_users: [] }),
    });
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
    vi.clearAllMocks();
});

describe("UserAttach", () => {
    test("renders the attach-accounts table, its translated headers, and the dynamic noDataText prompt", async () => {
        await i18n.changeLanguage("fr");
        render(
            <UserAttach user={{ id: 1, first_name: "A", last_name: "B" }} />
        );

        await waitFor(() =>
            expect(
                screen.getByText("Rattacher des comptes")
            ).toBeInTheDocument()
        );

        for (const header of [
            "Nom",
            "Prénom",
            "Date de naissance",
            "Type de compte",
            "Actions",
        ]) {
            expect(screen.getByText(header)).toBeInTheDocument();
        }

        // Table-wide `sortable={false}` override -- no header should carry the sortable class.
        expect(document.querySelectorAll("th.sortable")).toHaveLength(0);

        // No data yet and no filter typed -> the initial search-prompt noDataText renders, once
        // the mount fetch's own 400ms debounce (UserAttach's own fetchUsers, unrelated to the
        // TanStack migration) resolves.
        expect(
            await screen.findByText(
                "Chercher des comptes à rattacher",
                {},
                { timeout: 1000 }
            )
        ).toBeInTheDocument();
    });
});
