// Component test for TimeInterval -- no prior test file existed, and no real call site was
// found anywhere in app/views or frontend/ (confirmed by grep across both trees); converted and
// tested as given rather than deleted, per this repo's "don't delete on 500 / looks dead"
// convention -- see docs/KnownIssues.md.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import TimeInterval from "./TimeInterval";

const activity = {
    id: 1,
    room_id: 10,
    users: [],
    activity_ref_id: 1,
    activity_ref: { label: "Guitare", kind: "lesson", occupation_limit: 5 },
    location: { label: "Le Havre" },
    teachers_activities: [{ is_main: true, user_id: 99 }],
    options: [],
};

const teachers = [
    {
        id: 99,
        first_name: "Jean",
        last_name: "Prof",
        birthday: "1980-01-01",
        levels: [],
    },
];
const rooms = [{ id: 10, label: "Salle 1" }];

describe("TimeInterval -- unvalidated / empty slot", () => {
    test("renders the kind label for an availability slot", () => {
        render(<TimeInterval kind="o" is_validated={false} />);
        expect(screen.getByText("Option")).toBeInTheDocument();
    });

    test("renders the pause label by default for an unrecognized kind", () => {
        render(<TimeInterval kind="x" is_validated={false} />);
        expect(screen.getByText("Dispo.")).toBeInTheDocument();
    });

    test("shows a delete button when not displayOnly and not validated, and calls handleDelete(uid)", async () => {
        const handleDelete = vi.fn();
        render(
            <TimeInterval
                kind="c"
                is_validated={false}
                uid="42"
                handleDelete={handleDelete}
            />
        );

        await userEvent.click(screen.getByRole("button"));
        expect(handleDelete).toHaveBeenCalledWith("42");
    });

    test("hides the delete button when displayOnly", () => {
        render(<TimeInterval kind="c" is_validated={false} displayOnly />);
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
});

describe("TimeInterval -- validated activity slot", () => {
    test("renders the activity ref label and room", () => {
        render(
            <TimeInterval
                is_validated
                activity={activity}
                room_refs={rooms}
                teachers={teachers}
            />
        );

        expect(screen.getByText("Guitare")).toBeInTheDocument();
        expect(screen.getByText("Salle 1")).toBeInTheDocument();
    });

    test("shows the main teacher's name when not isTeacher/isAdmin", () => {
        render(
            <TimeInterval
                is_validated
                activity={activity}
                room_refs={rooms}
                teachers={teachers}
            />
        );

        expect(screen.getByText("Jean Prof")).toBeInTheDocument();
    });

    test("shows occupancy count instead of the teacher name for isTeacher/isAdmin", () => {
        const { container } = render(
            <TimeInterval
                is_validated
                activity={activity}
                room_refs={rooms}
                teachers={teachers}
                isTeacher
            />
        );

        expect(screen.queryByText("Jean Prof")).not.toBeInTheDocument();
        expect(container.querySelector("span")?.textContent).toBe("0");
        expect(screen.getByText(/\/ 5/)).toBeInTheDocument();
    });

    test("shows a delete button when the activity has no students and calls handleDeleteActivity(activity.id)", async () => {
        const handleDeleteActivity = vi.fn();
        render(
            <TimeInterval
                is_validated
                activity={activity}
                room_refs={rooms}
                teachers={teachers}
                handleDeleteActivity={handleDeleteActivity}
            />
        );

        await userEvent.click(screen.getByRole("button"));
        expect(handleDeleteActivity).toHaveBeenCalledWith(1);
    });

    test("does not show a delete button once the activity has students", () => {
        render(
            <TimeInterval
                is_validated
                activity={{
                    ...activity,
                    users: [
                        {
                            id: 1,
                            first_name: "A",
                            last_name: "B",
                            birthday: "2010-01-01",
                            levels: [],
                        },
                    ],
                }}
                room_refs={rooms}
                teachers={teachers}
            />
        );

        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    test("uses the 'harfleur' class variant when the activity's location is Harfleur", () => {
        const { container } = render(
            <TimeInterval
                is_validated
                activity={{ ...activity, location: { label: "Harfleur" } }}
                room_refs={rooms}
                teachers={teachers}
            />
        );

        expect(container.querySelector(".event-harfleur")).toBeInTheDocument();
    });
});
