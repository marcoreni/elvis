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
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import i18n from "../../i18n";

// changeDate/fetchQuestionnaire both go through api.set().success(cb).get(url) -- mocked here so
// each test controls exactly what the "response" callback receives and when, instead of hitting
// the real debounced fetch chain.
const apiGet = vi.hoisted(() => vi.fn());
vi.mock("../../tools/api", () => ({
    set: () => ({
        success: (cb: (data: any) => void) => ({
            get: (url: string) => apiGet(url, cb),
        }),
    }),
}));

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
                        activity_ref: {
                            id: 1,
                            label: "Guitare",
                            occupation_limit: 8,
                            is_work_group: false,
                            activity_ref_kind_id: 1,
                            activity_ref_kind: { id: 1, name: "cours" },
                        },
                        room: { id: 1, label: "Salle 1" },
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
                    id: 1,
                    activity_ref: {
                        id: 2,
                        label: "Éveil musical",
                        is_work_group: false,
                        activity_ref_kind_id: 1,
                        activity_ref_kind: { id: 1, name: "cours" },
                    },
                    student: {
                        id: 42,
                        first_name: "Bob",
                        last_name: "Martin",
                        birthday: "2015-01-01",
                        levels: [],
                    },
                },
            },
        ],
    },
};

describe("SimplePlanning", () => {
    // The plain "renders the empty-week message in fr / in en" pair was a pure string-echo and
    // has been removed (Phase 07 P0). The two prop-threading tests below still render this
    // component in both locales and assert the child SimpleActivity / SimpleEvaluation actually
    // mount with a working `t`.

    test("threads t into SimpleActivity and SimpleEvaluation (French)", async () => {
        await i18n.changeLanguage("fr");
        render(<SimplePlanning {...props} {...dayData} />);

        expect(screen.getByText(/0\/8 élèves/)).toBeInTheDocument();
        expect(screen.getByText("EVAL")).toBeInTheDocument();
        expect(screen.getByText("Lire auto-évaluation")).toBeInTheDocument();
        // Day-column <h4> header uses WEEKDAYS[day] (tools/constants) — key "1" -> WEEKDAYS[1].
        expect(screen.getByText(/Lundi/)).toBeInTheDocument();
    });

    test("threads t into SimpleActivity and SimpleEvaluation (English)", async () => {
        await i18n.changeLanguage("en");
        render(<SimplePlanning {...props} {...dayData} />);

        expect(screen.getByText(/0\/8 students/)).toBeInTheDocument();
        expect(screen.getByText("EVAL")).toBeInTheDocument();
        expect(screen.getByText("Read self-assessment")).toBeInTheDocument();
        // WEEKDAYS follows the active language since constants-i18n lot 1.
        expect(screen.getByText(/Monday/)).toBeInTheDocument();
    });
});

describe("SimplePlanning -- changeDate (class constructor -> useState, debounced fetch)", () => {
    const pushStateSpy = vi.spyOn(history, "pushState");

    afterEach(() => {
        apiGet.mockReset();
        pushStateSpy.mockClear();
    });

    test("clicking next-week shows the loading label, then the fetched week", async () => {
        apiGet.mockImplementation((url, cb) => cb({ data: {} }));
        render(<SimplePlanning {...props} data={{}} />);

        await userEvent.click(screen.getAllByRole("button")[2]); // next-week arrow

        await waitFor(() => expect(apiGet).toHaveBeenCalled());
        const [url] = apiGet.mock.calls[0];
        expect(url).toBe(
            `/planning/simple/intervals/2026-09-08/${props.currentPlanning}`
        );
        expect(pushStateSpy).toHaveBeenCalledWith(
            {},
            "",
            "/planning/simple/2026-09-08"
        );

        await waitFor(() =>
            expect(
                screen.getByText("Aucune activité cette semaine.")
            ).toBeInTheDocument()
        );
    });

    test("uses the selectedPlanning's URLs when viewing someone else's planning", async () => {
        apiGet.mockImplementation((url, cb) => cb({ data: {} }));
        render(
            <SimplePlanning
                {...props}
                data={{}}
                currentPlanning={1}
                selectedPlanning={2}
            />
        );

        await userEvent.click(screen.getAllByRole("button")[2]);

        await waitFor(() => expect(apiGet).toHaveBeenCalled());
        expect(apiGet.mock.calls[0][0]).toBe(
            "/planning/simple/intervals/2026-09-08/2"
        );
        expect(pushStateSpy).toHaveBeenCalledWith(
            {},
            "",
            "/planning/simple/2026-09-08/2"
        );
    });
});

describe("SimplePlanning -- evaluation questionnaire modal (class setQuestionnaire/toggleEvalModal -> hooks)", () => {
    afterEach(() => {
        apiGet.mockReset();
    });

    test("clicking 'Read self-assessment' opens the modal and threads the fetched data through", async () => {
        await i18n.changeLanguage("fr");
        apiGet.mockImplementation((url, cb) =>
            cb({
                questions: [],
                new_student_level_questionnaire: { answers: [] },
                reference_data: {
                    teachers: [],
                    users: [],
                    payment_methods: [],
                    rooms: [],
                    locations: [],
                    seasons: [],
                    activities: [],
                    evaluation_level_refs: [],
                },
            })
        );

        render(<SimplePlanning {...props} {...dayData} />);

        await userEvent.click(screen.getByText("Lire auto-évaluation"));

        await waitFor(() => expect(apiGet).toHaveBeenCalled());
        expect(apiGet.mock.calls[0][0]).toBe(
            "/new_student_level_questionnaire/appointment/1"
        );
        // The modal mounts once loading clears (student/questions/questionnaire all populated).
        const dialog = await screen.findByRole("dialog");
        expect(within(dialog).getByText("MARTIN Bob")).toBeInTheDocument();
    });
});
