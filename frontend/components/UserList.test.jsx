// Component test for the i18n extraction done on UserList (frontend i18n branch 05) — see
// UserEdit.test.jsx for the shared rationale on mocking-free language switching via the
// frontend/i18n/index.js singleton and withTranslation().
//
// UserList fetches its table data on mount (react-table's `manual` mode calling
// onFetchData -> a 400ms-debounced fetch("/users/list", ...)). global.fetch is mocked so that
// resolves harmlessly; assertions here only cover strings that render synchronously
// (buttons, table headers, filter options) since those don't depend on that fetch completing.

import React from "react";
import {render, screen, waitFor} from "@testing-library/react";
import i18n from "../i18n";
import UserList from "./UserList";

beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {has: () => false},
        json: () => Promise.resolve({users: [], pages: 1, total: 0}),
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
    fr: ["Exporter en CSV", "Type de compte", "Tous les utilisateurs", "Précédent", "Suivant"],
    en: ["Export to CSV", "Account type", "All users", "Previous", "Next"],
};

describe.each(["fr", "en"])("users area — bilingual smoke (%s)", lng => {
    test("renders UserList with real translated copy, no missing-key markers", async () => {
        await i18n.changeLanguage(lng);
        render(<UserList/>);

        for (const text of REPRESENTATIVE[lng]) {
            expect(screen.getByText(text)).toBeInTheDocument();
        }
        expect(document.body.textContent).not.toMatch(/translation missing/i);

        // Let the debounced initial fetch settle so it doesn't leak a state update.
        await waitFor(() => expect(global.fetch).toHaveBeenCalled(), {timeout: 2000});
    });
});
