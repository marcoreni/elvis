import React, {useEffect, useMemo, useRef, useState} from "react";
import {
    ColumnDef,
    ColumnFiltersState,
    ExpandedState,
    PaginationState,
    RowData,
    SortingState,
    Updater,
    flexRender,
    getCoreRowModel,
    getExpandedRowModel,
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
        Filter?: LegacyColumnFilterRenderer;
    }
}

type LegacyColumnFilterRenderer =
    (props: {filter?: {value: unknown}; onChange: (value: unknown) => void}) => React.ReactNode;

const coreRowModel = getCoreRowModel();
const expandedRowModel = getExpandedRowModel();

// Was frontend/components/ReactTableFullScreen.jsx's export -- moved here once every consumer of
// that v6 wrapper had migrated to TanStackGrid (item 13 batch 3), since this is the component that
// actually listens for the event this dispatches.
export function goFullScreen(tableName: string) {
    window.dispatchEvent(new Event(`reactTableFullscreen${tableName}Change`));
}

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
    /** Custom filter-row UI for this column (e.g. a <select> of fixed options), v6's `Filter`. */
    Filter?: LegacyColumnFilterRenderer;
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
    meta?: {width?: number; Filter?: LegacyColumnFilterRenderer};
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
    } else {
        // Without an explicit `cell`, TanStack's own default renders `${renderValue()}` -- a
        // plain string template. Harmless for a primitive accessor result, but a v6 `accessor`
        // returning JSX directly (legal there, and used by a couple of real columns) would get
        // silently coerced to the literal string "[object Object]" instead of rendered. Always
        // render the accessed value as a node instead of leaving that default in place.
        tanstackColumn.cell = ctx => ctx.getValue() as React.ReactNode;
    }

    if (column.width || column.Filter) {
        tanstackColumn.meta = {width: column.width, Filter: column.Filter};
    }

    return tanstackColumn as ColumnDef<any>;
}

const EXPANDER_COLUMN_ID = "__expander";

function buildExpanderColumn(): ColumnDef<any> {
    return {
        id: EXPANDER_COLUMN_ID,
        header: () => null,
        enableSorting: false,
        enableColumnFilter: false,
        meta: {width: 32},
        cell: ({row}) => (
            <button
                type="button"
                className="btn btn-link btn-sm p-0"
                onClick={row.getToggleExpandedHandler()}
            >
                {row.getIsExpanded() ? "▼" : "▶"}
            </button>
        ),
    } as ColumnDef<any>;
}

export interface FetchDataFilter {
    page: number;
    pageSize: number;
    sorted: SortingState;
    filtered: ColumnFiltersState;
}

// Resolves a TanStack `Updater<T>` (either a plain value or a `(old: T) => T` functional update,
// same convention as `useState`'s setter) against the value currently held -- needed because
// `useControllableState` below has to support the same calling convention TanStack itself uses
// internally (`table.setPageSize()`, a sort-header click, etc. all call `onXChange` this way).
function resolveUpdater<T>(updater: Updater<T>, current: T): T {
    return typeof updater === "function" ? (updater as (old: T) => T)(current) : updater;
}

// Standard "controlled if a value prop is passed, otherwise uncontrolled" pattern. Batches 1-2's
// callers (and this batch's simpler ones) never pass `controlled`/`onChange`, so they get plain
// internal state, unchanged. Batch 3's more complex tables (DuePaymentList, PaymentList,
// CheckList, LessonList) need externally-resettable pagination/sorting/filtering -- e.g. a "reset
// filters" button elsewhere on the page -- which TanStack (like v6 before it) supports via
// controlled state: the parent owns the value and this grid just renders it.
function useControllableState<T>(
    controlled: T | undefined,
    onChange: ((value: T) => void) | undefined,
    initial: T,
): [T, (updater: Updater<T>) => void] {
    const [internal, setInternal] = useState<T>(initial);
    const isControlled = controlled !== undefined;
    const value = isControlled ? controlled : internal;
    const setValue = (updater: Updater<T>) => {
        const resolved = resolveUpdater(updater, value);
        if (onChange) onChange(resolved);
        if (!isControlled) setInternal(resolved);
    };
    return [value, setValue];
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
     * Uncontrolled mode only: called with {page, pageSize, sorted, filtered} whenever
     * pagination/sorting/filtering state changes, including once on mount. Omit this and pass
     * `pagination`/`sorting`/`columnFilters` (+ their `onXChange` counterparts) instead for
     * controlled mode, where the caller owns that state itself (e.g. to support an external
     * "reset filters" button) and is responsible for fetching on its own state changes.
     */
    onFetchData?: (filter: FetchDataFilter) => void;
    /** Uncontrolled mode only: initial sort state, e.g. [{id: "name", desc: true}]. */
    defaultSorted?: {id: string; desc?: boolean}[];
    /** Uncontrolled mode only: initial column-filter state, e.g. [{id: "role", value: "student"}]. */
    defaultFiltered?: ColumnFiltersState;
    /** Pad the tbody with blank rows until it reaches this many, matching v6's `minRows`. */
    minRows?: number;
    /** When set, renders an expander column; expanding a row shows this under it (v6's `SubComponent`). */
    renderSubComponent?: (row: {original: any; index: number}) => React.ReactNode;
    /** Per-row `<tr>` props (e.g. conditional styling), keyed off the row's data -- v6's `getTrProps`. */
    getRowProps?: (original: any) => React.HTMLAttributes<HTMLTableRowElement> | undefined;
    /** Renders a page-size `<select>` in the footer when set. */
    pageSizeOptions?: number[];
    /** Extra inline style merged onto the root div (e.g. a background color). */
    style?: React.CSSProperties;
    /** Controlled pagination -- see `onFetchData`. */
    pagination?: PaginationState;
    onPaginationChange?: (pagination: PaginationState) => void;
    /** Controlled sorting -- see `onFetchData`. */
    sorting?: SortingState;
    onSortingChange?: (sorting: SortingState) => void;
    /** Controlled column filters -- see `onFetchData`. */
    columnFilters?: ColumnFiltersState;
    onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
}

/**
 * TanStackGrid — the headless-table + pagination-footer machinery shared by both BaseDataTable
 * wrappers (common/baseDataTable/BaseDataTable.jsx, function-based, and
 * parameters/BaseDataTable.jsx, class-based) and, since batch 3, the standalone tables that need
 * expandable rows and/or externally-controlled pagination (docs/Modernization-Roadmap.md item 13).
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
    defaultFiltered,
    minRows,
    renderSubComponent,
    getRowProps,
    pageSizeOptions,
    style,
    pagination: controlledPagination,
    onPaginationChange,
    sorting: controlledSorting,
    onSortingChange,
    columnFilters: controlledColumnFilters,
    onColumnFiltersChange,
}: TanStackGridProps) {
    const {t} = useTranslation("common");

    const [sorting, setSorting] = useControllableState<SortingState>(
        controlledSorting,
        onSortingChange,
        (defaultSorted || []).map(s => ({id: s.id, desc: !!s.desc})),
    );
    const [columnFilters, setColumnFilters] = useControllableState<ColumnFiltersState>(
        controlledColumnFilters, onColumnFiltersChange, defaultFiltered || [],
    );
    const [pagination, setPagination] = useControllableState<PaginationState>(
        controlledPagination, onPaginationChange, {pageIndex: 0, pageSize: 20},
    );
    const [expanded, setExpanded] = useState<ExpandedState>({});

    const tanstackColumns = useMemo(() => {
        const mapped = columns.map(toTanStackColumn);
        return renderSubComponent ? [buildExpanderColumn(), ...mapped] : mapped;
    }, [columns, renderSubComponent]);

    const table = useReactTable({
        data,
        columns: tanstackColumns,
        state: {sorting, columnFilters, pagination, expanded},
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onPaginationChange: setPagination,
        onExpandedChange: setExpanded,
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        pageCount: pages ?? -1,
        getCoreRowModel: coreRowModel,
        getExpandedRowModel: expandedRowModel,
        // Rows here are flat records with no real `subRows` -- expansion is used purely as a
        // "toggle to reveal renderSubComponent's extra content" mechanism (v6's SubComponent),
        // not real row hierarchy. TanStack's default getRowCanExpand only allows expanding rows
        // that already have subRows, which makes the toggle handler a silent no-op otherwise.
        getRowCanExpand: () => true,
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
        // Controlled mode: the caller owns pagination/sorting/filtering state itself and fetches
        // on its own state changes (e.g. inside its onPaginationChange handler) -- nothing to do
        // here. Uncontrolled mode (no onFetchData either -- shouldn't normally happen, but avoids
        // a crash if it does): server-driven table, re-fetch whenever page/sort/filter changes.
        if (!onFetchData) return;
        onFetchData({
            page: pagination.pageIndex,
            pageSize: pagination.pageSize,
            sorted: sorting,
            filtered: columnFilters,
        });
        // `onFetchData` isn't a dep -- it's redefined every render by the caller, and including it
        // would re-trigger this effect on every unrelated state change instead of only on real
        // page/sort/filter changes.
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
    const rows = table.getRowModel().rows;
    const paddingRowCount = !loading && minRows ? Math.max(minRows - rows.length, 0) : 0;

    return (
        <div
            ref={fullScreenRef}
            data-testid={tableName}
            className={isFullScreen ? "fullscreen fullscreen-enabled" : undefined}
            style={isFullScreen ? {...style, height: "100%", width: "100%"} : style}
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
                    {headers.map(header => {
                        const CustomFilter = header.column.columnDef.meta?.Filter;
                        const filterValue = header.column.getFilterValue();
                        return (
                            <th key={header.id}>
                                {header.column.getCanFilter() && (
                                    CustomFilter ? (
                                        <CustomFilter
                                            filter={filterValue !== undefined ? {value: filterValue} : undefined}
                                            onChange={value => header.column.setFilterValue(value)}
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            value={(filterValue as string) ?? ""}
                                            onChange={e => header.column.setFilterValue(e.target.value)}
                                        />
                                    )
                                )}
                            </th>
                        );
                    })}
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
                ) : rows.length === 0 ? (
                    <tr>
                        <td colSpan={columnCount}>
                            {errorMessage || t("reactTable.noDataText")}
                        </td>
                    </tr>
                ) : (
                    <>
                        {rows.map(row => (
                            <React.Fragment key={row.id}>
                                <tr {...(getRowProps ? getRowProps(row.original) : undefined)}>
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                                {renderSubComponent && row.getIsExpanded() && (
                                    <tr>
                                        <td colSpan={columnCount}>
                                            {renderSubComponent({original: row.original, index: row.index})}
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                        {Array.from({length: paddingRowCount}).map((_, i) => (
                            <tr key={`pad-${i}`}>
                                {Array.from({length: columnCount}).map((__, j) => <td key={j}>&nbsp;</td>)}
                            </tr>
                        ))}
                    </>
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
                    {pageSizeOptions && (
                        <select
                            className="form-control form-control-sm d-inline-block w-auto ml-2"
                            value={pagination.pageSize}
                            onChange={e => table.setPageSize(Number(e.target.value))}
                        >
                            {pageSizeOptions.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    )}
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
