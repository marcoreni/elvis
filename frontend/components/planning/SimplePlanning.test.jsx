// Component test for the i18n extraction on SimplePlanning (branch
// feature/i18n-06-extract-planning-simple — planning lot 3a). withTranslation("planning"), with
// `t` threaded to the module-level SimpleActivity and the SimpleEvaluation child. Mocking-free
// language switching via the frontend/i18n/index.js singleton.
//
// Rendered with an empty `data` map so only the toolbar + empty-week message paint (the
// SimpleActivity / SimpleEvaluation branches need deep timeInterval fixtures and their reused
// keys — rawPlanning.occupancy, evaluationModal.readSelfAssessment — are already covered by
// those components' own tests).

import React from "react";
import { render, screen } from "@testing-library/react";
import i18n from "../../i18n";
import SimplePlanning from "./SimplePlanning";

const props = {
    data: {},
    day: "2026-09-01",
    seasons: [],
    listTeachers: [],
    selectedName: { first_name: "Ada", last_name: "Lovelace" },
    currentPlanning: 1,
    selectedPlanning: null,
};

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("SimplePlanning", () => {
    test("renders the empty-week message and teacher dropdown in French by default", async () => {
        await i18n.changeLanguage("fr");
        render(<SimplePlanning {...props} />);

        expect(screen.getByText("Aucune activité cette semaine.")).toBeInTheDocument();
        expect(screen.getByText("Planning de")).toBeInTheDocument();
    });

    test("renders in English when the active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<SimplePlanning {...props} />);

        expect(screen.getByText("No activity this week.")).toBeInTheDocument();
        expect(screen.getByText("Planning of")).toBeInTheDocument();
    });
});
