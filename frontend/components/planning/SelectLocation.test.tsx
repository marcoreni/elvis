// Component + unit test for SelectLocation -- no prior test file existed. No real call site was
// found anywhere in app/views or frontend/ for this component (confirmed by grep across both
// trees); kept as-is per the batch's scope (convert, don't delete -- see CLAUDE.md's "don't
// delete on 500" guidance, which extends to "looks unused").
//
// `formatOptions`/`findElementsByLocation` are exported for direct unit testing of the matching
// logic, which is fiddly to exercise indirectly through a mocked `<Select>`.
//
// `react-select` is mocked the same way other tests in this repo mock it (e.g.
// ActivityRefPricingModal.test.jsx) rather than exercising its real dropdown/listbox DOM: a
// plain stub that exposes each option as a button and calls the real `onChange` prop, so this
// tests SelectLocation's own wiring (options computed once, componentDidUpdate -> useEffect
// reset behavior, the onChange/dedup contract) without fighting react-select's positioning.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

vi.mock("react-select", () => ({
    default: ({
        options,
        value,
        onChange,
    }: {
        options: { id: number; label: string }[];
        value: { id: number; label: string }[];
        onChange: (next: { id: number; label: string }[]) => void;
    }) => (
        <div>
            <div data-testid="selected-count">{value.length}</div>
            {options.map((opt) => (
                <button key={opt.id} onClick={() => onChange([...value, opt])}>
                    {opt.label}
                </button>
            ))}
            <button data-testid="clear" onClick={() => onChange([])}>
                clear
            </button>
        </div>
    ),
}));

import SelectLocation, {
    formatOptions,
    findElementsByLocation,
} from "./SelectLocation";

const rooms = [
    { id: 1, label: "Salle A", location_id: 10 },
    { id: 2, label: "Salle B", location_id: 10 },
    { id: 3, label: "Salle C", location_id: 20 },
    { id: 4, label: "Salle sans lieu" },
];
const locations = [
    { id: 10, label: "Site Nord" },
    { id: 20, label: "Site Sud" },
];

describe("formatOptions", () => {
    test("builds one deduplicated option per distinct location actually used by a room", () => {
        expect(formatOptions({ rooms }, locations, "room")).toEqual([
            { id: 10, value: 10, label: "Site Nord" },
            { id: 20, value: 20, label: "Site Sud" },
        ]);
    });

    test("returns [] when locations is undefined (Array.isArray guard)", () => {
        expect(formatOptions({ rooms }, undefined, "room")).toEqual([]);
    });

    test("returns [] for an unimplemented mode", () => {
        expect(formatOptions({ rooms }, locations, "other")).toEqual([]);
    });
});

describe("findElementsByLocation", () => {
    test("returns every room id whose location_id is in the selected locations", () => {
        const ids = findElementsByLocation({ rooms }, "room", [
            { id: 10, value: 10, label: "Site Nord" },
        ]);
        expect(ids.sort((a, b) => a - b)).toEqual([1, 2]);
    });

    test("returns [] for an unimplemented mode", () => {
        expect(
            findElementsByLocation({ rooms }, "other", [
                { id: 10, value: 10, label: "Site Nord" },
            ])
        ).toEqual([]);
    });
});

describe("SelectLocation", () => {
    test("selecting a location calls onChange with [defaultPlanning, ...matching room ids], deduplicated", async () => {
        const onChange = vi.fn();
        render(
            <SelectLocation
                rooms={rooms}
                locations={locations}
                mode="room"
                defaultPlanning={99}
                onChange={onChange}
            />
        );

        await userEvent.click(screen.getByText("Site Nord"));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(
            [...onChange.mock.calls[0][0]].sort((a: number, b: number) => a - b)
        ).toEqual([1, 2, 99]);
    });

    test("clearing the selection calls onChange with just [defaultPlanning]", async () => {
        const onChange = vi.fn();
        render(
            <SelectLocation
                rooms={rooms}
                locations={locations}
                mode="room"
                defaultPlanning={99}
                onChange={onChange}
            />
        );

        await userEvent.click(screen.getByText("Site Nord"));
        await userEvent.click(screen.getByTestId("clear"));

        expect(onChange).toHaveBeenLastCalledWith([99]);
    });

    test("mounting does not reset the (already-empty) selection, regardless of lastReinitialize", () => {
        render(
            <SelectLocation
                rooms={rooms}
                locations={locations}
                mode="room"
                lastReinitialize={1}
                onChange={vi.fn()}
            />
        );

        expect(screen.getByTestId("selected-count")).toHaveTextContent("0");
    });

    test("changing lastReinitialize after mount resets the current selection (componentDidUpdate -> useEffect)", async () => {
        const onChange = vi.fn();
        const { rerender } = render(
            <SelectLocation
                rooms={rooms}
                locations={locations}
                mode="room"
                lastReinitialize={1}
                onChange={onChange}
            />
        );

        await userEvent.click(screen.getByText("Site Nord"));
        expect(screen.getByTestId("selected-count")).toHaveTextContent("1");

        rerender(
            <SelectLocation
                rooms={rooms}
                locations={locations}
                mode="room"
                lastReinitialize={2}
                onChange={onChange}
            />
        );

        expect(screen.getByTestId("selected-count")).toHaveTextContent("0");
    });

    test("re-rendering with the same lastReinitialize does not reset the current selection", async () => {
        const onChange = vi.fn();
        const { rerender } = render(
            <SelectLocation
                rooms={rooms}
                locations={locations}
                mode="room"
                lastReinitialize={1}
                onChange={onChange}
            />
        );

        await userEvent.click(screen.getByText("Site Nord"));
        expect(screen.getByTestId("selected-count")).toHaveTextContent("1");

        rerender(
            <SelectLocation
                rooms={rooms}
                locations={locations}
                mode="room"
                lastReinitialize={1}
                onChange={onChange}
            />
        );

        expect(screen.getByTestId("selected-count")).toHaveTextContent("1");
    });
});
