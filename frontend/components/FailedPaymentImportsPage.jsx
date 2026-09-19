import React from "react";

import TanStackGrid from "./common/baseDataTable/TanStackGrid";
import FilterSelect from "./common/baseDataTable/FilterSelect";

import moment from "moment";
import swal from "sweetalert2";
import _ from "lodash";
import { withTranslation } from "react-i18next";
import { ISO_DATE_FORMAT, csrfToken } from "./utils";

/*
    Propriétés de l'objet passé aux fonctions d'attributs de rendering de cellule
  {
    // Row-level props
    row: Object, // the materialized row of data
    original: , // the original row of data
    index: '', // the index of the row in the original array
    viewIndex: '', // the index of the row relative to the current view
    level: '', // the nesting level of this row
    nestingPath: '', // the nesting path of this row
    aggregated: '', // true if this row's values were aggregated
    groupedByPivot: '', // true if this row was produced by a pivot
    subRows: '', // any sub rows defined by the `subRowKey` prop

    // Cells-level props
    isExpanded: '', // true if this row is expanded
    value: '', // the materialized value of this cell
    resized: '', // the resize information for this cell's column
    show: '', // true if the column is visible
    width: '', // the resolved width of this cell
    maxWidth: '', // the resolved maxWidth of this cell
    tdProps: '', // the resolved tdProps from `getTdProps` for this cell
    columnProps: '', // the resolved column props from 'getProps' for this cell's column
    classes: '', // the resolved array of classes for this cell
    styles: '' // the resolved styles for this cell
  } */

class FailedPaymentImportsPage extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            data: this.props.data,
            selectAll: false,
            selectedRows: [],
            selectedReason: null,
            // Controlled, rather than TanStackGrid's own uncontrolled default (pageSize 20), so
            // the initial page size matches v6's old `defaultPageSize={10}`. The old <ReactTable>
            // also showed a page-size selector by default (v6's `showPageSizeOptions: true`,
            // `pageSizeOptions: [5, 10, 20, 25, 50, 100]`) -- restored below via TanStackGrid's own
            // `pageSizeOptions` prop.
            pagination: { pageIndex: 0, pageSize: 10 },
        };
    }

    promptBulkDeleteByReason() {
        const { t } = this.props;

        swal.fire({
            title: t("failedImports.confirm.title"),
            text: t("failedImports.confirm.textMany"),
            icon: "warning",
            confirmButtonText: t("failedImports.confirm.yes"),
            showCancelButton: true,
            cancelButtonText: t("failedImports.confirm.no"),
            focusCancel: true,
        }).then((reason) => {
            if (reason.isConfirmed) {
                fetch(
                    `/payments/failed_imports/reason/${
                        this.state.selectedReason.id
                    }`,
                    {
                        method: "DELETE",
                        headers: {
                            "X-CSRF-Token": csrfToken,
                        },
                    }
                ).then((res) => {
                    if (res.ok) {
                        this.setState({
                            data: this.state.data.filter(
                                (x) =>
                                    x.failed_payment_import_reason_id !==
                                    this.state.selectedReason.id
                            ),
                        });
                    }
                });
            }
        });
    }

    promptBulkDelete() {
        const { t } = this.props;

        swal.fire({
            title: t("failedImports.confirm.title"),
            text: t("failedImports.confirm.textMany"),
            icon: "warning",
            confirmButtonText: t("failedImports.confirm.yes"),
            showCancelButton: true,
            cancelButtonText: t("failedImports.confirm.no"),
            focusCancel: true,
        }).then((reason) => {
            if (reason.isConfirmed) {
                fetch("/payments/failed_imports/many", {
                    method: "DELETE",
                    headers: {
                        "X-CSRF-Token": csrfToken,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        targets: this.state.selectedRows,
                        all: this.state.selectAll,
                    }),
                }).then((res) => {
                    if (res.ok) {
                        const newData = this.state.selectAll
                            ? []
                            : this.state.data.filter(
                                  (d) => !this.state.selectedRows.includes(d.id)
                              );

                        this.setState({
                            data: newData,
                            selectedRows: [],
                            selectAll: false,
                        });
                    }
                });
            }
        });
    }

    promptDelete(id) {
        const { t } = this.props;

        swal.fire({
            title: t("failedImports.confirm.title"),
            text: t("failedImports.confirm.textOne"),
            icon: "warning",
            confirmButtonText: t("failedImports.confirm.yes"),
            showCancelButton: true,
            cancelButtonText: t("failedImports.confirm.no"),
            focusCancel: true,
        }).then((reason) => {
            if (reason.isConfirmed)
                fetch(`/payments/failed_imports/delete?id=${id}`, {
                    headers: {
                        "X-CSRF-Token": csrfToken,
                    },
                    method: "DELETE",
                }).then((res) => {
                    if (res.ok)
                        this.setState({
                            data: this.state.data.filter((d) => d.id !== id),
                        });
                    else
                        swal.fire({
                            title: t("failedImports.failureTitle"),
                            icon: "error",
                            text: t("failedImports.importNotFound"),
                        });
                });
        });
    }

    promptSubmit(row) {
        const { t } = this.props;
        const data = { ...row };

        data.due_date = moment(data.due_date).format("DD/MM/YYYY");
        data.cashing_date = moment(data.cashing_date).format("DD/MM/YYYY");

        swal.fire({
            title: t("failedImports.importTitle"),
            text: t("failedImports.importConfirmText"),
            icon: "question",
            confirmButtonText: t("failedImports.confirm.yes"),
            showCancelButton: true,
            cancelButtonText: t("failedImports.confirm.no"),
            focusCancel: true,
        }).then((reason) => {
            if (reason.isConfirmed)
                fetch(`/payments/failed_imports/import_single`, {
                    headers: {
                        "X-CSRF-Token": csrfToken,
                        "Content-Type": "application/json",
                    },
                    method: "POST",
                    body: JSON.stringify(data),
                })
                    .then((res) => res.json())
                    .then((res) => {
                        if (res.success)
                            swal.fire({
                                title: t("failedImports.successTitle"),
                                text: res.message,
                                icon: "success",
                            }).then(() => {
                                this.setState({
                                    data: this.state.data.filter(
                                        (d) => d.id !== data.id
                                    ),
                                });
                            });
                        else
                            swal.fire({
                                title: t("failedImports.failureTitle"),
                                text: res.message,
                                icon: "error",
                            }).then(() => {
                                const { data } = this.state;
                                const index = data.findIndex(
                                    (imp) =>
                                        imp.id == res.failed_payment_import.id
                                );

                                if (index > -1) {
                                    data.splice(
                                        index,
                                        1,
                                        res.failed_payment_import
                                    );
                                    this.setState({ data });
                                }
                            });
                    });
        });
    }

    // `field` used to be read off `cell.column.id` -- v6 exposed the owning column on every cell;
    // TanStackGrid's Cell props are just {value, original, index}, so the field name each of
    // these needs to write back into `this.state.data` is passed in explicitly by the caller
    // instead (every call site already knows its own column's field statically).
    renderNameCell(cell, editable, field) {
        if (editable)
            return (
                <div
                    // Was a `cell.styles.background/color` mutation onto the surrounding <td> --
                    // TanStackGrid's <td> isn't influenceable from a Cell renderer, so the
                    // highlight moves onto this wrapping element instead (fills the cell's
                    // content box, not its full padding/border).
                    style={{ background: "#d63031", color: "white" }}
                    contentEditable={editable}
                    suppressContentEditableWarning={editable}
                    onBlur={(e) => {
                        const data = [...this.state.data];
                        data[cell.index][field] = e.target.innerText.replace(
                            /\n/g,
                            ""
                        );
                        this.setState({ data });
                    }}
                >
                    {cell.original[field]}
                </div>
            );
        else if (cell.original.user_id)
            return (
                <a
                    href={`/payments/summary/${cell.original.user_id}`}
                    target="_blank"
                >
                    {cell.original[field]}
                </a>
            );

        // Not editable and no user_id -- near-unreachable today (every non-`payer_not_found` row
        // gets a `user_id` from the controller), but a Cell renderer returning `undefined` (rather
        // than `null`) is a React error ("Nothing was returned from render"), unlike v6 which
        // tolerated it. Fall back to the plain text instead of rendering nothing.
        return cell.original[field] ?? null;
    }

    renderDateCell(cell, editable, field) {
        if (editable) {
            return (
                <input
                    type="date"
                    disabled={!editable}
                    onChange={(e) => {
                        const data = [...this.state.data];
                        data[cell.index][field] = moment(e.target.value);
                        this.setState({ data });
                    }}
                    style={{
                        width: "100%",
                        height: "100%",
                        padding: "0",
                        background: "#d63031",
                        color: "white",
                    }}
                    value={cell.value.format(ISO_DATE_FORMAT)}
                />
            );
        }

        return <div>{cell.value.format("DD/MM/YYYY")}</div>;
    }

    renderAmountCell(cell, editable, field) {
        if (editable)
            return (
                <input
                    type="number"
                    onChange={(e) => {
                        const data = [...this.state.data];
                        data[cell.index][field] = parseFloat(e.target.value);
                        this.setState({ data });
                    }}
                    style={{
                        width: "100%",
                        height: "100%",
                        background: "#d63031",
                        color: "white",
                    }}
                    value={cell.value}
                />
            );

        return `${cell.value} €`;
    }

    changeSelectedReason(id) {
        if (id === NaN) {
            this.setState({ selectedReason: null });
        } else {
            const selectedReason = _.find(
                this.props.reasons,
                (r) => r.id === id
            );
            this.setState({ selectedReason });
        }
    }

    switchSelectAll(checked) {
        if (checked) this.setState({ selectAll: true });
        else this.setState({ selectAll: false, selectedRows: [] });
    }

    handleRowSelected(e) {
        const id = parseInt(e.target.value);
        const selectedRows = this.state.selectedRows.slice();
        const idx = selectedRows.indexOf(id);

        if (idx === -1) selectedRows.push(id);
        else selectedRows.splice(idx, 1);

        this.setState({
            selectedRows,
        });
    }

    clearSelection() {
        this.setState({ selectedRows: [], selectAll: false });
    }

    // TanStackGrid's `tanstackColumns` memo is keyed on this array's *identity*, and a changed
    // `cell` function identity inside it makes TanStack's `flexRender` (which calls it via
    // `React.createElement(cellFn, props)`) treat it as a brand-new component type -- unmounting
    // and remounting the whole cell subtree, which destroys any `<input>` DOM node and its focus.
    // A class component's `render()` used to build this array fresh every time (including on
    // every keystroke into an editable cell, via the `this.setState({data})` each onChange
    // triggers), so cache it here and only rebuild when something it actually reads that isn't
    // reached through a stable `this.` reference changes: the translated headers (`t`) and the
    // `reasons` prop the editable/id lookups and the reason filter's <select> options are built
    // from. Everything else this closes over (`this.state.selectAll`/`selectedRows`/`data`) is
    // read live off `this` inside each Cell/Filter at call time, not captured by value, so caching
    // the array doesn't make those go stale.
    getColumns() {
        const { t, reasons } = this.props;

        if (
            this._columnsCache &&
            this._columnsCacheT === t &&
            this._columnsCacheReasons === reasons
        ) {
            return this._columnsCache;
        }

        const payerNotFound = reasons.find((d) => d.code === "payer_not_found");
        const dueNotFound = reasons.find((d) => d.code === "due_not_found");
        const differentAmounts = reasons.find(
            (d) => d.code === "different_amounts"
        );

        const columns = [
            {
                Header: t("failedImports.columns.selection"),
                Filter: () => (
                    <div className="flex flex-center-aligned flex-center-justified">
                        <input
                            type="checkbox"
                            onChange={(e) =>
                                this.switchSelectAll(e.target.checked)
                            }
                            checked={
                                this.state.selectAll ||
                                this.state.selectedRows.length
                            }
                        />
                    </div>
                ),
                filterable: true,
                maxWidth: 75,
                accessor: "id",
                Cell: (c) => (
                    <div className="flex flex-center-justified flex-center-aligned">
                        <input
                            type="checkbox"
                            checked={
                                this.state.selectAll ||
                                this.state.selectedRows.includes(c.value)
                            }
                            value={c.value}
                            onChange={(e) => this.handleRowSelected(e)}
                        />
                    </div>
                ),
            },
            {
                Header: t("failedImports.columns.reason"),
                id: "reason",
                // A string here, not the raw numeric `failed_payment_import_reason_id` -- TanStack's
                // "auto" filterFn is picked from the *row value's* type, and for a number that's
                // `inNumberRange` (expects a [min, max] tuple). It doesn't throw on the single option
                // string this <FilterSelect> actually produces: `resolveFilterValue` destructures it
                // into `[min, undefined]`, and `parseFloat(undefined)` -> `NaN` -> the upper bound
                // becomes `Infinity`, so the filter silently behaved as "reason id >= selected"
                // instead of an exact match (e.g. selecting reason 1 wrongly showed every row).
                // Stringifying keeps the auto-picked filterFn as a case-insensitive "contains"
                // instead, matching (closely enough) v6's own default filter method here
                // (`String(value).startsWith(filter.value)`). The Cell below reads the real numeric
                // id back off `original`, not off this value.
                //
                // Latent limitation: "contains" (not exact match) means selecting reason "1" would
                // also match reason "10"/"11" if `failed_payment_import_reason_id`s ever reach two
                // digits (a real possibility -- that table is `find_or_create_by`'d). LegacyColumn
                // has no per-column filterFn override hook today to fix this properly.
                accessor: (d) => String(d.failed_payment_import_reason_id),
                filterable: true,
                minWidth: 70,
                Filter: ({ filter, onChange }) => (
                    <FilterSelect
                        style={{ width: "100%" }}
                        value={(filter && filter.value) || ""}
                        onChange={(event) => onChange(event.target.value)}
                    >
                        <option key="" value="" />
                        {reasons.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.label}
                            </option>
                        ))}
                    </FilterSelect>
                ),
                Cell: (cell) => {
                    const reason = _.find(
                        reasons,
                        (rea) =>
                            rea.id ===
                            cell.original.failed_payment_import_reason_id
                    );
                    return (
                        (reason && reason.label) ||
                        t("failedImports.reasonUnspecified")
                    );
                },
            },
            {
                Header: t("failedImports.columns.firstName"),
                id: "first_name",
                accessor: "first_name",
                filterable: false,
                Cell: (c) =>
                    this.renderNameCell(
                        c,
                        c.original.failed_payment_import_reason_id ===
                            payerNotFound.id,
                        "first_name"
                    ),
            },
            {
                Header: t("failedImports.columns.lastName"),
                id: "last_name",
                accessor: "last_name",
                filterable: false,
                Cell: (c) =>
                    this.renderNameCell(
                        c,
                        c.original.failed_payment_import_reason_id ===
                            payerNotFound.id,
                        "last_name"
                    ),
            },
            {
                Header: t("failedImports.columns.dueDate"),
                id: "due_date",
                accessor: (d) => moment(d.due_date),
                filterable: false,
                Cell: (c) =>
                    this.renderDateCell(
                        c,
                        c.original.failed_payment_import_reason_id ===
                            dueNotFound.id,
                        "due_date"
                    ),
            },
            {
                Header: t("failedImports.columns.cashingDate"),
                id: "cashing_date",
                accessor: (d) => moment(d.cashing_date),
                filterable: false,
                Cell: (cell) => cell.value.format("DD/MM/YYYY"),
            },
            {
                Header: t("failedImports.columns.importDate"),
                id: "import_date",
                accessor: (d) => moment(d.created_at),
                filterable: false,
                Cell: (cell) =>
                    cell.value.format(t("failedImports.importDateFormat")),
            },
            {
                Header: t("failedImports.columns.importAmount"),
                maxWidth: 125,
                id: "amount",
                accessor: "amount",
                filterable: false,
                Cell: (cell) =>
                    this.renderAmountCell(
                        cell,
                        cell.original.failed_payment_import_reason_id ===
                            differentAmounts.id,
                        "amount"
                    ),
            },
            {
                // Was missing an `id` (and had no accessor either) under v6, which tolerated it
                // silently. TanStack doesn't throw on this: `createColumn` falls back to the
                // column's `header` when it's a string, so the column silently got the *translated
                // label string* as its id instead of throwing -- a real bug (a locale-dependent
                // column id), just not a crash. Explicit `id` here fixes it.
                id: "actions",
                Header: t("failedImports.columns.actions"),
                maxWidth: 100,
                filterable: false,
                Cell: (c) => (
                    <div className="flex flex-space-around-justified">
                        <button
                            className="btn btn-sm btn-primary"
                            value={c.original.id}
                            onClick={(e) => this.promptSubmit(c.original)}
                        >
                            <i className="fas fa-check" />
                        </button>
                        <button
                            className="btn btn-sm btn-warning"
                            value={c.original.id}
                            onClick={(e) =>
                                this.promptDelete(parseInt(e.target.value))
                            }
                        >
                            <i className="fas fa-trash" />
                        </button>
                    </div>
                ),
            },
        ];

        this._columnsCache = columns;
        this._columnsCacheT = t;
        this._columnsCacheReasons = reasons;
        return columns;
    }

    render() {
        const { t } = this.props;
        const columns = this.getColumns();

        let bulkDeleteButtonLabel = t("failedImports.bulk.byReason");

        if (this.state.selectAll)
            bulkDeleteButtonLabel = t("failedImports.bulk.deleteAll", {
                n: this.state.data.length,
            });
        else if (this.state.selectedRows.length)
            bulkDeleteButtonLabel = t("failedImports.bulk.deleteSelected", {
                n: this.state.selectedRows.length,
            });
        else if (this.state.selectedReason)
            bulkDeleteButtonLabel = t("failedImports.bulk.deleteAllOfReason", {
                reason: this.state.selectedReason.label.toUpperCase(),
            });

        const bulkDeleteButtonOnClickCb =
            this.state.selectAll || this.state.selectedRows.length
                ? () => this.promptBulkDelete()
                : () => this.promptBulkDeleteByReason();

        return (
            <div className="col-lg-12">
                <div className="ibox">
                    <div className="ibox-title">
                        <div className="flex flex-space-between-justified">
                            <h2>{t("failedImports.title")}</h2>
                            <div className="flex flex-center-aligned">
                                <select
                                    className="form-control m-r-md"
                                    onChange={(e) =>
                                        this.changeSelectedReason(
                                            parseInt(e.target.value)
                                        )
                                    }
                                    value={
                                        (this.state.selectedReason &&
                                            this.state.selectedReason.id) ||
                                        ""
                                    }
                                    disabled={
                                        this.state.selectAll ||
                                        this.state.selectedRows.length
                                    }
                                >
                                    <option key="" value="" />
                                    {this.props.reasons.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    disabled={
                                        !this.state.selectedReason &&
                                        !this.state.selectedRows.length &&
                                        !this.state.selectAll
                                    }
                                    className="btn btn-warning"
                                    onClick={bulkDeleteButtonOnClickCb}
                                >
                                    <i className="fas fa-exclamation-triangle m-r-xs" />
                                    {bulkDeleteButtonLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="ibox-content no-padding">
                        <TanStackGrid
                            tableName="failed-payment-imports"
                            manual={false}
                            data={this.state.data}
                            loading={false}
                            pages={null}
                            pagination={this.state.pagination}
                            onPaginationChange={(pagination) =>
                                this.setState({ pagination })
                            }
                            pageSizeOptions={[5, 10, 20, 25, 50, 100]}
                            columns={columns}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

export default withTranslation("payments")(FailedPaymentImportsPage);
