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

describe("UserList", () => {
    test("renders the French translations by default", async () => {
        await i18n.changeLanguage("fr");
        render(<UserList/>);

        expect(screen.getByText("Exporter en CSV")).toBeInTheDocument();
        expect(screen.getByText("Fusionner des doublons")).toBeInTheDocument();
        expect(screen.getByText("Rôle")).toBeInTheDocument();
        expect(screen.getByText("Type de compte")).toBeInTheDocument();
        expect(screen.getByText("Nom")).toBeInTheDocument();
        expect(screen.getByText("Prénom")).toBeInTheDocument();
        expect(screen.getByText("Date de naissance")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();
        expect(screen.getByText("Tous les utilisateurs")).toBeInTheDocument();
        // react-table pagination text now comes from the shared common:reactTable.* keys
        expect(screen.getByText("Précédent")).toBeInTheDocument();
        expect(screen.getByText("Suivant")).toBeInTheDocument();

        // Let the debounced initial fetch settle so it doesn't leak a state update into the
        // next test.
        await waitFor(() => expect(global.fetch).toHaveBeenCalled(), {timeout: 2000});
    });

    test("renders the English translations when the active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<UserList/>);

        expect(screen.getByText("Export to CSV")).toBeInTheDocument();
        expect(screen.getByText("Merge duplicates")).toBeInTheDocument();
        expect(screen.getByText("Role")).toBeInTheDocument();
        expect(screen.getByText("Account type")).toBeInTheDocument();
        expect(screen.getByText("Last name")).toBeInTheDocument();
        expect(screen.getByText("First name")).toBeInTheDocument();
        expect(screen.getByText("Date of birth")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();
        expect(screen.getByText("All users")).toBeInTheDocument();
        expect(screen.getByText("Previous")).toBeInTheDocument();
        expect(screen.getByText("Next")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled(), {timeout: 2000});
    });
});
