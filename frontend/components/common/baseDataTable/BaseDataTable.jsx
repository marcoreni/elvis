import React, {useEffect, useMemo, useRef, useState} from "react";
import {flexRender, getCoreRowModel, useReactTable} from "@tanstack/react-table";
import fscreen from "fscreen";
import {useTranslation} from "react-i18next";
import {makeDebounce} from "../../../tools/inputs";
import ItemFormModal from "./ItemFormModal";
import DeleteItemModal from "./DeleteItemModal";
import {goFullScreen} from "../../ReactTableFullScreen";

const coreRowModel = getCoreRowModel();

// Column defs here use the v6 react-table shape (Header/accessor/Cell/sortable/filterable/width)
// so callers didn't need to change when this wrapper moved to TanStack Table v8 internally --
// see docs/Modernization-Roadmap.md item 13. `accessor` may be a dot-path string (TanStack
// supports nested accessorKey paths natively) or a function.
function toTanStackColumn(column) {
    const tanstackColumn = {
        id: column.id ?? (typeof column.accessor === "string" ? column.accessor : undefined),
        header: column.Header,
        enableSorting: column.sortable !== false,
        enableColumnFilter: column.filterable !== false,
    };

    if (typeof column.accessor === "function") {
        tanstackColumn.accessorFn = column.accessor;
    } else if (typeof column.accessor === "string") {
        tanstackColumn.accessorKey = column.accessor;
    }

    if (column.Cell) {
        tanstackColumn.cell = ctx => column.Cell({
            value: ctx.getValue(),
            original: ctx.row.original,
            index: ctx.row.index,
        });
    }

    if (column.width) {
        // Not `size`: TanStack defaults every column's `size` to 150 whether or not one is set,
        // so reading it back at render time couldn't distinguish "explicit width" from "default".
        // `meta` is untouched by that default.
        tanstackColumn.meta = {width: column.width};
    }

    return tanstackColumn;
}


/**
 * BaseDataTable Component
 *
 * A generic data table component for displaying and managing a list of resources.
 * The component provides CRUD functionalities (Create, Read, Update, Delete) and
 * relies on external services for data fetching and manipulation.
 *
 * Props:
 * @param {object} dataService - Service to fetch and manipulate data.
 * @param {array} columns - Array of column configurations for the ReactTable.
 * @param {func} labellizer - Function to convert a data item to a string label. Used in delete confirmation.
 * @param {component} actionButtons - React component for action buttons to perform CRUD operations.
 * @param {component} createButton - React component for the button that triggers the creation of a new item.
 * @param {showFullScreenButton} - If the full screen button should be displayed.
 * @param {string} oneResourceTypeName - Singular name of the resource for modals and messages (e.g., "user").
 * @param {string} thisResourceTypeName - Indicative form of the resource for delete confirmation (e.g., "this user").
 * @param {component} formContentComponent - React component for the content inside the item form modal.
 * @param {array} [defaultSorted] - Initial sort state, e.g. [{id: "name", desc: true}].
 *
 * State:
 * @state {array} data - List of items to be displayed.
 * @state {number} pages - Total number of pages.
 * @state {boolean} loading - If the data is currently being fetched.
 * @state {boolean} showItemModal - If the item form modal should be displayed.
 * @state {boolean} showDeleteModal - If the delete confirmation modal should be displayed.
 * @state {object} item - Current item being viewed/edited in the modal.
 * @state {object} filter - Current filter applied to the data fetching.
 * @state {boolean} wantUpdate - If the item form modal should be in update mode.
 *
 * Usage:
 * @usage
 * <BaseDataTable
 *     urlListData="/api/users/list"
 *     urlRootData="/api/users"
 *     columns={[...]}
 *     labellizer={item => item.name}
 *     actionButtons={MyActionButtons}
 *     createButton={MyCreateButton}
 *     oneResourceTypeName="un utilisateur"
 *     thisResourceTypeName="cet utilisateur"
 *     formContentComponent={MyFormContent}
 * />
 *
 * @note
 *     The `formContentComponent` must have the following props:
 *         - item: the item to edit (if null, it's a create form)
 *         - onSubmit: the function to call when the form is submitted
 *         - onRequestClose: the function to call when the form is closed
 *         - updateTitle: the title to display when editing an item
 *         - createTitle: the title to display when creating an item
 *
 *     The `actionButtons` must have the following props:
 *         - row: the row of the table
 *         - onEdit: the function to call when the edit button is clicked
 *         - onDelete: the function to call when the delete button is clicked
 *
 *     `actionButtons` has a default implementation, `ActionButtons`, that displays the edit and delete buttons.
 *
 *     The createButton must have the following props:
 *         - onCreate: the function to call when the create button is clicked
 *
 *     `createButton` has a default implementation, `CreateButton`, that displays a create button.
 *
 *     The CRUD API must support the following requests:
 *         - GET /urlListData: to get the list of data
 *         - POST /urlListData: to get the list of data with pagination, sorting and filtering
 *         - POST /urlRootData: to create an item
 *         - PUT /urlRootData/:id: to update an item
 *         - DELETE /urlRootData/:id: to delete an item
 */

export default function BaseDataTable({
                                          dataService,
                                          columns,
                                          labellizer,
                                          actionButtons,
                                          createButton,
                                          showFullScreenButton,
                                          oneResourceTypeName,
                                          thisResourceTypeName,
                                          formContentComponent,
                                          defaultSorted,
                                      }) {
    const {t} = useTranslation("common");
    const debounce = makeDebounce();

    const [state, setState] = useState({
        data: [],
        pages: null,
        loading: true,
        showItemModal: false,
        showDeleteModal: false,
        item: null,
        filter: null,
        wantUpdate: true,
    });

    const [sorting, setSorting] = useState(
        () => (defaultSorted || []).map(s => ({id: s.id, desc: !!s.desc})),
    );
    const [columnFilters, setColumnFilters] = useState([]);
    const [pagination, setPagination] = useState({pageIndex: 0, pageSize: 20});

    const ActionButtonsComponent = actionButtons;
    const CreateButtonComponent = createButton;

    const allowEdit = !!formContentComponent;
    const tableName = "table-" + oneResourceTypeName;

    const reactTableColumns = useMemo(() => {
        const cols = [...columns];
        if (actionButtons) {
            cols.push({
                id: "actions",
                Header: "Actions",
                Cell: props => (
                    <ActionButtonsComponent
                        item={props.original}
                        onEdit={() => showItemFormModal(true, props.original)}
                        onDelete={showDeleteItemModal}
                    />),
                sortable: false,
                filterable: false,
                width: 150
            });
        }
        return cols;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [columns, actionButtons]);

    /*
    =========================================
    =========================================
    */

    function fetchData(filter) {
        setState(prevState => ({...prevState, loading: true, filter: filter}));
        debounce(() => {
            dataService.listData(filter)
                .then(res => {
                    // console.log("Data fetched:", res)
                    setState(prevState => ({
                        ...prevState,
                        data: res.data,
                        pages: res.pages,
                        loading: false,
                        errorMessage: null
                    }));
                })
                .catch(errors => {
                    console.error("Errors fetching data:", errors);
                    setState(prevState => ({
                        ...prevState,
                        loading: false,
                        errorMessage: t("baseDataTable.loadError")
                    }));
                });
        }, 400);
    }

    function showItemFormModal(wantUpdate, item) {
        if (!allowEdit)
            return;

        setState(prevState => ({
            ...prevState,
            showItemModal: true,
            wantUpdate,
            item
        }));
    }

    function closeItemFormModal() {
        setState(prevState => ({...prevState, showItemModal: false}));
    }

    function showDeleteItemModal(item) {
        setState(prevState => ({...prevState, showDeleteModal: true, item}));
    }

    function closeDeleteItemModal() {
        setState(prevState => ({...prevState, showDeleteModal: false}));
    }


    /*
    =========================================
    =========== CRUD actions ================
    =========================================
    */

    function createItem(item) {
        return dataService.createData(item)
            .then(() => {
                closeItemFormModal();
                fetchData(state.filter);
            })
    }

    function updateItem(item) {
        const index = state.data.findIndex(i => i.id === item.id)

        if (index >= 0) {
            return dataService.updateData(item)
                .then(res => { //fetchData sous condition
                    setState(prevState => ({
                        ...prevState,
                        data: [...prevState.data.slice(0, index), item, ...prevState.data.slice(index + 1)],
                    }));

                    closeItemFormModal();
                })

        } else {
            console.error(t("baseDataTable.itemNotFound"))
            return Promise.reject([t("baseDataTable.itemNotFound")])
        }
    }

    function deleteItem(item) {
        const index = state.data.indexOf(item);

        return dataService.deleteData(item)
            .then(res => {
                setState(prevState => ({
                    ...prevState,
                    data: [...prevState.data.slice(0, index), ...prevState.data.slice(index + 1)],
                }));
                closeDeleteItemModal();
            })
    }

    const tanstackColumns = useMemo(() => reactTableColumns.map(toTanStackColumn), [reactTableColumns]);

    const table = useReactTable({
        data: state.data,
        columns: tanstackColumns,
        state: {sorting, columnFilters, pagination},
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onPaginationChange: setPagination,
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        pageCount: state.pages ?? -1,
        getCoreRowModel: coreRowModel,
    });

    // TanStack's own getCoreRowModel() memoization (keyed on table.options.data) doesn't reliably
    // invalidate here: confirmed live that table.options.data updates to the new array correctly
    // (same reference this component's own state holds) but table.getCoreRowModel() keeps
    // returning the stale row set across many consecutive renders, until the cached getter is
    // discarded. Root cause traced to render *frequency*, not this component's own logic: callers
    // embedded in a react-final-form form (ActivityRefBasics.jsx, EditFormule.jsx) re-render on
    // every field interaction anywhere in the whole multi-tab form, and both rebuild `dataService`
    // and `columns` fresh in every render() -- so this table is churned through far more renders
    // than its own state changes would suggest, and TanStack's cache (a plain mutable object kept
    // outside React state, updated via a side effect during render) gets out of sync somewhere in
    // that churn. A `data`-changed ref guard to only reset when needed proved unreliable under that
    // same churn (some intervening render already "consumes" the change the guard was watching
    // for). Resetting unconditionally sidesteps the whole render-ordering question and is cheap
    // regardless: this only reconstructs lightweight row-wrapper objects (no cell rendering, no DOM
    // work) once per render of *this* table, not once per unrelated re-render elsewhere in the
    // form -- negligible even at a few hundred rows. The real long-term fix is upstream: stabilize
    // `dataService`/`columns` identity in those callers (build once, not on every render) so this
    // table isn't re-rendered nearly as often in the first place -- worth a follow-up pass, out of
    // scope for this batch.
    delete table._getCoreRowModel;

    useEffect(() => {
        // Server-driven table: whenever page/sort/filter state changes, re-fetch. `fetchData`
        // isn't a dep -- it's redefined every render, and including it would re-trigger this
        // effect on every unrelated state change (e.g. its own setState calls) instead of only
        // on real page/sort/filter changes.
        fetchData({
            page: pagination.pageIndex,
            pageSize: pagination.pageSize,
            sorted: sorting,
            filtered: columnFilters,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination, sorting, columnFilters]);

    const fullScreenRef = useRef(null);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        const handleFullScreenChange = () =>
            setIsFullScreen(fscreen.fullscreenElement === fullScreenRef.current);
        const handleToggle = () => {
            if (fscreen.fullscreenElement) {
                fscreen.exitFullscreen().then(() => fscreen.requestFullscreen(fullScreenRef.current));
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
        <div>
            <div className="row">
                <div className="col">
                    {showFullScreenButton &&
                        <button data-tippy-content={t("baseDataTable.fullScreenTooltip")}
                                className="btn btn-primary"
                                onClick={() => goFullScreen(tableName)}>
                            <i className="fas fa-expand-arrows-alt"></i>
                        </button>
                    }
                    {createButton &&
                        <CreateButtonComponent onCreate={() => showItemFormModal(false, null)}/>
                    }
                </div>
            </div>


            <div className="row">
                <div className="col"> {/* vérifier si col*/}
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
                                            ? header.column.getToggleSortingHandler()
                                            : undefined}
                                        className={header.column.getCanSort() ? "sortable" : undefined}
                                    >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                        {{asc: " ▲", desc: " ▼"}[header.column.getIsSorted()] ?? ""}
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
                                                value={header.column.getFilterValue() ?? ""}
                                                onChange={e => header.column.setFilterValue(e.target.value)}
                                            />}
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {state.loading ? (
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
                                        {state.errorMessage || t("reactTable.noDataText")}
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
                                {Math.max(state.pages || 1, 1)}
                            </div>
                            <div>{t("baseDataTable.resultsCount", {count: state.data.length})}</div>
                        </div>
                    </div>
                </div>

                {allowEdit &&
                    <ItemFormModal
                        item={state.item}
                        component={formContentComponent}
                        isOpen={state.showItemModal}
                        updateTitle={t("baseDataTable.updateTitle", {name: oneResourceTypeName})}
                        createTitle={t("baseDataTable.createTitle", {name: oneResourceTypeName})}
                        onRequestClose={closeItemFormModal}
                        onSubmit={item => (state.wantUpdate ? updateItem(item) : createItem(item))}
                    />}

                <DeleteItemModal
                    item={state.item}
                    isOpen={state.showDeleteModal}
                    onRequestClose={closeDeleteItemModal}
                    title={t("baseDataTable.deleteTitle", {name: oneResourceTypeName})}
                    question={t("baseDataTable.deleteQuestion", {
                        name: thisResourceTypeName || t("baseDataTable.defaultResource"),
                        label: state.item && labellizer ? labellizer(state.item) : "",
                    })}
                    onDelete={() => deleteItem(state.item)}
                />
            </div>
        </div>
    );
}
