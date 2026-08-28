// Component test for the i18n extraction on Evaluation (frontend i18n branch 06). Covers the
// strings that live directly in Evaluation.jsx: the per-student panel header ("A évaluer" /
// level badge) built by renderEvaluationHeader, and the previous-season level line
// ("Pas de niveau trouvé pour ... en ...", upper-cased in the component).
//
// CollapsePanel is mocked to render its header + children inline (no bootstrap collapse
// behaviour needed); EvaluationForm is stubbed (its own strings are covered in
// EvaluationForm.test.jsx); tools/api is mocked since importing it is enough to matter and it is
// only hit on submit, not on render.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import Evaluation from "./Evaluation";

vi.mock("../utils/ui/collapse_panel", () => ({
    default: ({ header, children }) => (
        <div>
            {header}
            {children}
        </div>
    ),
}));
vi.mock("./EvaluationForm", () => ({ default: () => <div>EvaluationForm stub</div> }));
vi.mock("../../tools/api", () => ({
    set: () => ({ success: () => ({ post: () => {} }) }),
}));

const season = { id: 10, previous: { id: 9, label: "2023-2024" } };
const activity = {
    id: 1,
    activity_ref_id: 5,
    activity_ref: {
        activity_ref_kind_id: 2,
        activity_ref_kind: { name: "Guitare" },
    },
    users: [{ id: 1, first_name: "John", last_name: "Doe", levels: [] }],
};

function renderEvaluation() {
    return render(
        <Evaluation
            user={{ id: 99 }}
            season={season}
            activity={activity}
            questions={[]}
            referenceData={{}}
            evaluations={[]}
        />
    );
}

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("Evaluation", () => {
    test("renders the French strings by default", async () => {
        await i18n.changeLanguage("fr");
        renderEvaluation();

        expect(screen.getByText("A évaluer")).toBeInTheDocument();
        expect(
            screen.getByText(/PAS DE NIVEAU TROUVÉ POUR GUITARE EN 2023-2024/)
        ).toBeInTheDocument();
    });

    test("renders the English strings when the active language is en", async () => {
        await i18n.changeLanguage("en");
        renderEvaluation();

        await waitFor(() =>
            expect(screen.getByText("To evaluate")).toBeInTheDocument()
        );
        expect(
            screen.getByText(/NO LEVEL FOUND FOR GUITARE IN 2023-2024/)
        ).toBeInTheDocument();
    });
});
