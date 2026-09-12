// Component test for the i18n extraction on Evaluation (frontend i18n branch 06), plus a
// regression test for the submit round-trip (added alongside the TS-conversion bugfix pass —
// see docs/KnownIssues.md). Covers the strings that live directly in Evaluation.jsx: the
// per-student panel header ("A évaluer" / level badge) built by renderEvaluationHeader, and the
// previous-season level line ("Pas de niveau trouvé pour ... en ...", upper-cased in the
// component).
//
// CollapsePanel is mocked to render its header + children inline (no bootstrap collapse
// behaviour needed) but still wires up `onClick`/`id`/`collapsed` so the submit-round-trip test
// below can drive panel expansion and observe the `collapsed` prop directly; EvaluationForm is
// stubbed with a button that fires `onSubmit` (its own strings are covered in
// EvaluationForm.test.jsx); tools/api is mocked with a small stateful chain so the round-trip
// test can inspect the posted body and trigger the `.success()` callback.

import React from "react";
import {
    render,
    screen,
    waitFor,
    within,
    fireEvent,
} from "@testing-library/react";
import i18n from "../../i18n";
import Evaluation from "./Evaluation";
import * as api from "../../tools/api";
import * as collapsePanelModule from "../utils/ui/collapse_panel";

vi.mock("../utils/ui/collapse_panel", () => {
    const calls = [];
    return {
        default: (props) => {
            calls.push(props);
            return (
                <div data-testid={`panel-${props.id}`}>
                    <button
                        onClick={props.onClick}
                    >{`toggle-${props.id}`}</button>
                    {props.header}
                    {props.children}
                </div>
            );
        },
        __calls: calls,
    };
});
vi.mock("./EvaluationForm", () => ({
    default: ({ onSubmit }) => (
        <button onClick={() => onSubmit({ 1: "yes" })}>Submit stub</button>
    ),
}));
vi.mock("../../tools/api", () => {
    let successCb;
    let lastPost;
    let nextResponse = {};
    const chain = {
        success: (cb) => {
            successCb = cb;
            return chain;
        },
        post: (url, body) => {
            lastPost = { url, body };
            successCb?.(nextResponse);
        },
    };
    return {
        set: () => chain,
        __setNextResponse: (r) => {
            nextResponse = r;
        },
        __getLastPost: () => lastPost,
    };
});

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

describe.each(["fr", "en"])("Evaluation — bilingual smoke (%s)", (lng) => {
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

// Regression test for the submit round-trip: expand a student's panel, submit, and confirm (a)
// the posted body's student_id matches the expanded student, (b) the success callback merges
// the returned `levels`/answers into that one student's state without dropping the other
// student's already-existing studentAnswers, and (c) the panel collapses again afterwards.
describe("Evaluation — submit round-trip", () => {
    const twoStudentActivity = {
        id: 1,
        activity_ref_id: 5,
        activity_ref: {
            activity_ref_kind_id: 2,
            activity_ref_kind: { name: "Guitare" },
        },
        users: [
            { id: 1, first_name: "John", last_name: "Doe", levels: [] },
            { id: 2, first_name: "Jane", last_name: "Roe", levels: [] },
        ],
    };
    // Student 2 already has an answer on mount, so we can verify submitting student 1 doesn't
    // wipe it.
    const seededEvaluations = [
        {
            id: 500,
            student_id: 2,
            answers: [{ question_id: "1", value: "existing" }],
        },
    ];

    beforeEach(() => {
        collapsePanelModule.__calls.length = 0;
        api.__setNextResponse({});
    });

    function renderTwoStudents() {
        return render(
            <Evaluation
                user={{ id: 99 }}
                season={season}
                activity={twoStudentActivity}
                questions={[]}
                referenceData={{}}
                evaluations={seededEvaluations}
            />
        );
    }

    test("posts the expanded student's id, merges the response without dropping the other student, and collapses on success", () => {
        renderTwoStudents();

        // Student 2 was seeded with an answer -> already shows the "answered" marker; student 1
        // does not yet.
        expect(
            within(screen.getByTestId("panel-1")).getByText(HEADER.fr)
        ).toBeInTheDocument();
        expect(
            screen.getByTestId("panel-2").querySelector(".label-success")
        ).not.toBeNull();
        expect(
            screen.getByTestId("panel-1").querySelector(".label-success")
        ).toBeNull();

        // Expand student 1's panel.
        fireEvent.click(screen.getByText("toggle-1"));

        const lastCallFor = (id) =>
            [...collapsePanelModule.__calls].reverse().find((c) => c.id === id);

        expect(lastCallFor(1).collapsed).toBe(false);

        api.__setNextResponse({
            student: { id: 1, levels: [{ label: "Niveau 2" }] },
            evaluation: { answers: [{ question_id: "1", value: "yes" }] },
        });

        fireEvent.click(
            within(screen.getByTestId("panel-1")).getByText("Submit stub")
        );

        // (a) the posted body targets the expanded student.
        const lastPost = api.__getLastPost();
        expect(lastPost.url).toBe("/student_evaluations");
        expect(lastPost.body.student_id).toBe("1");
        expect(lastPost.body.season_id).toBe("10");
        expect(lastPost.body.teacher_id).toBe("99");

        // (b) student 1 now shows as answered, and student 2's pre-existing answer marker is
        // still there -> the merge didn't drop it.
        expect(
            screen.getByTestId("panel-1").querySelector(".label-success")
        ).not.toBeNull();
        expect(
            screen.getByTestId("panel-2").querySelector(".label-success")
        ).not.toBeNull();

        // (c) the panel collapses again after a successful submit.
        expect(lastCallFor(1).collapsed).toBe(true);
    });
});
