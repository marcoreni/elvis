// Coverage for the i18n extraction of QuestionnaireModal's three literals -- the close button,
// the loading placeholder and the default header -- which used to be hardcoded French shown
// regardless of the active locale (docs/KnownIssues.md). Rendered with `loading: true` so the
// heavy EvaluationForm child never mounts -- only the modal chrome is under test here.

import React from "react";
import { render, screen } from "@testing-library/react";
import i18n from "../../i18n";
import QuestionnaireModal from "./FormDisplayModal";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe.each(["fr", "en"])("FormDisplayModal (%s)", (lng) => {
    const EXPECTED = {
        fr: {
            close: "Fermer",
            loading: "Chargement de la fiche...",
            defaultTitle: "Questionnaire :",
        },
        en: {
            close: "Close",
            loading: "Loading record...",
            defaultTitle: "Questionnaire:",
        },
    };

    test("renders the locale's translated close label and loading placeholder, not hardcoded French", async () => {
        await i18n.changeLanguage(lng);
        const expected = EXPECTED[lng];

        render(<QuestionnaireModal isOpen loading onRequestClose={() => {}} />);

        expect(screen.getByText(expected.close)).toBeInTheDocument();
        expect(screen.getByText(expected.loading)).toBeInTheDocument();
    });

    test("falls back to the locale's translated default header when no `header` prop is given", async () => {
        await i18n.changeLanguage(lng);
        const expected = EXPECTED[lng];

        render(<QuestionnaireModal isOpen loading onRequestClose={() => {}} />);

        expect(screen.getByText(expected.defaultTitle)).toBeInTheDocument();
    });

    test("uses a caller-provided `header` instead of the default", async () => {
        await i18n.changeLanguage(lng);

        render(
            <QuestionnaireModal
                isOpen
                loading
                onRequestClose={() => {}}
                header={<h1>Custom title</h1>}
            />
        );

        expect(screen.getByText("Custom title")).toBeInTheDocument();
        expect(
            screen.queryByText(EXPECTED[lng].defaultTitle)
        ).not.toBeInTheDocument();
    });
});
