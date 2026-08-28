// Component test for the i18n extraction on StudentEvaluationsStats (frontend i18n branch 06,
// `evaluation` namespace). Same mock-free language-switching pattern as UserList.test.jsx /
// UserEdit.test.jsx: drive i18n.changeLanguage(...) on the shared singleton from
// frontend/i18n/index.js and let the withTranslation() HOC re-render.
//
// react-table renders every column's Header even with an empty data set, so the table headers
// are all we need to assert on here.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import StudentEvaluationsStats from "./StudentEvaluationsStats";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("StudentEvaluationsStats", () => {
    test("renders the French column headers by default", async () => {
        await i18n.changeLanguage("fr");
        render(<StudentEvaluationsStats stats={[]} />);

        expect(screen.getByText("Professeur")).toBeInTheDocument();
        expect(screen.getByText("Nombre élèves")).toBeInTheDocument();
        expect(screen.getByText("Nombre évaluations")).toBeInTheDocument();
        expect(screen.getByText("Nombre changements")).toBeInTheDocument();
        expect(screen.getByText("Nombre élèves/parents prévenus")).toBeInTheDocument();
        expect(screen.getByText("% d'évaluations complétées")).toBeInTheDocument();
    });

    test("renders the English column headers when the active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<StudentEvaluationsStats stats={[]} />);

        await waitFor(() =>
            expect(screen.getByText("Teacher")).toBeInTheDocument()
        );
        expect(screen.getByText("Number of students")).toBeInTheDocument();
        expect(screen.getByText("Number of evaluations")).toBeInTheDocument();
        expect(screen.getByText("Number of changes")).toBeInTheDocument();
        expect(screen.getByText("Students/parents notified")).toBeInTheDocument();
        expect(screen.getByText("% of evaluations completed")).toBeInTheDocument();
    });
});
