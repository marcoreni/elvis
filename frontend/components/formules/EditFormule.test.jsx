// Component test for the i18n extraction on EditFormule (frontend i18n branch
// i18n-06-extract-formules, `formules` namespace). Mocking-free language switching via the
// frontend/i18n/index.js singleton + useTranslation().
//
// EditFormule fires three fetches on mount (activity refs / activity ref kinds / seasons +
// pricing categories) and its BaseDataTable pricing grid fetches too. global.fetch is mocked to
// resolve with empty collections; assertions only cover strings that render synchronously in
// edit mode (the activity modal is closed by default, so its strings are intentionally not
// asserted here).

import React from "react";
import {render, screen, waitFor} from "@testing-library/react";
import i18n from "../../i18n";
import EditFormule from "./EditFormule";

const formule = {
    id: 1,
    name: "Parcours découverte",
    description: "",
    active: true,
    number_of_items: 1,
    formule_items: [],
    formule_pricings: [],
};

beforeEach(() => {
    global.fetch = vi.fn(url => {
        const u = String(url);
        const body = u.includes("get_seasons_and_pricing_categories")
            ? {seasons: [], pricing_categories: []}
            : u.includes("/formule_pricings")
            ? {data: [], pages: 1}
            : [];
        return Promise.resolve({
            ok: true,
            headers: {get: h => (h === "Content-type" ? "application/json" : null)},
            json: () => Promise.resolve(body),
        });
    });
});

afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
});

describe("EditFormule", () => {
    test("renders the French strings by default", async () => {
        await i18n.changeLanguage("fr");
        render(<EditFormule formule={formule}/>);

        expect(screen.getByText("Nom de la formule")).toBeInTheDocument();
        expect(screen.getByText("Description")).toBeInTheDocument();
        expect(screen.getByText("Activités")).toBeInTheDocument();
        expect(screen.getByText("Ajouter une activité")).toBeInTheDocument();
        expect(
            screen.getByText("Ajouter les activités ou une famille d’activité qui composent votre parcours")
        ).toBeInTheDocument();
        expect(screen.getByText("Enregistrer")).toBeInTheDocument();
        expect(screen.getByText("Tarif en €")).toBeInTheDocument();
        expect(screen.getByText("Saisons concernées")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled(), {timeout: 2000});
    });

    test("renders the English strings when the active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<EditFormule formule={formule}/>);

        expect(screen.getByText("Package name")).toBeInTheDocument();
        expect(screen.getByText("Description")).toBeInTheDocument();
        expect(screen.getByText("Activities")).toBeInTheDocument();
        expect(screen.getByText("Add an activity")).toBeInTheDocument();
        expect(
            screen.getByText("Add the activities or an activity family that make up your track")
        ).toBeInTheDocument();
        expect(screen.getByText("Save")).toBeInTheDocument();
        expect(screen.getByText("Price in €")).toBeInTheDocument();
        expect(screen.getByText("Seasons concerned")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled(), {timeout: 2000});
    });
});
