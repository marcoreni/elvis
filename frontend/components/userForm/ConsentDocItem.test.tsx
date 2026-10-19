// Component test for ConsentDocItem.tsx -- new coverage (none existed before this conversion).
// Needs a react-final-form <Form> context for its checkbox-case <Field>, same pattern as
// GeneralInfos.test.jsx / ActivityRefBasics.test.jsx.

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Form } from "react-final-form";
import ConsentDocItem from "./ConsentDocItem";

function renderDoc(docItem: Parameters<typeof ConsentDocItem>[0]["docItem"]) {
    render(
        <Form
            onSubmit={() => {}}
            render={() => (
                <ConsentDocItem docItem={docItem} schoolName="My School" />
            )}
        />
    );
}

describe("ConsentDocItem", () => {
    test("with an attached file: renders a link to it alongside the checkbox", () => {
        renderDoc({
            id: 1,
            title: "Règlement intérieur",
            content: "Voir le document ci-joint",
            expected_answer: true,
            attached_file_url: "https://example.org/reglement.pdf",
        });

        expect(
            screen.getByText("Voir le document ci-joint")
        ).toBeInTheDocument();
        const link = screen.getByRole("link", { name: "Règlement intérieur" });
        expect(link).toHaveAttribute(
            "href",
            "https://example.org/reglement.pdf"
        );
        const checkbox = screen.getByRole("checkbox", { hidden: true });
        expect(checkbox).toBeInTheDocument();
        // Regression guard: this Field+AlertCheckbox call was missing `alertType="info"` (same
        // bug as the AlertYesNoRadio branch below) -- see docs/KnownIssues.md's note on this
        // being an intentional visual fix, not an oversight.
        expect(checkbox.closest("label")).toHaveClass("alert-info");
    });

    test("without an attached file: renders the content with its URLs turned into links and {schoolName} substituted", () => {
        renderDoc({
            id: 2,
            title: "Charte",
            content:
                "Voir https://example.org/charte pour plus d'infos sur {schoolName}.",
            expected_answer: false,
        });

        const link = screen.getByRole("link", {
            name: "https://example.org/charte",
        });
        expect(link).toHaveAttribute("href", "https://example.org/charte");
        expect(link).toHaveAttribute("target", "_blank");
        expect(screen.getByText(/My School/)).toBeInTheDocument();
    });

    test("expected_answer: false renders the yes/no radio instead of a checkbox", () => {
        renderDoc({
            id: 3,
            title: "Droit à l'image",
            content: "Autorisez-vous la diffusion de votre image ?",
            expected_answer: false,
        });

        const radios = screen.getAllByRole("radio", { hidden: true });
        expect(radios).toHaveLength(2);
        expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
        // Regression guard: this AlertYesNoRadio call was missing `alertType="info"` -- see
        // docs/KnownIssues.md's note on this being an intentional visual fix, not an oversight.
        expect(radios[0].closest(".alert")).toHaveClass("alert-info");
    });
});
