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

// Domain bilingual smoke for the `evaluation` area (Phase 07 P0 checkpoint strategy —
// docs/I18n-Roadmap.md §P0). Beyond the plain header string, this keeps the previous-season
// level line because it interpolates {{kind}} / {{season}} into a copy that the component then
// upper-cases — a real interpolation path, not a string-echo. StudentEvaluationsStats's echo
// pair was removed; EvaluationForm keeps its own submit-label behaviour test.
const LEVEL_LINE = {
    fr: /PAS DE NIVEAU TROUVÉ POUR GUITARE EN 2023-2024/,
    en: /NO LEVEL FOUND FOR GUITARE IN 2023-2024/,
};
const HEADER = { fr: "A évaluer", en: "To evaluate" };

describe.each(["fr", "en"])("Evaluation — bilingual smoke (%s)", lng => {
    test("renders the panel header and the interpolated previous-season level line", async () => {
        await i18n.changeLanguage(lng);
        renderEvaluation();

        await waitFor(() =>
            expect(screen.getByText(HEADER[lng])).toBeInTheDocument()
        );
        expect(screen.getByText(LEVEL_LINE[lng])).toBeInTheDocument();
        expect(document.body.textContent).not.toMatch(/translation missing/i);
    });
});
