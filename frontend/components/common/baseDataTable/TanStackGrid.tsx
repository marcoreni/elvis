import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ColumnDef,
    ColumnFiltersState,
    ExpandedState,
    PaginationState,
    RowData,
    SortingState,
    Updater,
    flexRender,
    functionalUpdate,
    getCoreRowModel,
    getExpandedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import fscreen from "fscreen";
import { useTranslation } from "react-i18next";

// TanStack's `meta` bag is an empty interface by design, meant to be augmented by the consuming
// app -- see https://tanstack.com/table/v8/docs/api/core/column-def#meta. Used below instead of
// `size` for column width: TanStack defaults every column's `size` to 150 whether or not one is
// set, so reading it back at render time couldn't distinguish "explicit width" from "default".
declare module "@tanstack/react-table" {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface ColumnMeta<TData extends RowData, TValue> {
        width?: number;
        Filter?: LegacyColumnFilterRenderer;
        /** v6's per-column `style`/`className`, applied to the data `<td>` only -- v6's own Td
         * rendering (react-table/src/index.js) reads `column.style`/`column.className` there;
         * the header instead reads `column.headerClassName` (never `column.style`/`.className`)
         * so header scope is deliberately not replicated here. */
        style?: React.CSSProperties;
        className?: string;
    }
}

type LegacyColumnFilterRenderer = (props: {
    filter?: { value: unknown };
    onChange: (value: unknown) => void;
}) => React.ReactNode;

const coreRowModel = getCoreRowModel();
const expandedRowModel = getExpandedRowModel();
const sortedRowModel = getSortedRowModel();
const filteredRowModel = getFilteredRowModel();
const paginationRowModel = getPaginationRowModel();

// Was frontend/components/ReactTableFullScreen.jsx's export -- moved here once every consumer of
// that v6 wrapper had migrated to TanStackGrid (item 13 batch 3), since this is the component that
// actually listens for the event this dispatches.
export function goFullScreen(tableName: string) {
    window.dispatchEvent(new Event(`reactTableFullscreen${tableName}Change`));
}

// Column defs here use the v6 react-table shape (Header/accessor/Cell/sortable/filterable/width)
// so callers didn't need to change when this wrapper moved to TanStack Table v8 internally --
// see docs/Modernization-Roadmap.md item 13. Generic over the row type (`TRow`, defaulting to
// `any`) so a real TypeScript caller (e.g. StudentEvaluationsStats.tsx) gets a checked
// accessor/Cell, matching what it had with v6's own `Column<TRow>`; every other caller is a plain
// `.jsx` file with no static row type to parametrize with, and keeps compiling unchanged via the
// `any` default. `value` stays `unknown` (not `any`) per this repo's TS migration playbook
// (docs/Jsx-To-Tsx-Migration-Playbook.md §3, "eliminate `any`") -- callers narrow it with a cast
// at the point of use instead.
export interface LegacyColumn<TRow = any> {
    id?: string;
    Header?: React.ReactNode;
    // A dot-path string (TanStack supports nested accessorKey paths natively) or a function.
    accessor?: string | ((row: TRow) => unknown);
    Cell?: (props: {
        value: unknown;
        original: TRow;
        index: number;
    }) => React.ReactNode;
    /** Custom filter-row UI for this column (e.g. a <select> of fixed options), v6's `Filter`. */
    Filter?: LegacyColumnFilterRenderer;
    sortable?: boolean;
    filterable?: boolean;
    /** Explicit column width in px. `width` only -- v6's `maxWidth`/`minWidth` are not read here;
     * columns instead get a real natural width from `white-space: nowrap` + a `min-width` floor,
     * so the table can overflow (and scroll) instead of squeezing its own columns. Several
     * migrated columns still carry `maxWidth`/`minWidth` from their v6 defs -- inert, harmless to
     * leave, not cleaned up here. */
    width?: number;
    /** v6's per-column `style`/`className`, applied to the data `<td>` only (matching v6's own
     * scope -- see the ColumnMeta augmentation above). */
    style?: React.CSSProperties;
    className?: string;
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
    meta?: {
        width?: number;
        Filter?: LegacyColumnFilterRenderer;
        style?: React.CSSProperties;
        className?: string;
    };
}

function toTanStackColumn<TRow>(column: LegacyColumn<TRow>): ColumnDef<TRow> {
    const tanstackColumn: MutableColumnDef = {
        id:
            column.id ??
            (typeof column.accessor === "string" ? column.accessor : undefined),
        header: column.Header as ColumnDef<any>["header"],
        enableSorting: column.sortable !== false,
        enableColumnFilter: column.filterable !== false,
    };

    if (typeof column.accessor === "function") {
        tanstackColumn.accessorFn = column.accessor;
    } else if (typeof column.accessor === "string") {
        tanstackColumn.accessorKey = column.accessor;
    } else {
        // TanStack's own getCanFilter()/getCanSort() both require a real accessor internally,
        // unlike v6 where Filter/sortable were independent of accessor -- several real columns
        // (a "select all" checkbox living in the Filter slot, payer-name text filters, the
        // occupation dropdown) have no accessor at all (their Cell reads `original` directly)
        // but still need their filter/sort UI to render. A no-op accessor unblocks TanStack's
        // gates without affecting any real value lookup -- safe for a manualSorting/manualFiltering
        // table, where TanStack never actually sorts/filters rows using this value itself, only
        // tracks state and defers to the server. NOT safe for a client-mode table (manual={false}):
        // an accessor-less column left `filterable` (i.e. not explicitly `false`) there gets
        // TanStack's auto-picked `weakEquals` filterFn, which compares every row's `undefined`
        // value against the typed filter text and is always false -- the first keystroke empties
        // the whole table. Any accessor-less column on a client-mode table must set
        // `filterable: false` explicitly.
        tanstackColumn.accessorFn = () => undefined;
    }

    if (column.Cell) {
        const cellRenderer = column.Cell;
        tanstackColumn.cell = (ctx) =>
            cellRenderer({
                value: ctx.getValue(),
                original: ctx.row.original,
                index: ctx.row.index,
            });
    } else {
        // Without an explicit `cell`, TanStack's own default renders `${renderValue()}` -- a
        // plain string template. Harmless for a primitive accessor result, but a v6 `accessor`
        // returning JSX directly (legal there, and used by a couple of real columns) would get
        // silently coerced to the literal string "[object Object]" instead of rendered. Always
        // render the accessed value as a node instead of leaving that default in place. `?? null`
        // matters, not just belt-and-suspenders: an accessor-less column's value is always
        // `undefined` (see the no-op accessorFn above), and a cell renderer returning `undefined`
        // (rather than `null`) is a React error ("nothing was returned from render").
        tanstackColumn.cell = (ctx) =>
            (ctx.getValue() as React.ReactNode) ?? null;
    }

    if (column.width || column.Filter || column.style || column.className) {
        tanstackColumn.meta = {
            width: column.width,
            Filter: column.Filter,
            style: column.style,
            className: column.className,
        };
    }

    return tanstackColumn as ColumnDef<TRow>;
}

const EXPANDER_COLUMN_ID = "__expander";

function buildExpanderColumn(): ColumnDef<any> {
    return {
        id: EXPANDER_COLUMN_ID,
        header: () => null,
        enableSorting: false,
        enableColumnFilter: false,
        meta: { width: 32 },
        cell: ({ row }) => (
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

// Standard "controlled if a value prop is passed, otherwise uncontrolled" pattern. Batches 1-2's
// callers (and this batch's simpler ones) never pass `controlled`/`onChange`, so they get plain
// internal state, unchanged. Batch 3's more complex tables (DuePaymentList, PaymentList,
// CheckList, LessonList) need externally-resettable pagination/sorting/filtering -- e.g. a "reset
// filters" button elsewhere on the page -- which TanStack (like v6 before it) supports via
// controlled state: the parent owns the value and this grid just renders it.
function useControllableState<T>(
    controlled: T | undefined,
    onChange: ((value: T) => void) | undefined,
    initial: T
): [T, (updater: Updater<T>) => void] {
    const [internal, setInternal] = useState<T>(initial);
    const isControlled = controlled !== undefined;
    const value = isControlled ? controlled : internal;
    const setValue = (updater: Updater<T>) => {
        const resolved = functionalUpdate(updater, value);
        if (onChange) onChange(resolved);
        if (!isControlled) setInternal(resolved);
    };
    return [value, setValue];
}

interface TanStackGridProps<TRow = any> {
    /** Unique per table; used for data-testid and the fullscreen toggle event. */
    tableName: string;
    /** v6-shaped column defs, including any "actions" column the caller already built. */
    columns: LegacyColumn<TRow>[];
    /**
     * Current page's rows. TanStack's own row-model memoization is keyed on this array's
     * *reference*, not its contents -- a caller whose data source mutates an array in place
     * (`push`/`splice`) and hands back that same reference will see a stale table after a
     * create/delete, since nothing changed by reference. Real callers fetching fresh JSON per
     * request are unaffected (a new `response.json()` array every time); this bit two in-memory
     * mock DataServices (activityRef/NewActivityRefDataService.jsx,
     * formules/NewFormulePricingDataService.js) before their own `listData()` was fixed to return
     * a copy (`[...this.items]`) instead of the mutated original.
     */
    data: TRow[];
    loading: boolean;
    /** Total page count, as reported by the server. */
    pages: number | null;
    /**
     * Total row count across every page, as reported by the server, for the "N results" footer.
     * Falls back to the current page's own row count when omitted -- correct only when there's a
     * single page, wrong (under-reports) otherwise; most real callers already track this in their
     * own state (often called `total`/`rowsCount`) but don't all thread it through yet.
     */
    totalCount?: number;
    /** Shown instead of the translated noDataText when set. */
    errorMessage?: string | null;
    /** Overrides the default translated "no data" text (v6's own `noDataText`) when set and
     * `errorMessage` isn't. */
    noDataText?: string;
    /**
     * Uncontrolled mode only: called with {page, pageSize, sorted, filtered} whenever
     * pagination/sorting/filtering state changes, including once on mount. Omit this and pass
     * `pagination`/`sorting`/`columnFilters` (+ their `onXChange` counterparts) instead for
     * controlled mode, where the caller owns that state itself (e.g. to support an external
     * "reset filters" button) and is responsible for fetching on its own state changes.
     */
    onFetchData?: (filter: FetchDataFilter) => void;
    /** Uncontrolled mode only: initial sort state, e.g. [{id: "name", desc: true}]. */
    defaultSorted?: { id: string; desc?: boolean }[];
    /** Uncontrolled mode only: initial column-filter state, e.g. [{id: "role", value: "student"}]. */
    defaultFiltered?: ColumnFiltersState;
    /** Pad the tbody with blank rows until it reaches this many, matching v6's `minRows`. */
    minRows?: number;
    /** When set, renders an expander column; expanding a row shows this under it (v6's `SubComponent`). */
    renderSubComponent?: (row: {
        original: TRow;
        index: number;
    }) => React.ReactNode;
    /** Per-row `<tr>` props (e.g. conditional styling), keyed off the row's data -- v6's `getTrProps`. */
    getRowProps?: (
        original: TRow
    ) => React.HTMLAttributes<HTMLTableRowElement> | undefined;
    /** Renders a page-size `<select>` in the footer when set. */
    pageSizeOptions?: number[];
    /** Defaults to `true`. Set `false` to hide the prev/next/page-count/results-count footer
     * entirely -- v6's `showPagination={false}`, used by a few small/unpaginated tables. */
    showPagination?: boolean;
    /** Defaults to `true`. Unlike v6 (where a column's own `filterable` setting was checked
     * first and won over this table-level value, which only acted as a default for columns that
     * didn't set their own), here `false` unconditionally disables filtering on every column,
     * even one with its own `filterable: true` -- for a table that never filters at all, instead
     * of repeating `filterable: false` on every column definition. */
    filterable?: boolean;
    /** Defaults to `true`. Unlike v6 (where a column's own `sortable` setting was checked first
     * and won over this table-level value, which only acted as a default for columns that didn't
     * set their own), here `false` unconditionally disables sorting on every column, even one
     * with its own `sortable: true` -- for a table that never sorts at all, instead of repeating
     * `sortable: false` on every column definition. */
    sortable?: boolean;
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
    /**
     * Defaults to `true` -- every batch 1-3 caller is server-paginated (fetches a page of data via
     * `onFetchData` on page/sort/filter change) and is unaffected by this prop. Set `false` for a
     * table whose full dataset is already in memory (no backend pagination endpoint exists for
     * it) to get TanStack's own client-side sorting/filtering/pagination instead, matching how
     * these tables behaved under react-table v6.
     */
    manual?: boolean;
}

/**
 * TanStackGrid — the headless-table + pagination-footer machinery shared by both BaseDataTable
 * wrappers (common/baseDataTable/BaseDataTable.jsx, function-based, and
 * parameters/BaseDataTable.jsx, class-based) and, since batch 3, the standalone tables that need
 * expandable rows and/or externally-controlled pagination (docs/Modernization-Roadmap.md item 13).
 */
export default function TanStackGrid<TRow = any>({
    tableName,
    columns,
    data,
    loading,
    pages,
    totalCount,
    errorMessage,
    noDataText: noDataTextProp,
    onFetchData,
    defaultSorted,
    defaultFiltered,
    minRows,
    renderSubComponent,
    getRowProps,
    pageSizeOptions,
    showPagination = true,
    filterable: tableFilterable = true,
    sortable: tableSortable = true,
    style,
    pagination: controlledPagination,
    onPaginationChange,
    sorting: controlledSorting,
    onSortingChange,
    columnFilters: controlledColumnFilters,
    onColumnFiltersChange,
    manual: manualProp,
}: TanStackGridProps<TRow>) {
    const { t } = useTranslation("common");
    const manual = manualProp ?? true;

    const [sorting, setSorting] = useControllableState<SortingState>(
        controlledSorting,
        onSortingChange,
        (defaultSorted || []).map((s) => ({ id: s.id, desc: !!s.desc }))
    );
    const [columnFilters, setColumnFilters] =
        useControllableState<ColumnFiltersState>(
            controlledColumnFilters,
            onColumnFiltersChange,
            defaultFiltered || []
        );
    const [pagination, setPagination] = useControllableState<PaginationState>(
        controlledPagination,
        onPaginationChange,
        { pageIndex: 0, pageSize: 20 }
    );
    const [expanded, setExpanded] = useState<ExpandedState>({});

    const hasExpander = !!renderSubComponent;
    const tanstackColumns = useMemo(() => {
        // Built loose (`ColumnDef<any>`, same as toTanStackColumn's own internal
        // MutableColumnDef) and cast once to `ColumnDef<TRow>[]` at the end -- spreading a
        // discriminated union type parametrized on a generic (`ColumnDef<TRow>`) confuses TS's
        // structural checks in the override branch below, same reasoning as toTanStackColumn's
        // own single-cast-at-the-end pattern.
        let mapped: ColumnDef<any>[] = columns.map((c) => toTanStackColumn(c));
        // Table-wide overrides. Unlike v6 -- where a column's own `filterable`/`sortable`
        // setting was checked first and won over the table-level value, which only acted as a
        // default for columns that didn't set their own -- `false` here unconditionally disables
        // every column's filter/sort UI, even a column with its own `filterable`/`sortable: true`.
        // Still cheaper than requiring every column definition to repeat `filterable: false` /
        // `sortable: false` when the whole table never filters or sorts at all.
        if (!tableFilterable || !tableSortable) {
            mapped = mapped.map((c) => ({
                ...c,
                enableColumnFilter: tableFilterable
                    ? c.enableColumnFilter
                    : false,
                enableSorting: tableSortable ? c.enableSorting : false,
            }));
        }
        return (
            hasExpander ? [buildExpanderColumn(), ...mapped] : mapped
        ) as ColumnDef<TRow>[];
        // `renderSubComponent` itself isn't a dep: callers may pass a fresh inline arrow every
        // render (LessonList/DuePaymentList/PaymentList all do), which would defeat this memo on
        // every unrelated re-render even though the columns never actually change -- only whether
        // the expander column should exist at all does.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [columns, hasExpander, tableFilterable, tableSortable]);

    // TanStack throws inside its own row-model code on `data === undefined` (v6 tolerated it);
    // every real caller already guards its own fetched data, but default defensively here too so
    // that invariant can't be silently reintroduced by a future caller. Used everywhere below
    // that reads `data`, not just here -- the resultsCount footer needs the same guard.
    const safeData: TRow[] = data ?? [];

    // v6 reset the current page to 0 whenever the filter set changed (its own
    // calculateNewResolvedState); TanStack v8 has no equivalent, and manualPagination blocks its
    // autoResetPageIndex from covering it either. Only safe to do internally in uncontrolled mode
    // -- a controlled caller owns pagination itself and must reset it as part of its own
    // onColumnFiltersChange -> fetch call (as LessonList already does), since forcing it here too
    // would fire that caller's onPaginationChange a second time for the same interaction.
    const isPaginationControlled = controlledPagination !== undefined;
    const handleColumnFiltersChange: typeof setColumnFilters = (updater) => {
        setColumnFilters(updater);
        if (!isPaginationControlled) {
            setPagination((old) => ({ ...old, pageIndex: 0 }));
        }
    };

    const table = useReactTable<TRow>({
        data: safeData,
        columns: tanstackColumns,
        state: { sorting, columnFilters, pagination, expanded },
        onSortingChange: setSorting,
        onColumnFiltersChange: handleColumnFiltersChange,
        onPaginationChange: setPagination,
        onExpandedChange: setExpanded,
        manualPagination: manual,
        manualSorting: manual,
        manualFiltering: manual,
        // TanStack's default lets a third header click cycle past desc back to "unsorted"
        // (sorting: []) -- v6 never had that state reachable by clicking (asc/desc toggle only).
        // Every real caller sends `sorted: sorted[0]` straight into a request body; an empty
        // array makes `sorted[0]` undefined, which JSON.stringify drops the key for entirely, and
        // every backend #list_json handler dereferences `params[:sorted][:desc]` unguarded --
        // 500, silently swallowed client-side (no .catch anywhere), table stuck loading forever.
        // Kept unconditional (not gated on `manual`) -- a UX consistency improvement in both
        // modes, not a manual-mode-only concern.
        enableSortingRemoval: false,
        // TanStack's own `_autoResetPageIndex` (on by default whenever `manualPagination` is
        // false) resets `pageIndex` to 0 whenever the core row model's data-reference dependency
        // changes -- not just on real pagination/filtering, but on *any* new `data` array
        // reference, including one produced by an unrelated in-place edit (e.g. typing into an
        // editable cell that copies-then-replaces `data` to avoid a stale-display bug). That
        // silently snapped a client-mode table back to page 1 mid-edit. The one legitimate reset
        // case (filters changing) is already handled explicitly above in
        // `handleColumnFiltersChange`, so this built-in auto-reset has no case left to cover.
        // Unconditional (not gated on `manual`): `autoResetPageIndex ?? !manualPagination`
        // already resolves to `false` for every `manual={true}` (server-side) caller, so this
        // only changes behavior for `manual={false}` callers.
        autoResetPageIndex: false,
        pageCount: manual ? (pages ?? -1) : undefined,
        getCoreRowModel: coreRowModel,
        // Rows here are flat records with no real `subRows` -- expansion is used purely as a
        // "toggle to reveal renderSubComponent's extra content" mechanism (v6's SubComponent),
        // not real row hierarchy. TanStack's default getRowCanExpand only allows expanding rows
        // that already have subRows, which makes the toggle handler a silent no-op otherwise.
        // Both scoped to tables that actually have an expander column -- inert but pointless
        // (and a small amount of avoidable per-render work) on every other table otherwise.
        ...(hasExpander
            ? {
                  getExpandedRowModel: expandedRowModel,
                  getRowCanExpand: () => true,
              }
            : {}),
        ...(manual
            ? {}
            : {
                  getSortedRowModel: sortedRowModel,
                  getFilteredRowModel: filteredRowModel,
                  getPaginationRowModel: paginationRowModel,
              }),
    });

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
            setIsFullScreen(
                fscreen.fullscreenElement === fullScreenRef.current
            );
        const handleToggle = () => {
            if (fscreen.fullscreenElement) {
                fscreen
                    .exitFullscreen()
                    .then(() =>
                        fscreen.requestFullscreen(
                            fullScreenRef.current as Element
                        )
                    );
            } else if (fullScreenRef.current) {
                fscreen.requestFullscreen(fullScreenRef.current);
            }
        };

        fscreen.addEventListener(
            "fullscreenchange",
            handleFullScreenChange,
            false
        );
        window.addEventListener(
            `reactTableFullscreen${tableName}Change`,
            handleToggle,
            false
        );
        return () => {
            fscreen.removeEventListener(
                "fullscreenchange",
                handleFullScreenChange,
                false
            );
            window.removeEventListener(
                `reactTableFullscreen${tableName}Change`,
                handleToggle,
                false
            );
        };
    }, [tableName]);

    const columnCount = tanstackColumns.length || 1;
    const headers = table.getHeaderGroups()[0].headers;
    const rows = table.getRowModel().rows;
    const paddingRowCount =
        !loading && minRows ? Math.max(minRows - rows.length, 0) : 0;

    return (
        <div
            ref={fullScreenRef}
            data-testid={tableName}
            className={
                isFullScreen ? "fullscreen fullscreen-enabled" : undefined
            }
            style={
                isFullScreen
                    ? { ...style, height: "100%", width: "100%" }
                    : style
            }
        >
            <div style={{ overflowX: "auto" }}>
                {/* .table sets max-width: 100%, which caps the table at the wrapper's width
                    instead of letting it grow to its content's natural width -- with that cap in
                    place there's nothing for the wrapper's overflow-x to ever scroll, and columns
                    get squeezed/clipped instead. Override it so a table wider than its container
                    actually overflows (and scrolls) rather than shrinking its own columns. */}
                <table className="table" style={{ maxWidth: "none" }}>
                    <thead>
                        <tr>
                            {headers.map((header) => (
                                <th
                                    key={header.id}
                                    style={{
                                        whiteSpace: "nowrap",
                                        ...(header.column.columnDef.meta?.width
                                            ? {
                                                  width: header.column.columnDef
                                                      .meta.width,
                                              }
                                            : undefined),
                                    }}
                                    onClick={
                                        header.column.getCanSort()
                                            ? (header.column.getToggleSortingHandler() ??
                                              undefined)
                                            : undefined
                                    }
                                    className={
                                        header.column.getCanSort()
                                            ? "sortable"
                                            : undefined
                                    }
                                >
                                    {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
                                    {{ asc: " ▲", desc: " ▼" }[
                                        header.column.getIsSorted() as string
                                    ] ?? ""}
                                </th>
                            ))}
                        </tr>
                        {headers.some((h) => h.column.getCanFilter()) && (
                            <tr>
                                {headers.map((header) => {
                                    const CustomFilter =
                                        header.column.columnDef.meta?.Filter;
                                    const filterValue =
                                        header.column.getFilterValue();
                                    return (
                                        <th
                                            key={header.id}
                                            style={{
                                                minWidth:
                                                    header.column.columnDef.meta
                                                        ?.width ?? 100,
                                            }}
                                        >
                                            {header.column.getCanFilter() &&
                                                (CustomFilter ? (
                                                    <CustomFilter
                                                        filter={
                                                            filterValue !==
                                                            undefined
                                                                ? {
                                                                      value: filterValue,
                                                                  }
                                                                : undefined
                                                        }
                                                        onChange={(value) =>
                                                            header.column.setFilterValue(
                                                                value
                                                            )
                                                        }
                                                    />
                                                ) : (
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-small"
                                                        value={
                                                            (filterValue as string) ??
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            header.column.setFilterValue(
                                                                e.target.value
                                                            )
                                                        }
                                                    />
                                                ))}
                                        </th>
                                    );
                                })}
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={columnCount}
                                    className="text-center py-5"
                                >
                                    <div
                                        className="tsg-spinner"
                                        role="status"
                                        aria-label={t("reactTable.loadingText")}
                                    />
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={columnCount}>
                                    {errorMessage ||
                                        noDataTextProp ||
                                        t("reactTable.noDataText")}
                                </td>
                            </tr>
                        ) : (
                            <>
                                {rows.map((row) => (
                                    <React.Fragment key={row.id}>
                                        <tr
                                            {...(getRowProps
                                                ? getRowProps(row.original)
                                                : undefined)}
                                        >
                                            {row
                                                .getVisibleCells()
                                                .map((cell) => (
                                                    <td
                                                        key={cell.id}
                                                        style={{
                                                            whiteSpace:
                                                                "nowrap",
                                                            ...cell.column
                                                                .columnDef.meta
                                                                ?.style,
                                                        }}
                                                        className={
                                                            cell.column
                                                                .columnDef.meta
                                                                ?.className
                                                        }
                                                    >
                                                        {flexRender(
                                                            cell.column
                                                                .columnDef.cell,
                                                            cell.getContext()
                                                        )}
                                                    </td>
                                                ))}
                                        </tr>
                                        {renderSubComponent &&
                                            row.getIsExpanded() && (
                                                <tr>
                                                    <td colSpan={columnCount}>
                                                        {renderSubComponent({
                                                            original:
                                                                row.original,
                                                            index: row.index,
                                                        })}
                                                    </td>
                                                </tr>
                                            )}
                                    </React.Fragment>
                                ))}
                                {Array.from({ length: paddingRowCount }).map(
                                    (_, i) => (
                                        <tr key={`pad-${i}`}>
                                            {Array.from({
                                                length: columnCount,
                                            }).map((__, j) => (
                                                <td key={j}>&nbsp;</td>
                                            ))}
                                        </tr>
                                    )
                                )}
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {showPagination && (
                <div className="d-flex justify-content-between align-items-center">
                    <div>
                        <button
                            type="button"
                            className="btn btn-sm btn-default mr-1"
                            disabled={!table.getCanPreviousPage()}
                            onClick={() => table.previousPage()}
                        >
                            {t("reactTable.previousText")}
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-default"
                            disabled={!table.getCanNextPage()}
                            onClick={() => table.nextPage()}
                        >
                            {t("reactTable.nextText")}
                        </button>
                        {pageSizeOptions && (
                            <select
                                className="form-control form-control-small d-inline-block ml-2"
                                style={{ width: "auto" }}
                                value={pagination.pageSize}
                                onChange={(e) =>
                                    table.setPageSize(Number(e.target.value))
                                }
                            >
                                {pageSizeOptions.map((size) => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div>
                        {t("reactTable.pageText")} {pagination.pageIndex + 1}{" "}
                        {t("reactTable.ofText")}{" "}
                        {Math.max(table.getPageCount(), 1)}
                    </div>
                    <div>
                        {t("baseDataTable.resultsCount", {
                            count:
                                totalCount ??
                                (manual
                                    ? safeData.length
                                    : table.getFilteredRowModel().rows.length),
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
