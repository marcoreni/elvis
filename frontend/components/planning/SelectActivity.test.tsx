// Component + unit test for SelectActivity -- jsx-to-tsx batch 3. Converted off a class
// component (constructor + componentDidUpdate) to hooks, the same pattern as the already-
// converted planning/SelectLocation.tsx (batch 2): `options` is a useState lazy initializer
// (computed once, matching the constructor-only computation), and componentDidUpdate's
// lastReinitialize reset becomes a useEffect with an explicit prev-value ref guard so it
// doesn't also fire on mount.
//
// `react-select` is mocked the same way SelectLocation.test.tsx mocks it: a plain stub exposing
// each option as a button and the real onChange prop, plus a render spy so the mount-vs-update
// test can tell "the effect didn't fire" from "it fired but had no visible effect" (see that
// file's header comment for why rendered content alone isn't enough).

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { selectRenderSpy } = vi.hoisted(() => ({ selectRenderSpy: vi.fn() }));

vi.mock("react-select", () => ({
    default: ({
        options,
        value,
        isMulti,
        onChange,
    }: {
        options: { id?: number; value: number | string; label: string }[];
        value: { id?: number; value: number | string; label: string }[] | null;
        isMulti?: boolean;
        onChange: (next: unknown) => void;
    }) => {
        selectRenderSpy();
        const selected = value || [];
        return (
            <div>
                <div data-testid="selected-count">
                    {isMulti ? selected.length : selected ? 1 : 0}
                </div>
                {options.map((opt) =>
                    isMulti ? (
                        <button
                            key={opt.value}
                            onClick={() => onChange([...selected, opt])}
                        >
                            {opt.label}
                        </button>
                    ) : (
                        <button key={opt.value} onClick={() => onChange(opt)}>
                            {opt.label}
                        </button>
                    )
                )}
                <button
                    data-testid="clear"
                    onClick={() => onChange(isMulti ? [] : null)}
                >
                    clear
                </button>
            </div>
        );
    },
}));

import SelectActivity, {
    formatOptions,
    findElementsByActivities,
} from "./SelectActivity";

beforeEach(() => {
    selectRenderSpy.mockClear();
});

const activities = [
    { id: 1, label: "Guitare" },
    { id: 2, label: "Piano" },
];

const rooms = [
    { id: 10, room_activities: [{ activity_ref_id: 1 }] },
    { id: 11, room_activities: [{ activity_ref_id: 2 }] },
    { id: 12, room_activities: [] },
];

const teachers = [
    {
        id: 20,
        planning: { id: 200 },
        teachers_activity_refs: [{ activity_ref_id: 1, planning: { id: 200 } }],
    },
    {
        id: 21,
        planning: { id: 201 },
        teachers_activity_refs: [{ activity_ref_id: 2, planning: { id: 201 } }],
    },
];

describe("formatOptions", () => {
    test("builds one deduplicated option per activity ref actually used, room mode", () => {
        expect(
            formatOptions(rooms as never, activities as never, "room")
        ).toEqual([
            { id: 1, value: 1, label: "Guitare" },
            { id: 2, value: 2, label: "Piano" },
        ]);
    });

    test("returns [] for an unrecognized mode", () => {
        expect(
            formatOptions(rooms as never, activities as never, undefined)
        ).toEqual([]);
    });
});

describe("findElementsByActivities", () => {
    test("room mode reports room ids", () => {
        const ids = findElementsByActivities(rooms as never, "room", [
            { id: 1, value: 1, label: "Guitare" },
        ]);
        expect(ids).toEqual([10]);
    });

    test("teacher mode reports the teacher's planning id, not the teacher's own id", () => {
        const ids = findElementsByActivities(teachers as never, "teacher", [
            { id: 1, value: 1, label: "Guitare" },
        ]);
        expect(ids).toEqual([200]);
    });
});

describe("SelectActivity -- room mode", () => {
    test("selecting an activity reports [defaultPlanning, ...matching room ids]", async () => {
        const onChange = vi.fn();
        render(
            <SelectActivity
                mode="room"
                rooms={rooms as never}
                activities={activities as never}
                locations={[]}
                defaultPlanning={99}
                onChange={onChange}
            />
        );

        await userEvent.click(screen.getByText("Guitare"));

        expect(onChange).toHaveBeenCalledWith([99, 10]);
    });

    test("clearing the selection reports just [defaultPlanning]", async () => {
        const onChange = vi.fn();
        render(
            <SelectActivity
                mode="room"
                rooms={rooms as never}
                activities={activities as never}
                locations={[]}
                defaultPlanning={99}
                onChange={onChange}
            />
        );

        await userEvent.click(screen.getByText("Guitare"));
        // 2 <Select>s render in room mode (location filter + activities); "clear" matches both
        // a `data-testid`, pick the last one (the multi-activities select).
        const clearButtons = screen.getAllByTestId("clear");
        await userEvent.click(clearButtons[clearButtons.length - 1]);

        expect(onChange).toHaveBeenLastCalledWith([99]);
    });

    test("filtering by location narrows which rooms count toward a later activity selection", async () => {
        const onChange = vi.fn();
        const locatedRooms = [
            {
                id: 10,
                location_id: 1,
                room_activities: [{ activity_ref_id: 1 }],
            },
            {
                id: 11,
                location_id: 2,
                room_activities: [{ activity_ref_id: 1 }],
            },
        ];
        render(
            <SelectActivity
                mode="room"
                rooms={locatedRooms as never}
                activities={activities as never}
                locations={[{ id: 1, label: "Site Nord" }] as never}
                defaultPlanning={99}
                onChange={onChange}
            />
        );

        await userEvent.click(screen.getByText("Site Nord"));
        await userEvent.click(screen.getByText("Guitare"));

        // Only room 10 (location 1) counts now, not room 11.
        expect(onChange).toHaveBeenCalledWith([99, 10]);
    });
});

describe("SelectActivity -- teacher mode", () => {
    test("selecting an activity reports the matching teachers' planning ids", async () => {
        const onChange = vi.fn();
        render(
            <SelectActivity
                mode="teacher"
                teachers={teachers as never}
                activities={activities as never}
                defaultPlanning={99}
                onChange={onChange}
            />
        );

        await userEvent.click(screen.getByText("Piano"));

        expect(onChange).toHaveBeenCalledWith([99, 201]);
    });

    test("does not render the location filter select", () => {
        render(
            <SelectActivity
                mode="teacher"
                teachers={teachers as never}
                activities={activities as never}
                onChange={vi.fn()}
            />
        );

        expect(selectRenderSpy).toHaveBeenCalledTimes(1);
    });
});

describe("SelectActivity -- lastReinitialize reset (componentDidUpdate -> useEffect)", () => {
    test("mounting with a defined lastReinitialize does not fire an extra render", () => {
        render(
            <SelectActivity
                mode="teacher"
                teachers={teachers as never}
                activities={activities as never}
                lastReinitialize={1}
                onChange={vi.fn()}
            />
        );

        expect(selectRenderSpy).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId("selected-count")).toHaveTextContent("0");
    });

    test("changing lastReinitialize after mount clears the current selection", async () => {
        const onChange = vi.fn();
        const { rerender } = render(
            <SelectActivity
                mode="teacher"
                teachers={teachers as never}
                activities={activities as never}
                lastReinitialize={1}
                onChange={onChange}
            />
        );

        await userEvent.click(screen.getByText("Piano"));
        expect(screen.getByTestId("selected-count")).toHaveTextContent("1");

        rerender(
            <SelectActivity
                mode="teacher"
                teachers={teachers as never}
                activities={activities as never}
                lastReinitialize={2}
                onChange={onChange}
            />
        );

        expect(screen.getByTestId("selected-count")).toHaveTextContent("0");
    });

    test("re-rendering with the same lastReinitialize does not clear the selection", async () => {
        const onChange = vi.fn();
        const { rerender } = render(
            <SelectActivity
                mode="teacher"
                teachers={teachers as never}
                activities={activities as never}
                lastReinitialize={1}
                onChange={onChange}
            />
        );

        await userEvent.click(screen.getByText("Piano"));
        expect(screen.getByTestId("selected-count")).toHaveTextContent("1");

        rerender(
            <SelectActivity
                mode="teacher"
                teachers={teachers as never}
                activities={activities as never}
                lastReinitialize={1}
                onChange={onChange}
            />
        );

        expect(screen.getByTestId("selected-count")).toHaveTextContent("1");
    });
});
