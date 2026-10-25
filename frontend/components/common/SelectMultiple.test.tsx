// Component test for SelectMultiple -- no prior test file existed. Converted from a class
// component to hooks as part of jsx-to-tsx batch 3 (docs/KnownIssues.md).
//
// `react-select/creatable` is mocked the same way other tests in this repo mock react-select
// (e.g. planning/SelectLocation.test.tsx): a plain stub exposing each option as a button and
// forwarding the real onChange/actionMeta shape, so this tests SelectMultiple's own state
// management rather than react-select's real dropdown DOM.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import i18n from "../../i18n";

const { swalFire } = vi.hoisted(() => ({
    swalFire: vi.fn(() => Promise.resolve({ isConfirmed: true })),
}));

vi.mock("sweetalert2", () => ({
    default: { fire: swalFire },
}));

vi.mock("react-select/creatable", () => ({
    default: ({
        options,
        value,
        isMulti,
        onChange,
    }: {
        options: { label: string; value: string | number }[];
        value: { label: string; value: string | number }[];
        isMulti: boolean;
        onChange: (
            next: unknown,
            actionMeta: {
                action: string;
                removedValue?: { label: string; value: string | number };
            }
        ) => void;
    }) => (
        <div>
            <div data-testid="selected-count">{value.length}</div>
            {options.map((opt) => (
                <button
                    key={String(opt.value)}
                    onClick={() =>
                        onChange(isMulti ? [...value, opt] : opt, {
                            action: "select-option",
                        })
                    }
                >
                    {opt.label}
                </button>
            ))}
            {value.map((v) => (
                <button
                    key={`remove-${v.value}`}
                    data-testid={`remove-${v.value}`}
                    onClick={() =>
                        onChange(
                            value.filter((x) => x !== v),
                            { action: "remove-value", removedValue: v }
                        )
                    }
                >
                    remove {v.label}
                </button>
            ))}
            <button
                data-testid="clear"
                onClick={() =>
                    onChange(isMulti ? [] : null, { action: "clear" })
                }
            >
                clear
            </button>
        </div>
    ),
}));

import SelectMultiple from "./SelectMultiple";

afterEach(async () => {
    swalFire.mockClear();
    await i18n.changeLanguage("fr");
});

const allFeatures: [string, number][] = [
    ["Alice", 1],
    ["Bob", 2],
    ["Carla", 3],
];

describe("SelectMultiple -- single-select mode", () => {
    test("selecting an option replaces the current selection", async () => {
        render(
            <SelectMultiple
                title="Lieu"
                name="room[location_id]"
                all_features={allFeatures}
                isMulti={false}
            />
        );

        await userEvent.click(screen.getByText("Bob"));

        expect(screen.getByTestId("selected-count")).toHaveTextContent("1");
    });

    test("pre-selects the feature given in the `features` prop", () => {
        render(
            <SelectMultiple
                title="Lieu"
                all_features={allFeatures}
                features={[2]}
                isMulti={false}
            />
        );

        expect(screen.getByTestId("selected-count")).toHaveTextContent("1");
        // The pre-selected option must not still be offered among the choices.
        expect(screen.queryByText("Bob")).not.toBeInTheDocument();
        expect(screen.getByText("Alice")).toBeInTheDocument();
    });
});

describe("SelectMultiple -- multi-select mode", () => {
    test("accumulates selections and removes them from the remaining options", async () => {
        render(
            <SelectMultiple title="Profs" all_features={allFeatures} isMulti />
        );

        await userEvent.click(screen.getByText("Alice"));
        expect(screen.getByTestId("selected-count")).toHaveTextContent("1");
        expect(screen.queryByText("Alice")).not.toBeInTheDocument();

        await userEvent.click(screen.getByText("Bob"));
        expect(screen.getByTestId("selected-count")).toHaveTextContent("2");
    });

    // Regression guard for a real bug found during this conversion: the original class
    // component's constructor called `_.remove(this.state.features, this.state.selectedFeatures)`
    // to drop already-selected features from the still-offered list -- lodash's array-as-predicate
    // iteratee shorthand means that call actually removed nothing (verified empirically, see
    // docs/KnownIssues.md). With 2 pre-selected features out of 3, exactly 1 must remain offered.
    test("every pre-selected feature (not just the first) is dropped from the remaining options", () => {
        render(
            <SelectMultiple
                title="Profs"
                all_features={allFeatures}
                features={[1, 3]}
                isMulti
            />
        );

        expect(screen.getByTestId("selected-count")).toHaveTextContent("2");
        expect(screen.queryByText("Alice")).not.toBeInTheDocument();
        expect(screen.queryByText("Carla")).not.toBeInTheDocument();
        expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    test("removing a selected value returns it to the offered options", async () => {
        render(
            <SelectMultiple
                title="Profs"
                all_features={allFeatures}
                isMulti
                features={[1]}
            />
        );
        expect(screen.getByTestId("selected-count")).toHaveTextContent("1");

        await userEvent.click(screen.getByTestId("remove-1"));

        expect(screen.getByTestId("selected-count")).toHaveTextContent("0");
        expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    test("notifies mutators.update for every pre-selected feature on mount", () => {
        const mutators = { update: vi.fn(), remove: vi.fn(), pop: vi.fn() };
        render(
            <SelectMultiple
                title="Profs"
                name="teachers"
                all_features={allFeatures}
                features={[1, 3]}
                mutators={mutators}
                isMulti
            />
        );

        expect(mutators.update).toHaveBeenCalledWith("teachers", 0, 1);
        expect(mutators.update).toHaveBeenCalledWith("teachers", 1, 3);
    });

    test("notifies mutators.remove when a selected feature is removed", async () => {
        const mutators = { update: vi.fn(), remove: vi.fn(), pop: vi.fn() };
        render(
            <SelectMultiple
                title="Profs"
                name="teachers"
                all_features={allFeatures}
                features={[1]}
                mutators={mutators}
                isMulti
            />
        );

        await userEvent.click(screen.getByTestId("remove-1"));

        expect(mutators.remove).toHaveBeenCalledWith("teachers", 0);
    });

    test("allowSelectAll offers a select-all option that selects every remaining feature", async () => {
        await i18n.changeLanguage("fr");
        render(
            <SelectMultiple
                title="Profs"
                all_features={allFeatures}
                isMulti
                allowSelectAll
            />
        );

        await userEvent.click(screen.getByText("Ajouter toutes les profs"));

        expect(screen.getByTestId("selected-count")).toHaveTextContent("3");
    });
});

describe("SelectMultiple -- clearing", () => {
    test("confirms before clearing by default, and only clears when confirmed", async () => {
        render(
            <SelectMultiple
                title="Profs"
                all_features={allFeatures}
                isMulti
                features={[1]}
            />
        );
        expect(screen.getByTestId("selected-count")).toHaveTextContent("1");

        await userEvent.click(screen.getByTestId("clear"));

        expect(swalFire).toHaveBeenCalledTimes(1);
        // swal.fire resolves asynchronously -- wait for the microtask that applies the clear.
        await screen.findByTestId("selected-count");
        expect(screen.getByTestId("selected-count")).toHaveTextContent("0");
    });

    test("does not clear when the confirmation is declined", async () => {
        swalFire.mockResolvedValueOnce({ isConfirmed: false });
        render(
            <SelectMultiple
                title="Profs"
                all_features={allFeatures}
                isMulti
                features={[1]}
            />
        );

        await userEvent.click(screen.getByTestId("clear"));

        expect(screen.getByTestId("selected-count")).toHaveTextContent("1");
    });

    test("clears without confirmation when confirmBeforeClear is false", async () => {
        render(
            <SelectMultiple
                title="Profs"
                all_features={allFeatures}
                isMulti
                features={[1]}
                confirmBeforeClear={false}
            />
        );

        await userEvent.click(screen.getByTestId("clear"));

        expect(swalFire).not.toHaveBeenCalled();
        expect(screen.getByTestId("selected-count")).toHaveTextContent("0");
    });
});
