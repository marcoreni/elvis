// Dedicated behavior coverage for RawPlanning -- jsx-to-tsx batch 3. The i18n-lot test
// (PlanningModals.test.jsx) only covers the empty-week message in both locales; this file
// exercises the real RawActivity/StudendItems/OptionItems rendering: validated-only filtering,
// start-time sorting, inactive-student exclusion, option/student de-dup, and the
// isTeacher-dependent room-vs-teacher display.

import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import i18n from "../../i18n";
import RawPlanning from "./RawPlanning";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

const student = (id: number, first_name: string) => ({
    id,
    first_name,
    last_name: "Dupont",
    birthday: "2010-01-01",
    levels: [],
});

const activityRef = {
    id: 1,
    label: "Guitare",
    occupation_limit: 5,
    is_work_group: false,
    activity_ref_kind_id: 1,
    activity_ref_kind: { id: 1, name: "cours" },
};

function makeInterval(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        start: "2026-09-01T10:00:00",
        end: "2026-09-01T11:00:00",
        is_validated: true,
        kind: "c",
        activity: {
            id: 1,
            group_name: "Groupe A",
            users: [student(1, "Ada")],
            activity_ref_id: 1,
            activity_ref: activityRef,
            activity_ref_kind_id: 1,
            room: { id: 1, label: "Salle 1" },
            teacher: {
                id: 9,
                first_name: "Jean",
                last_name: "Prof",
                birthday: "1980-01-01",
                levels: [],
            },
            student_evaluations: [],
            options: [],
            // Not read anywhere by RawPlanning -- only present to satisfy entities.ts's
            // `Activity.time_interval` (a real, required field on the entity in general).
            time_interval: {
                start: "2026-09-01T10:00:00",
                end: "2026-09-01T11:00:00",
            },
        },
        ...overrides,
    };
}

describe("RawPlanning", () => {
    test("renders a validated, non-evaluation interval's activity card", () => {
        render(
            <RawPlanning
                data={{ "1": [makeInterval()] }}
                seasons={[]}
                isTeacher={false}
                evaluations_level_refs={[]}
            />
        );

        expect(screen.getByText("Groupe A")).toBeInTheDocument();
        expect(
            screen.getByText("Guitare", { exact: false })
        ).toBeInTheDocument();
        expect(screen.getByText(/DUPONT Ada, \d+ ans/)).toBeInTheDocument();
        // isTeacher=false -> teacher name shown, room hidden.
        expect(screen.getByText("PROF Jean")).toBeInTheDocument();
        expect(screen.queryByText("Salle 1")).not.toBeInTheDocument();
    });

    test("shows the room label instead of the teacher name when isTeacher", () => {
        render(
            <RawPlanning
                data={{ "1": [makeInterval()] }}
                seasons={[]}
                isTeacher
                evaluations_level_refs={[]}
            />
        );

        expect(
            screen.getByText("Salle 1", { exact: false })
        ).toBeInTheDocument();
        expect(screen.queryByText("PROF Jean")).not.toBeInTheDocument();
    });

    test("excludes an interval that is not validated", () => {
        render(
            <RawPlanning
                data={{ "1": [makeInterval({ is_validated: false })] }}
                seasons={[]}
                isTeacher={false}
                evaluations_level_refs={[]}
            />
        );

        expect(screen.queryByText("Groupe A")).not.toBeInTheDocument();
    });

    test("excludes an evaluation-kind interval", () => {
        render(
            <RawPlanning
                data={{ "1": [makeInterval({ kind: "e" })] }}
                seasons={[]}
                isTeacher={false}
                evaluations_level_refs={[]}
            />
        );

        expect(screen.queryByText("Groupe A")).not.toBeInTheDocument();
    });

    test("sorts same-day intervals by start time", () => {
        const later = makeInterval({
            id: 2,
            start: "2026-09-01T14:00:00",
            end: "2026-09-01T15:00:00",
            activity: {
                ...makeInterval().activity,
                group_name: "Groupe B",
            },
        });
        const earlier = makeInterval({ id: 1 });

        render(
            <RawPlanning
                data={{ "1": [later, earlier] }}
                seasons={[]}
                isTeacher={false}
                evaluations_level_refs={[]}
            />
        );

        const headings = screen
            .getAllByText(/Groupe/)
            .map((el) => el.textContent);
        expect(headings).toEqual(["Groupe A", "Groupe B"]);
    });

    test("excludes inactive students and deduplicates options already counted as students", () => {
        const interval = makeInterval({
            activity: {
                ...makeInterval().activity,
                users: [student(1, "Ada"), student(2, "Bob")],
                options: [
                    {
                        id: 100,
                        desired_activity: {
                            id: 1,
                            activity_application: {
                                id: 1,
                                user: student(2, "Bob"),
                            },
                        },
                    },
                    {
                        id: 101,
                        desired_activity: {
                            id: 2,
                            activity_application: {
                                id: 2,
                                user: student(3, "Carla"),
                            },
                        },
                    },
                ],
            },
            activity_instance: {
                activity: makeInterval().activity,
                inactive_students: [{ id: 2 }],
            },
        });

        render(
            <RawPlanning
                data={{ "1": [interval] }}
                seasons={[]}
                isTeacher={false}
                evaluations_level_refs={[]}
            />
        );

        // Bob (id 2) is an inactive student -> excluded from the student list, but he's also
        // excluded as a *duplicate* option (he's a real activity.users member, just inactive) --
        // RawActivity's option de-dup filters by activity.users ids, not the post-inactive-filter
        // student list, so he never shows up as an option either. Only Carla (a genuine option,
        // never a student) should render.
        expect(screen.getByText(/DUPONT Ada, \d+ ans/)).toBeInTheDocument();
        expect(screen.queryByText(/DUPONT Bob/)).not.toBeInTheDocument();
        expect(screen.getByText(/DUPONT Carla, \d+ ans/)).toBeInTheDocument();
    });

    test("French and English empty-week message", async () => {
        await i18n.changeLanguage("fr");
        const { rerender } = render(
            <RawPlanning
                data={{}}
                seasons={[]}
                isTeacher={false}
                evaluations_level_refs={[]}
            />
        );
        expect(
            screen.getByText("Aucune activité cette semaine.")
        ).toBeInTheDocument();

        await i18n.changeLanguage("en");
        rerender(
            <RawPlanning
                data={{}}
                seasons={[]}
                isTeacher={false}
                evaluations_level_refs={[]}
            />
        );
        expect(screen.getByText("No activity this week.")).toBeInTheDocument();
    });
});
