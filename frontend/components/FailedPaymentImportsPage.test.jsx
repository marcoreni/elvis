// Component test for the i18n extraction on FailedPaymentImportsPage (frontend i18n branch
// i18n-06-payments, new `payments` namespace). Same mock-free language-switching pattern as the
// earlier branches: i18n.changeLanguage(...) on the shared singleton + the withTranslation() HOC.
//
// Rendered with data=[] so react-table only paints the column headers (the per-row Cell
// renderers, which dereference reasons.find(...).id, never run). Assertions cover the strings
// that live directly in the component: the panel title, the column headers and the bulk-delete
// button label.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../i18n";
import FailedPaymentImportsPage from "./FailedPaymentImportsPage";

const reasons = [
    { id: 1, code: "payer_not_found", label: "Payeur introuvable" },
    { id: 2, code: "due_not_found", label: "Échéance introuvable" },
    { id: 3, code: "different_amounts", label: "Montants différents" },
];

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("FailedPaymentImportsPage", () => {
    test("renders the French strings by default", async () => {
        await i18n.changeLanguage("fr");
        render(<FailedPaymentImportsPage data={[]} reasons={reasons} />);

        expect(screen.getByRole("heading", { name: "Imports ratés" })).toBeInTheDocument();
        expect(screen.getByText("Sélection")).toBeInTheDocument();
        expect(screen.getByText("Raison")).toBeInTheDocument();
        expect(screen.getByText("Date d'échéance")).toBeInTheDocument();
        expect(screen.getByText("Date du prélèvement")).toBeInTheDocument();
        expect(screen.getByText("Montant import")).toBeInTheDocument();
        expect(screen.getByText("SUPPRESSION DE MASSE PAR RAISON")).toBeInTheDocument();
    });

    test("renders the English strings when the active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<FailedPaymentImportsPage data={[]} reasons={reasons} />);

        await waitFor(() =>
            expect(
                screen.getByRole("heading", { name: "Failed imports" })
            ).toBeInTheDocument()
        );
        expect(screen.getByText("Selection")).toBeInTheDocument();
        expect(screen.getByText("Reason")).toBeInTheDocument();
        expect(screen.getByText("Due date")).toBeInTheDocument();
        expect(screen.getByText("Cashing date")).toBeInTheDocument();
        expect(screen.getByText("Import amount")).toBeInTheDocument();
        expect(screen.getByText("BULK DELETE BY REASON")).toBeInTheDocument();
    });
});
