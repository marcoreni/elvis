// Regression tests for bugs found via live QA and a follow-up code review while migrating item 13
// batch 3 (docs/Modernization-Roadmap.md), all with zero prior coverage since no earlier
// consumer's own test exercised these paths for real (batches 1-2 reach Cell/SubComponent via a
// mocked-grid stub, never through a real mounted TanStackGrid):
//
//  - A v6-shaped column whose `accessor` returns JSX directly (legal there, no `Cell` required)
//    rendered as the literal string "[object Object]": TanStack's own default `cell` renderer
//    does `` `${renderValue()}` ``, which stringifies a React element instead of rendering it.
//  - Clicking the expander column's toggle button silently did nothing: TanStack's default
//    `getRowCanExpand` only allows expanding rows that already have real `subRows`, which none of
//    these flat-record rows do -- `renderSubComponent` is used purely as a "reveal extra content"
//    toggle, not real row hierarchy.
//  - A column with no `accessor` at all (v6 allowed this -- a `Filter`/`Cell` reading `original`
//    directly, e.g. a "select all" checkbox living in the Filter slot, or a payer-name text
//    filter) silently lost its entire filter row *and* its sortable header: TanStack's own
//    `getCanFilter()`/`getCanSort()` both require a real `accessorFn` internally, which v6 never
//    did. Found by a follow-up code review, not by live QA -- the Cell still rendered fine (it
//    reads `original`, not the accessor value), so the missing filter/sort UI was easy to miss.
//
// All fixed in TanStackGrid itself, so covered here directly rather than through any one consumer.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
// vitest.setup.js already imports this at runtime; needed again here so tsc's type-checker (which
// doesn't process setupFiles) sees jest-dom's matcher augmentation of vitest's `Assertion` type.
import "@testing-library/jest-dom/vitest";
import i18n from "../../../i18n";
import TanStackGrid, { LegacyColumn } from "./TanStackGrid";

const noop = () => {};

beforeEach(async () => {
    await i18n.changeLanguage("fr");
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("TanStackGrid — basic render", () => {
    const columns: LegacyColumn[] = [
        { id: "id", Header: "#", accessor: "id" },
        { id: "label", Header: "Label", accessor: "label" },
    ];

    test("renders headers and row data from a plain string accessor", () => {
        render(
            <TanStackGrid
                tableName="table-smoke"
                columns={columns}
                data={[{ id: 1, label: "Zephyr" }]}
                loading={false}
                pages={1}
                onFetchData={noop}
            />
        );

        expect(screen.getByText("#")).toBeInTheDocument();
        expect(screen.getByText("Label")).toBeInTheDocument();
        expect(screen.getByText("Zephyr")).toBeInTheDocument();
    });

    test("shows the translated empty state when data is empty", () => {
        render(
            <TanStackGrid
                tableName="table-smoke-empty"
                columns={columns}
                data={[]}
                loading={false}
                pages={1}
                onFetchData={noop}
            />
        );

        expect(screen.getByText("Aucune donnée")).toBeInTheDocument();
    });
});

describe("TanStackGrid — function accessor returning JSX (no Cell)", () => {
    test('renders the JSX node, not the literal string "[object Object]"', () => {
        const columns: LegacyColumn[] = [
            {
                id: "label",
                Header: "Site",
                accessor: (row: { id: number; label: string }) => (
                    <a href={`/rooms?location=${row.id}`}>{row.label}</a>
                ),
            },
        ];

        render(
            <TanStackGrid
                tableName="table-jsx-accessor"
                columns={columns}
                data={[{ id: 2, label: "my location" }]}
                loading={false}
                pages={1}
                onFetchData={noop}
            />
        );

        const link = screen.getByRole("link", { name: "my location" });
        expect(link).toHaveAttribute("href", "/rooms?location=2");
        expect(screen.queryByText("[object Object]")).not.toBeInTheDocument();
    });
});

describe("TanStackGrid — renderSubComponent (expander column)", () => {
    const columns: LegacyColumn[] = [
        { id: "label", Header: "Label", accessor: "label" },
    ];

    test("clicking the expander toggle actually expands and shows the sub-content", async () => {
        render(
            <TanStackGrid
                tableName="table-expander"
                columns={columns}
                data={[{ id: 1, label: "Zephyr" }]}
                loading={false}
                pages={1}
                onFetchData={noop}
                renderSubComponent={(row) => (
                    <div>details for {row.original.label}</div>
                )}
            />
        );

        expect(
            screen.queryByText("details for Zephyr")
        ).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "▶" }));
        expect(screen.getByText("details for Zephyr")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "▼" }));
        expect(
            screen.queryByText("details for Zephyr")
        ).not.toBeInTheDocument();
    });

    test("a renderSubComponent returning null for some rows still renders (v6 parity: the expander column is shown for every row regardless of what it returns)", async () => {
        render(
            <TanStackGrid
                tableName="table-expander-null"
                columns={columns}
                data={[{ id: 1, label: "Zephyr" }]}
                loading={false}
                pages={1}
                onFetchData={noop}
                renderSubComponent={() => null}
            />
        );

        await userEvent.click(screen.getByRole("button", { name: "▶" }));
        expect(screen.getByRole("button", { name: "▼" })).toBeInTheDocument();
    });
});

describe("TanStackGrid — columns with no accessor keep their filter/sort UI", () => {
    test("a custom Filter renders even without an accessor (e.g. a select-all checkbox column)", () => {
        const columns: LegacyColumn[] = [
            {
                id: "selection",
                Header: "",
                sortable: false,
                Filter: () => <input type="checkbox" aria-label="select all" />,
            },
            { id: "label", Header: "Label", accessor: "label" },
        ];

        render(
            <TanStackGrid
                tableName="table-no-accessor-filter"
                columns={columns}
                data={[{ id: 1, label: "Zephyr" }]}
                loading={false}
                pages={1}
                onFetchData={noop}
            />
        );

        expect(
            screen.getByRole("checkbox", { name: "select all" })
        ).toBeInTheDocument();
    });

    test("the default text filter renders for an accessor-less, non-custom-Filter column", () => {
        const columns: LegacyColumn[] = [
            {
                id: "payer_name",
                Header: "Payer",
                Cell: ({ original }) => original.name,
            },
        ];

        render(
            <TanStackGrid
                tableName="table-no-accessor-default-filter"
                columns={columns}
                data={[{ id: 1, name: "Zephyr" }]}
                loading={false}
                pages={1}
                onFetchData={noop}
            />
        );

        expect(screen.getByText("Zephyr")).toBeInTheDocument();
        expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    test("an accessor-less column stays sortable (clickable header) unless sortable: false", () => {
        const columns: LegacyColumn[] = [
            {
                id: "payer_name",
                Header: "Payer",
                Cell: ({ original }) => original.name,
            },
        ];

        render(
            <TanStackGrid
                tableName="table-no-accessor-sortable"
                columns={columns}
                data={[{ id: 1, name: "Zephyr" }]}
                loading={false}
                pages={1}
                onFetchData={noop}
            />
        );

        expect(screen.getByText("Payer").closest("th")).toHaveClass("sortable");
    });
});
