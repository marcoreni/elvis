// Component test for the i18n extraction done on UserList (frontend i18n branch 05) — see
// UserEdit.test.jsx for the shared rationale on mocking-free language switching via the
// frontend/i18n/index.js singleton and withTranslation().
//
// UserList fetches its table data on mount (react-table's `manual` mode calling
// onFetchData -> a 400ms-debounced fetch("/users/list", ...)). global.fetch is mocked so that
// resolves harmlessly; assertions here only cover strings that render synchronously
// (buttons, table headers, filter options) since those don't depend on that fetch completing.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../i18n";
import UserList from "./UserList";

beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { has: () => false },
        json: () => Promise.resolve({ users: [], pages: 1, total: 0 }),
    });
});

afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
});

// Domain bilingual smoke test for the `users` area (Phase 07 P0 checkpoint strategy —
// docs/I18n-Roadmap.md §P0). This replaces the old paired "renders the fr / renders the en"
// string-echoes here and in UserEdit.test.jsx (which now keeps only its conditional-tab
// behaviour). It renders the list and asserts a representative translated string per locale,
// including react-table's shared common:reactTable.* pagination chrome — no "translation
// missing" marker anywhere.
const REPRESENTATIVE = {
    fr: [
        "Exporter en CSV",
        "Type de compte",
        "Tous les utilisateurs",
        "Précédent",
        "Suivant",
    ],
    en: ["Export to CSV", "Account type", "All users", "Previous", "Next"],
};

describe.each(["fr", "en"])("users area — bilingual smoke (%s)", (lng) => {
    test("renders UserList with real translated copy, no missing-key markers", async () => {
        await i18n.changeLanguage(lng);
        render(<UserList />);

        for (const text of REPRESENTATIVE[lng]) {
            expect(screen.getByText(text)).toBeInTheDocument();
        }
        expect(document.body.textContent).not.toMatch(/translation missing/i);

        // Let the debounced initial fetch settle so it doesn't leak a state update.
        await waitFor(() => expect(global.fetch).toHaveBeenCalled(), {
            timeout: 2000,
        });
    });
});

// Regression for the "selection" column's row-checkbox going stale (item 13 batch 4d part 1,
// see docs/Modernization-Roadmap.md). Its `accessor` (`isSelected`) reads `this.state.selected`
// -- clicking a row's own checkbox only `setState`s `selected`, not `data`, so TanStack's
// per-row `_valuesCache` (keyed on `data`'s reference, not on unrelated component state) never
// recomputed that accessor. Before this commit the Cell displayed the cached `value` from that
// accessor; now it reads `isSelected(d.original)` straight off `this.state.selected` inside
// `Cell`, bypassing the stale cache entirely. The header "select all" checkbox (in the column's
// `Filter`) was never affected -- it already read `this.state.selected` directly -- so this test
// specifically drives a single row's own checkbox, not the header.
describe("row selection checkboxes stay in sync with clicks (not just the header)", () => {
    const makeUser = (id) => ({
        id,
        adherent_number: id,
        is_admin: false,
        is_teacher: false,
        activities: [],
        adhesions: [],
        attached_to_id: null,
        last_name: `Last${id}`,
        first_name: `First${id}`,
        birthday: null,
        planning: null,
        "any_users_self_is_paying_for?": false,
    });

    test("clicking a row's own checkbox visually checks that row, without affecting the other row or the header", async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            headers: { has: () => false },
            json: () =>
                Promise.resolve({
                    users: [makeUser(1), makeUser(2)],
                    pages: 1,
                    total: 2,
                }),
        });

        render(<UserList />);

        await screen.findByText("First1");
        await screen.findByText("First2");

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
