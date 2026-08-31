// i18n extraction test — i18n-06 "activities" domain, lot 3c (`activityApplications` namespace).
//
// FormulaChoice is a function component (`useTranslation("activityApplications")`) wrapped by
// WrappedFormulaChoice for StepZilla; it is tested directly. Every prop below is read
// unconditionally in render, so all are supplied. The two non-trivial children
// (`FormulaActivitiesModal`, `../utils/WysiwygViewer`) are mocked to null — none of the strings
// under test live in them.
//
// Language is driven through the frontend/i18n singleton (registered via initReactI18next, so no
// <I18nextProvider> is needed). `afterEach` resets to "fr".

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../../i18n";
import FormulaChoice from "./FormulaChoice";

vi.mock("./FormulaActivitiesModal", () => ({default: () => null}));
vi.mock("../utils/WysiwygViewer", () => ({default: () => null}));

const baseProps = {
    infoText: null,
    formulas: [],
    selectedFormulas: [],
    selectedFormulaActivities: {},
    handleAddFormula() {},
    handleRemoveFormula() {},
    handleUpdateFormulaActivities() {},
    allActivityRefs: [],
};

const renderFormulaChoice = (overrides = {}) =>
    render(<FormulaChoice {...baseProps} {...overrides} />);

afterEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("fr");
});

const COPY = {
    fr: {
        title: "Choix de la formule",
        price: "Prix",
        searchPlaceholder: "Rechercher",
        colPackage: "Formule",
        colEstimatedPrice: "Tarif estimé",
        colDuration: "Durée",
        summary: "Récapitulatif",
        noPackagesAvailable: "Aucune formule disponible",
        noPackagesSelected: "Aucune formule sélectionnée",
        noActivitiesSelected: "Aucune activité sélectionnée",
        noDescription: "Aucune description",
        estimatedTotal: /Total estimé:/,
    },
    en: {
        title: "Package choice",
        price: "Price",
        searchPlaceholder: "Search",
        colPackage: "Package",
        colEstimatedPrice: "Estimated price",
        colDuration: "Duration",
        summary: "Summary",
        noPackagesAvailable: "No packages available",
        noPackagesSelected: "No packages selected",
        noActivitiesSelected: "No activities selected",
        noDescription: "No description",
        estimatedTotal: /Estimated total:/,
    },
};

describe.each(["fr", "en"])("FormulaChoice — rendered copy (%s)", lng => {
    const x = COPY[lng];

    beforeEach(async () => {
        await i18n.changeLanguage(lng);
    });

    test("empty state: headers, controls and both empty rows", () => {
        renderFormulaChoice();

        // Panel heading + summary heading.
        expect(screen.getByRole("heading", {name: x.title})).toBeInTheDocument();
        expect(screen.getByRole("heading", {name: x.summary})).toBeInTheDocument();

        // Sort control + search input.
        expect(screen.getByRole("button", {name: x.price})).toBeInTheDocument();
        expect(screen.getByPlaceholderText(x.searchPlaceholder)).toBeInTheDocument();

        // colPackage + colEstimatedPrice each appear in both the available and summary <thead>.
        expect(screen.getAllByText(x.colPackage)).toHaveLength(2);
        expect(screen.getAllByText(x.colEstimatedPrice)).toHaveLength(2);
        // colDuration only exists in the summary <thead>.
        expect(screen.getByText(x.colDuration)).toBeInTheDocument();

        // Empty rows on each side.
        expect(screen.getByText(x.noPackagesAvailable)).toBeInTheDocument();
        expect(screen.getByText(x.noPackagesSelected)).toBeInTheDocument();
    });

    test("one formula selected: sub-row / description / estimated-total copy", () => {
        renderFormulaChoice({
            formulas: [
                {
                    id: 1,
                    name: "Trio",
                    description: "",
                    formule_pricings: [{price: "120"}],
                    formule_items: [],
                },
            ],
            selectedFormulas: [1],
            selectedFormulaActivities: {1: []},
        });

        // Available row falls back to the "no description" copy (description is "").
        expect(screen.getByText(x.noDescription)).toBeInTheDocument();
        // Summary sub-row: formula selected but no activities chosen.
        expect(screen.getByText(x.noActivitiesSelected)).toBeInTheDocument();
        // Estimated-total line: label + "120.00" + "€" are separate JSX text nodes.
        expect(screen.getByText(x.estimatedTotal)).toBeInTheDocument();
        expect(screen.getByText(/120\.00/)).toBeInTheDocument();
    });
});

describe("FormulaChoice — fr estimated-total keeps its colon", () => {
    test("the label text node ends with ':' (number/€ appended in JSX)", async () => {
        await i18n.changeLanguage("fr");
        renderFormulaChoice({
            formulas: [
                {
                    id: 1,
                    name: "Trio",
                    description: "",
                    formule_pricings: [{price: "120"}],
                    formule_items: [],
                },
            ],
            selectedFormulas: [1],
            selectedFormulaActivities: {1: []},
        });

        const totalEl = screen.getByText(/Total estimé:/);
        expect(totalEl.textContent).toContain("Total estimé:");
        expect(totalEl.textContent).toContain("120.00");
        expect(totalEl.textContent).toContain("€");
    });
});
