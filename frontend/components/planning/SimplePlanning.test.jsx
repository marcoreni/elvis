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

// One validated activity + one validated evaluation on a day, so renderDayColumns runs and both
// SimpleActivity (module-level, gets `t` as a param) and SimpleEvaluation (PureComponent child,
// reads `t` from props) actually mount.
const dayData = {
    data: {
        "1": [
            {
                id: 10,
                kind: "c",
                is_validated: true,
                start: "2026-09-01T10:00:00",
                end: "2026-09-01T11:00:00",
                activity_instance: {
                    activity: {
                        group_name: "Groupe A",
                        activity_ref: { id: 1, label: "Guitare", occupation_limit: 8 },
                        room: { label: "Salle 1" },
                    },
                },
                students: { active: [], options: [] },
            },
            {
                id: 11,
                kind: "e",
                is_validated: true,
                start: "2026-09-01T14:00:00",
                end: "2026-09-01T15:00:00",
                evaluation_appointment: {
                    activity_ref: { label: "Éveil musical" },
                    student: { first_name: "Bob", last_name: "Martin" },
                },
            },
        ],
    },
};

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

    test("threads t into SimpleActivity and SimpleEvaluation (French)", async () => {
        await i18n.changeLanguage("fr");
        render(<SimplePlanning {...props} {...dayData} />);

        expect(screen.getByText(/0\/8 élèves/)).toBeInTheDocument();
        expect(screen.getByText("EVAL")).toBeInTheDocument();
        expect(screen.getByText("Lire auto-évaluation")).toBeInTheDocument();
    });

    test("threads t into SimpleActivity and SimpleEvaluation (English)", async () => {
        await i18n.changeLanguage("en");
        render(<SimplePlanning {...props} {...dayData} />);

        expect(screen.getByText(/0\/8 students/)).toBeInTheDocument();
        expect(screen.getByText("EVAL")).toBeInTheDocument();
        expect(screen.getByText("Read self-assessment")).toBeInTheDocument();
    });
});
