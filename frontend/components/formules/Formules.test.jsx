// Component test for the i18n extraction on Formules (frontend i18n branch
// i18n-06-extract-formules, new `formules` namespace). Same mocking-free language-switching
// pattern as the earlier branches: i18n.changeLanguage(...) on the frontend/i18n/index.js
// singleton + the useTranslation() hook.
//
// Formules fetches its table data on mount (react-table `manual` mode -> onFetchData -> a
// fetch("/formules", ...) through tools/api). global.fetch is mocked so that resolves
// harmlessly; assertions only cover strings that render synchronously (intro line, create
// button, column headers).

import React from "react";
import {render, screen, waitFor} from "@testing-library/react";
import i18n from "../../i18n";
import Formules from "./Formules";

beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {get: h => (h === "Content-type" ? "application/json" : null)},
        json: () => Promise.resolve({data: [], pages: 1}),
    });
});

afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
});

describe("Formules", () => {
    test("renders the French strings by default", async () => {
        await i18n.changeLanguage("fr");
        render(<Formules/>);

        expect(
            screen.getByText("Vous pouvez créer des formules pour proposer un prix pour plusieurs activités.")
        ).toBeInTheDocument();
        expect(screen.getByText("Créer une formule")).toBeInTheDocument();
        expect(screen.getByText("Nom de la formule")).toBeInTheDocument();
        expect(screen.getByText("Activités ou familles d'activités")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled(), {timeout: 2000});
    });

    test("renders the English strings when the active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<Formules/>);

        expect(
            screen.getByText("You can create packages to offer a single price for several activities.")
        ).toBeInTheDocument();
        expect(screen.getByText("Create a package")).toBeInTheDocument();
        expect(screen.getByText("Package name")).toBeInTheDocument();
        expect(screen.getByText("Activities or activity families")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled(), {timeout: 2000});
    });
});
