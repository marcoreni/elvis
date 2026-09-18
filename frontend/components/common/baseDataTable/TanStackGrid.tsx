import React, {useEffect, useMemo, useRef, useState} from "react";
import {
    ColumnDef,
    ColumnFiltersState,
    PaginationState,
    RowData,
    SortingState,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table";
import fscreen from "fscreen";
import {useTranslation} from "react-i18next";

// TanStack's `meta` bag is an empty interface by design, meant to be augmented by the consuming
// app -- see https://tanstack.com/table/v8/docs/api/core/column-def#meta. Used below instead of
// `size` for column width: TanStack defaults every column's `size` to 150 whether or not one is
// set, so reading it back at render time couldn't distinguish "explicit width" from "default".
declare module "@tanstack/react-table" {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends RowData, TValue> {
        width?: number;
    }
}

const coreRowModel = getCoreRowModel();

// Column defs here use the v6 react-table shape (Header/accessor/Cell/sortable/filterable/width)
// so callers didn't need to change when this wrapper moved to TanStack Table v8 internally --
// see docs/Modernization-Roadmap.md item 13. Row shape is intentionally left loose (`any`): every
// real caller has its own ad hoc row type, and this is a thin adapter over them, not a place
// that benefits from generic row-type inference.
export interface LegacyColumn {
    id?: string;
    Header?: React.ReactNode;
    // A dot-path string (TanStack supports nested accessorKey paths natively) or a function.
    accessor?: string | ((row: any) => unknown);
    Cell?: (props: {value: unknown; original: any; index: number}) => React.ReactNode;
    sortable?: boolean;
    filterable?: boolean;
    width?: number;
}

// ColumnDef's own type is a discriminated union keyed on how a column identifies itself
// (string header vs. id vs. accessorKey) -- awkward to satisfy incrementally when building one
// dynamically from a v6-shaped column def, so this builds a loose intermediate and casts once at
// the end (the standard escape hatch for dynamic column construction; TanStack's own docs use the
// same pattern for non-literal ColumnDef objects).
interface MutableColumnDef {
    id?: string;
    header?: ColumnDef<any>["header"];
    enableSorting?: boolean;
    enableColumnFilter?: boolean;
    accessorFn?: (row: any) => unknown;
    accessorKey?: string;
    cell?: ColumnDef<any>["cell"];
    meta?: {width?: number};
}

function toTanStackColumn(column: LegacyColumn): ColumnDef<any> {
    const tanstackColumn: MutableColumnDef = {
        id: column.id ?? (typeof column.accessor === "string" ? column.accessor : undefined),
        header: column.Header as ColumnDef<any>["header"],
        enableSorting: column.sortable !== false,
        enableColumnFilter: column.filterable !== false,
    };

    if (typeof column.accessor === "function") {
        tanstackColumn.accessorFn = column.accessor;
    } else if (typeof column.accessor === "string") {
        tanstackColumn.accessorKey = column.accessor;
    }

    if (column.Cell) {
        const cellRenderer = column.Cell;
        tanstackColumn.cell = ctx => cellRenderer({
            value: ctx.getValue(),
            original: ctx.row.original,
            index: ctx.row.index,
        });
    }

    if (column.width) {
        tanstackColumn.meta = {width: column.width};
    }

    return tanstackColumn as ColumnDef<any>;
}

export interface FetchDataFilter {
    page: number;
    pageSize: number;
    sorted: SortingState;
    filtered: ColumnFiltersState;
}

interface TanStackGridProps {
    /** Unique per table; used for data-testid and the fullscreen toggle event. */
    tableName: string;
    /** v6-shaped column defs, including any "actions" column the caller already built. */
    columns: LegacyColumn[];
    /** Current page's rows. */
    data: any[];
    loading: boolean;
    /** Total page count, as reported by the server. */
    pages: number | null;
    /** Shown instead of the translated noDataText when set. */
    errorMessage?: string | null;
    /**
     * Called with {page, pageSize, sorted, filtered} whenever pagination/sorting/filtering state
     * changes, including once on mount.
     */
    onFetchData: (filter: FetchDataFilter) => void;
    /** Initial sort state, e.g. [{id: "name", desc: true}]. */
    defaultSorted?: {id: string; desc?: boolean}[];
}

/**
 * TanStackGrid — the headless-table + pagination-footer machinery shared by both BaseDataTable
 * wrappers (common/baseDataTable/BaseDataTable.jsx, function-based, and
 * parameters/BaseDataTable.jsx, class-based). Both wrappers own CRUD state/actions themselves and
 * just render this for the actual grid; see docs/Modernization-Roadmap.md item 13.
 */
export default function TanStackGrid({
    tableName,
    columns,
    data,
    loading,
    pages,
    errorMessage,
    onFetchData,
    defaultSorted,
}: TanStackGridProps) {
    const {t} = useTranslation("common");

    const [sorting, setSorting] = useState<SortingState>(
        () => (defaultSorted || []).map(s => ({id: s.id, desc: !!s.desc})),
    );
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [pagination, setPagination] = useState<PaginationState>({pageIndex: 0, pageSize: 20});

    const tanstackColumns = useMemo(() => columns.map(toTanStackColumn), [columns]);

    const table = useReactTable({
        data,
        columns: tanstackColumns,
        state: {sorting, columnFilters, pagination},
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onPaginationChange: setPagination,
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        pageCount: pages ?? -1,
        getCoreRowModel: coreRowModel,
    });

    // TanStack's own getCoreRowModel() memoization (keyed on table.options.data) doesn't reliably
    // invalidate here: confirmed live that table.options.data updates to the new array correctly
    // (same reference the caller's own state holds) but table.getCoreRowModel() keeps returning
    // the stale row set across many consecutive renders, until the cached getter is discarded.
    // Root cause traced to render *frequency*, not this component's own logic: callers embedded in
    // a react-final-form form (ActivityRefBasics.jsx, EditFormule.jsx) re-render on every field
    // interaction anywhere in the whole multi-tab form, and rebuild their `dataService`/`columns`
    // fresh in every render() -- so this grid is churned through far more renders than its own data
    // changes would suggest, and TanStack's cache (a plain mutable object kept outside React state,
    // updated via a side effect during render) gets out of sync somewhere in that churn. A
    // `data`-changed ref guard to only reset when needed proved unreliable under that same churn
    // (some intervening render already "consumes" the change the guard was watching for).
    // Resetting unconditionally sidesteps the whole render-ordering question and is cheap
    // regardless: this only reconstructs lightweight row-wrapper objects (no cell rendering, no DOM
    // work) once per render of *this* grid, not once per unrelated re-render elsewhere in the form
    // -- negligible even at a few hundred rows. The real long-term fix is upstream: stabilize
    // `dataService`/`columns` identity in those callers (build once, not on every render) so this
    // grid isn't re-rendered nearly as often in the first place -- flagged as its own follow-up
    // (see docs/Modernization-Roadmap.md item 13), out of scope here.
    delete (table as {_getCoreRowModel?: unknown})._getCoreRowModel;

    useEffect(() => {
        // Server-driven table: whenever page/sort/filter state changes, re-fetch. `onFetchData`
        // isn't a dep -- it's redefined every render by the caller, and including it would
        // re-trigger this effect on every unrelated state change instead of only on real
        // page/sort/filter changes.
        onFetchData({
            page: pagination.pageIndex,
            pageSize: pagination.pageSize,
            sorted: sorting,
            filtered: columnFilters,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination, sorting, columnFilters]);

    const fullScreenRef = useRef<HTMLDivElement | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        const handleFullScreenChange = () =>
            setIsFullScreen(fscreen.fullscreenElement === fullScreenRef.current);
        const handleToggle = () => {
            if (fscreen.fullscreenElement) {
                fscreen.exitFullscreen().then(() => fscreen.requestFullscreen(fullScreenRef.current as Element));
            } else if (fullScreenRef.current) {
                fscreen.requestFullscreen(fullScreenRef.current);
            }
        };

        fscreen.addEventListener("fullscreenchange", handleFullScreenChange, false);
        window.addEventListener(`reactTableFullscreen${tableName}Change`, handleToggle, false);
        return () => {
            fscreen.removeEventListener("fullscreenchange", handleFullScreenChange, false);
            window.removeEventListener(`reactTableFullscreen${tableName}Change`, handleToggle, false);
        };
    }, [tableName]);

    const columnCount = tanstackColumns.length || 1;
    const headers = table.getHeaderGroups()[0].headers;

    return (
        <div
            ref={fullScreenRef}
            data-testid={tableName}
            className={isFullScreen ? "fullscreen fullscreen-enabled" : undefined}
            style={isFullScreen ? {height: "100%", width: "100%"} : undefined}
        >
            <table className="table">
                <thead>
                <tr>
                    {headers.map(header => (
                        <th
                            key={header.id}
                            style={header.column.columnDef.meta?.width
                                ? {width: header.column.columnDef.meta.width}
                                : undefined}
                            onClick={header.column.getCanSort()
                                ? header.column.getToggleSortingHandler() ?? undefined
                                : undefined}
                            className={header.column.getCanSort() ? "sortable" : undefined}
                        >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{asc: " ▲", desc: " ▼"}[header.column.getIsSorted() as string] ?? ""}
                        </th>
                    ))}
                </tr>
                <tr>
                    {headers.map(header => (
                        <th key={header.id}>
                            {header.column.getCanFilter() &&
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={(header.column.getFilterValue() as string) ?? ""}
                                    onChange={e => header.column.setFilterValue(e.target.value)}
                                />}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {loading ? (
                    <tr>
                        <td colSpan={columnCount} className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="sr-only">{t("reactTable.loadingText")}</span>
                            </div>
                        </td>
                    </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                    <tr>
                        <td colSpan={columnCount}>
                            {errorMessage || t("reactTable.noDataText")}
                        </td>
                    </tr>
                ) : (
                    table.getRowModel().rows.map(row => (
                        <tr key={row.id}>
                            {row.getVisibleCells().map(cell => (
                                <td key={cell.id}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))
                )}
                </tbody>
            </table>

            <div className="d-flex justify-content-between align-items-center">
                <div>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary mr-1"
                        disabled={!table.getCanPreviousPage()}
                        onClick={() => table.previousPage()}
                    >
                        {t("reactTable.previousText")}
                    </button>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        disabled={!table.getCanNextPage()}
                        onClick={() => table.nextPage()}
                    >
                        {t("reactTable.nextText")}
                    </button>
                </div>
                <div>
                    {t("reactTable.pageText")} {pagination.pageIndex + 1} {t("reactTable.ofText")}{" "}
                    {Math.max(pages || 1, 1)}
                </div>
                <div>{t("baseDataTable.resultsCount", {count: data.length})}</div>
            </div>
        </div>
    );
}
