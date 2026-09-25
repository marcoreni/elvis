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
import type { SortingState } from "@tanstack/react-table";
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

// Batch 4a (docs/Modernization-Roadmap.md item 13): `manual={false}` opts a table with no backend
// pagination endpoint into TanStack's own client-side sorting/filtering/pagination instead of the
// manual* + onFetchData round-trip every batch 1-3 caller uses. Every test above passes no
// `manual` prop at all, so they continue exercising the (unchanged) manual=true default -- these
// are the first tests of manual=false itself.
describe("TanStackGrid — client-side mode (manual=false)", () => {
    const columns: LegacyColumn[] = [
        { id: "label", Header: "Label", accessor: "label" },
    ];

    test("clicking a sortable header re-orders rendered rows client-side", async () => {
        render(
            <TanStackGrid
                tableName="table-client-sort"
                manual={false}
                columns={columns}
                data={[
                    { id: 1, label: "Zephyr" },
                    { id: 2, label: "Alpha" },
                    { id: 3, label: "Mercury" },
                ]}
                loading={false}
                pages={null}
            />
        );

        const cellTexts = () =>
            screen.getAllByRole("cell").map((c) => c.textContent);
        expect(cellTexts()).toEqual(["Zephyr", "Alpha", "Mercury"]);

        await userEvent.click(
            screen.getByRole("columnheader", { name: /Label/ })
        );
        expect(cellTexts()).toEqual(["Alpha", "Mercury", "Zephyr"]);

        await userEvent.click(
            screen.getByRole("columnheader", { name: /Label/ })
        );
        expect(cellTexts()).toEqual(["Zephyr", "Mercury", "Alpha"]);
    });

    test("typing in a column's filter input narrows rendered rows client-side", async () => {
        render(
            <TanStackGrid
                tableName="table-client-filter"
                manual={false}
                columns={columns}
                data={[
                    { id: 1, label: "Zephyr" },
                    { id: 2, label: "Alpha" },
                    { id: 3, label: "Zeta" },
                ]}
                loading={false}
                pages={null}
            />
        );

        expect(screen.getAllByRole("cell")).toHaveLength(3);

        await userEvent.type(screen.getByRole("textbox"), "Ze");

        expect(screen.getAllByRole("cell").map((c) => c.textContent)).toEqual([
            "Zephyr",
            "Zeta",
        ]);
    });

    test("pagination reflects the real client-side row count, ignoring the server-reported `pages` prop", () => {
        const data = Array.from({ length: 25 }, (_, i) => ({
            id: i,
            label: `Row ${i}`,
        }));

        render(
            <TanStackGrid
                tableName="table-client-pagination"
                manual={false}
                columns={columns}
                data={data}
                loading={false}
                pages={999} // bogus server value -- must be ignored in client mode
            />
        );

        // Default uncontrolled pageSize is 20 -> 25 rows spans 2 pages, not `pages={999}`.
        expect(screen.getByText("Page 1 sur 2")).toBeInTheDocument();
        expect(screen.getAllByRole("cell")).toHaveLength(20);
    });

    test('the "N results" footer reflects the filtered row count in client mode, not the raw data length', async () => {
        render(
            <TanStackGrid
                tableName="table-client-resultscount"
                manual={false}
                columns={columns}
                data={[
                    { id: 1, label: "Zephyr" },
                    { id: 2, label: "Alpha" },
                    { id: 3, label: "Zeta" },
                ]}
                loading={false}
                pages={null}
            />
        );

        expect(screen.getByText("3 résultats")).toBeInTheDocument();

        await userEvent.type(screen.getByRole("textbox"), "Ze");

        expect(screen.getByText("2 résultats")).toBeInTheDocument();
        expect(screen.queryByText("3 résultats")).not.toBeInTheDocument();
    });
});

// Batch 4b (docs/Modernization-Roadmap.md item 13): three new props added to support the
// standard-tables migration -- `showPagination` (hide the footer entirely), `filterable` /
// `sortable` (table-wide overrides forcing every column's filter/sort UI off at once), and
// `noDataText` (override the generic translated empty-state string).
describe("TanStackGrid — showPagination", () => {
    const columns: LegacyColumn[] = [
        { id: "label", Header: "Label", accessor: "label" },
    ];

    test("defaults to true: the pagination footer (prev/next + page count + results count) renders", () => {
        render(
            <TanStackGrid
                tableName="table-pagination-default"
                columns={columns}
                data={[{ id: 1, label: "Zephyr" }]}
                loading={false}
                pages={1}
                onFetchData={noop}
            />
        );

        expect(
            screen.getByRole("button", { name: "Précédent" })
        ).toBeInTheDocument();
        expect(screen.getByText("Page 1 sur 1")).toBeInTheDocument();
        expect(screen.getByText("1 résultat")).toBeInTheDocument();
    });

    test("showPagination={false} hides the footer entirely", () => {
        render(
            <TanStackGrid
                tableName="table-pagination-hidden"
                columns={columns}
                data={[{ id: 1, label: "Zephyr" }]}
                loading={false}
                pages={1}
                onFetchData={noop}
                showPagination={false}
            />
        );

        expect(
            screen.queryByRole("button", { name: "Précédent" })
        ).not.toBeInTheDocument();
        expect(screen.queryByText(/Page 1/)).not.toBeInTheDocument();
        expect(screen.queryByText(/résultat/)).not.toBeInTheDocument();
    });
});

describe("TanStackGrid — table-wide filterable/sortable overrides", () => {
    // Column itself asks for both -- the table-wide prop must win regardless.
    const columns: LegacyColumn[] = [
        {
            id: "label",
            Header: "Label",
            accessor: "label",
            sortable: true,
            filterable: true,
        },
    ];

    test("filterable={false} removes the filter row for every column, even one with filterable: true", () => {
        render(
            <TanStackGrid
                tableName="table-not-filterable"
                columns={columns}
                data={[{ id: 1, label: "Zephyr" }]}
                loading={false}
                pages={1}
                onFetchData={noop}
                filterable={false}
            />
        );

        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    test("sortable={false} removes the sortable header class/click-handler for every column, even one with sortable: true", () => {
        render(
            <TanStackGrid
                tableName="table-not-sortable"
                columns={columns}
                data={[{ id: 1, label: "Zephyr" }]}
                loading={false}
                pages={1}
                onFetchData={noop}
                sortable={false}
            />
        );

        expect(screen.getByText("Label").closest("th")).not.toHaveClass(
            "sortable"
        );
    });

    test("defaults (omitted): filter row and sortable header both still render", () => {
        render(
            <TanStackGrid
                tableName="table-filter-sort-default"
                columns={columns}
                data={[{ id: 1, label: "Zephyr" }]}
                loading={false}
                pages={1}
                onFetchData={noop}
            />
        );

        expect(screen.getByRole("textbox")).toBeInTheDocument();
        expect(screen.getByText("Label").closest("th")).toHaveClass("sortable");
    });
});

describe("TanStackGrid — noDataText", () => {
    const columns: LegacyColumn[] = [
        { id: "label", Header: "Label", accessor: "label" },
    ];

    test("overrides the generic translated empty-state string when set", () => {
        render(
            <TanStackGrid
                tableName="table-nodatatext"
                columns={columns}
                data={[]}
                loading={false}
                pages={1}
                onFetchData={noop}
                noDataText="Rien à afficher ici"
            />
        );

        expect(screen.getByText("Rien à afficher ici")).toBeInTheDocument();
        expect(screen.queryByText("Aucune donnée")).not.toBeInTheDocument();
    });

    test("errorMessage still wins over noDataText when both are set", () => {
        render(
            <TanStackGrid
                tableName="table-nodatatext-errormessage"
                columns={columns}
                data={[]}
                loading={false}
                pages={1}
                onFetchData={noop}
                noDataText="Rien à afficher ici"
                errorMessage="Boom"
            />
        );

        expect(screen.getByText("Boom")).toBeInTheDocument();
        expect(
            screen.queryByText("Rien à afficher ici")
        ).not.toBeInTheDocument();
    });
});

// item 13, final batch (docs/Modernization-Roadmap.md, activityApplications/summary/Activity.jsx):
// `getRowId` and controlled `expanded`/`onExpandedChange`, added so that table's suggestion-editor
// row stays expanded by the suggestion's own id across a reorder, instead of TanStack's default
// index-keyed row id (which would instead keep "whatever's now at that index" expanded).
describe("TanStackGrid — getRowId keeps expansion pinned to a row's content across a data reorder", () => {
    function ReorderableWrapper() {
        const [data, setData] = React.useState([
            { id: 1, label: "Alpha" },
            { id: 2, label: "Zephyr" },
        ]);
        return (
            <>
                <button onClick={() => setData([data[1], data[0]])}>
                    reorder
                </button>
                <TanStackGrid
                    tableName="table-getrowid-reorder"
                    columns={[
                        { id: "label", Header: "Label", accessor: "label" },
                    ]}
                    data={data}
                    loading={false}
                    pages={1}
                    onFetchData={noop}
                    getRowId={(row: { id: number; label: string }) =>
                        String(row.id)
                    }
                    renderSubComponent={(row) => (
                        <div>details for {row.original.label}</div>
                    )}
                />
            </>
        );
    }

    test("expanding a row, then reordering the data array, keeps the same row's content expanded", async () => {
        render(<ReorderableWrapper />);

        // Expand the second row (Zephyr, id 2, index 1).
        const toggles = screen.getAllByRole("button", { name: "▶" });
        await userEvent.click(toggles[1]);
        expect(screen.getByText("details for Zephyr")).toBeInTheDocument();

        // Reorder: Zephyr moves from index 1 to index 0, Alpha from 0 to 1.
        await userEvent.click(screen.getByRole("button", { name: "reorder" }));

        // Still pinned to Zephyr's own id -- without getRowId, TanStack's default index-based row
        // id would instead leave whatever is now at index 1 (Alpha) expanded.
        expect(screen.getByText("details for Zephyr")).toBeInTheDocument();
        expect(screen.queryByText("details for Alpha")).not.toBeInTheDocument();
    });
});

describe("TanStackGrid — controlled expanded/onExpandedChange", () => {
    const columns: LegacyColumn[] = [
        { id: "label", Header: "Label", accessor: "label" },
    ];

    function ControlledWrapper() {
        const [expanded, setExpanded] = React.useState({});
        return (
            <TanStackGrid
                tableName="table-controlled-expanded"
                columns={columns}
                data={[{ id: 1, label: "Zephyr" }]}
                loading={false}
                pages={1}
                onFetchData={noop}
                renderSubComponent={(row) => (
                    <div>details for {row.original.label}</div>
                )}
                expanded={expanded}
                onExpandedChange={setExpanded}
            />
        );
    }

    test("toggling the expander round-trips through the caller's own expanded state", async () => {
        render(<ControlledWrapper />);

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

    test("an expanded value set by the caller (not from a click) expands the table too, proving it's controlled", () => {
        render(
            <TanStackGrid
                tableName="table-controlled-expanded-external"
                columns={columns}
                data={[{ id: 1, label: "Zephyr" }]}
                loading={false}
                pages={1}
                onFetchData={noop}
                renderSubComponent={(row) => (
                    <div>details for {row.original.label}</div>
                )}
                expanded={{ "0": true }}
                onExpandedChange={noop}
            />
        );

        expect(screen.getByText("details for Zephyr")).toBeInTheDocument();
    });
});

describe("TanStackGrid — sorting never clears entirely (enableSortingRemoval: false)", () => {
    test("a third click on a sortable header keeps sorting non-empty instead of cycling to []", async () => {
        const columns: LegacyColumn[] = [
            { id: "label", Header: "Label", accessor: "label" },
        ];
        const calls: SortingState[] = [];

        render(
            <TanStackGrid
                tableName="table-sort-removal"
                columns={columns}
                data={[{ id: 1, label: "Zephyr" }]}
                loading={false}
                pages={1}
                onFetchData={({ sorted }) => calls.push(sorted)}
            />
        );

        const header = screen.getByText("Label");
        await userEvent.click(header); // asc
        await userEvent.click(header); // desc
        await userEvent.click(header); // would be "unsorted" ([]) by TanStack's default

        // Every real caller sends `sorted[0]` straight into the request body; an empty array
        // makes that `undefined`, which every backend #list_json handler chokes on unguarded.
        const lastCall = calls[calls.length - 1];
        expect(lastCall.length).toBeGreaterThan(0);
        expect(lastCall[0].id).toBe("label");
    });
});
