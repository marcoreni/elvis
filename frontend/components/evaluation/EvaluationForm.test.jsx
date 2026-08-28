// Component test for the i18n extraction on EvaluationForm (frontend i18n branch 06). The only
// string owned by this file is the default submit-button label (was the module-level
// DEFAULT_SUBMIT_LABEL const, now t("evaluation:form.defaultSubmitLabel")). Callers that pass
// their own `submitLabel` prop still win — covered below.
//
// Question (./question) is mocked out: it owns no extracted strings for this branch and rendering
// it would pull in react-select / DB-shaped question objects for no benefit here.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import EvaluationForm from "./EvaluationForm";

vi.mock("./question", () => ({
    default: () => <div>Question stub</div>,
    checkCondition: () => true,
}));

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("EvaluationForm", () => {
    test("uses the French default submit label", async () => {
        await i18n.changeLanguage("fr");
        render(<EvaluationForm questions={[]} answers={{}} onSubmit={() => {}} />);

        expect(screen.getByRole("button")).toHaveTextContent("Enregistrer les réponses");
    });

    test("uses the English default submit label when the active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<EvaluationForm questions={[]} answers={{}} onSubmit={() => {}} />);

        await waitFor(() =>
            expect(screen.getByRole("button")).toHaveTextContent("Save answers")
        );
    });

    test("an explicit submitLabel prop still overrides the translated default", async () => {
        await i18n.changeLanguage("fr");
        render(
            <EvaluationForm
                questions={[]}
                answers={{}}
                submitLabel="Libellé sur mesure"
                onSubmit={() => {}}
            />
        );

        expect(screen.getByRole("button")).toHaveTextContent("Libellé sur mesure");
    });
});
