import React from "react";
import { withTranslation } from "react-i18next";
import _ from "lodash";

import moment from "moment";

import ReactTable from "react-table";
import swal from "sweetalert2";
import { csrfToken } from "./utils";

const requestData = (pageSize, page, sorted, filtered) => {
    return fetch("/adhesions/list", {
        method: "POST",
        credentials: "same-origin",
        headers: {
            "X-CSRF-Token": csrfToken,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            pageSize,
            page,
            sorted: sorted[0],
            filtered,
        }),
    })
        .then(response => response.json())
        .then(data => {
            const res = {
                data: data.adhesions,
                pages: data.pages,
                total: data.total,
            };

            return res;
        });
};

class AdhesionList extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            data: [],
            pages: null,
            total: 0,
            page: 0,
            loading: true,
        };

        this.fetchData = this.fetchData.bind(this);
    }

    fetchData(state) {
        this.setState({ loading: true });

        requestData(
            state.pageSize,
            state.page,
            state.sorted,
            state.filtered
        ).then(res => {
            this.setState({
                ...res,
                loading: false,
            });
        });
    }

    handleSendReminder(id) {
        const { t } = this.props;
        const xcsrfToken = document
            .querySelector('meta[name="csrf-token"]')
            .getAttribute("content");

        swal({
            title: t("users:adhesionList.confirmReminder"),
            type: "warning",
            confirmButtonText: t("users:adhesionList.yes"),
            cancelButtonText: t("common:actions.cancel"),
            showCancelButton: true,
        }).then(a => {
            if (a.value)
                fetch(`/adhesions/${id}/reminder`, {
                    method: "POST",
                    headers: {
                        "X-CSRF-Token": xcsrfToken,
                    },
                }).then(res => {
                    if (res.ok)
                        swal(
                            t("users:adhesionList.successTitle"),
                            t("users:adhesionList.reminderSent"),
                            "success"
                        );
                });
        });
    }

    promptDelete(id) {
        const { t } = this.props;
        const xcsrfToken = document
            .querySelector('meta[name="csrf-token"]')
            .getAttribute("content");

        swal({
            title: t("users:adhesionList.confirmDelete"),
            type: "warning",
            confirmButtonText: t("users:adhesionList.yes"),
            cancelButtonText: t("common:actions.cancel"),
            showCancelButton: true,
        }).then(a => {
            if (a.value)
                fetch(`/adhesions/${id}`, {
                    method: "DELETE",
                    headers: {
                        "X-CSRF-Token": xcsrfToken,
                    },
                }).then(res => {
                    if (res.ok)
                        swal(
                            t("users:adhesionList.successTitle"),
                            t("users:adhesionList.deleted"),
                            "success"
                        ).then(() =>
                            this.setState({
                                data: this.state.data.filter(
                                    adh => adh.id !== id
                                ),
                            })
                        );
                });
        });
    }

    render() {
        const { t } = this.props;
        const { data, pages, loading } = this.state;

        const end_dates_diffs = {};

        data.forEach(adh => {
            const endDate = new Date(adh.validity_end_date);
            const diff = (endDate - new Date().getTime()) / (1000 * 3600 * 24);

            end_dates_diffs[adh.id] = diff;
        });

        const columns = [
            {
                Header: "#",
                id: "users.adherent_number",
                accessor: d => (
                    <a
                        href={`/users/${d.user.id}`}
                        className="w-100 d-flex text-dark"
                    >
                        {d.user.adherent_number}
                    </a>
                ),
                width: 100,
            },
            {
                Header: t("users:list.table.headers.lastName"),
                id: "users.last_name",
                accessor: d => (
                    <a
                        href={`/users/${d.user.id}`}
                        className="w-100 d-flex text-dark"
                    >
                        {d.user.last_name}
                    </a>
                ),
            },
            {
                Header: t("users:list.table.headers.firstName"),
                id: "users.first_name",
                accessor: d => (
                    <a
                        href={`/users/${d.user.id}`}
                        className="w-100 d-flex text-dark"
                    >
                        {d.user.first_name}
                    </a>
                ),
            },
            {
                Header: t("users:adhesionList.columns.startDate"),
                id: "validity_start_date",
                accessor: d => (
                    <a
                        href={`/users/${d.user.id}`}
                        className="w-100 d-flex text-dark"
                    >
                        {d.validity_start_date
                            ? moment(d.validity_start_date).format(
                                  "DD MMM YYYY"
                              )
                            : t("users:adhesionList.notSpecified")}
                    </a>
                ),
                filterable: false,
            },
            {
                Header: t("users:adhesionList.columns.endDate"),
                id: "validity_end_date",
                accessor: d => (
                    <a
                        href={`/users/${d.user.id}`}
                        className="w-100 d-flex text-dark"
                    >
                        {d.validity_end_date
                            ? moment(d.validity_end_date).format("DD MMM YYYY")
                            : t("users:adhesionList.notSpecified")}
                    </a>
                ),
                filterable: true,
                Filter: ({ onChange }) => (
                    <div
                        className="flex flex-center-aligned"
                        style={{ height: "100%" }}
                    >
                        <i
                            className="fas fa-exclamation-circle m-r-xs text-muted"
                            onClick={e => {
                                e.target.classList.toggle("text-muted");
                                e.target.classList.toggle("text-danger");
                                e.target.checked = !e.target.checked;
                                onChange(e.target.checked);
                            }}
                            style={{ cursor: "pointer" }}
                        />
                        <span className="text-danger">
                            {t("users:adhesionList.soonExpired")}
                        </span>
                    </div>
                ),
                Cell: d => {
                    const diff = end_dates_diffs[d.original.id];

                    return (
                        <div>
                            {d.value}
                            {diff < 30 && diff >= 0 ? (
                                <span className="m-l-md text-danger">
                                    <i className="fas fa-exclamation-circle m-r-xs" />
                                    {t("users:adhesionList.expiresInDays", {
                                        count: Math.ceil(diff),
                                    })}
                                </span>
                            ) : null}
                        </div>
                    );
                },
            },
            {
                id: "adhesion_prices.price",
                Header: t("users:adhesionList.columns.price"),
                filterable: false,
                sortable: true,
                accessor: d => (d.adhesion_price || {}).price,
            },
            {
                Header: t("users:list.table.headers.actions"),
                filterable: false,
                sortable: false,
                maxWidth: 100,
                Cell: d => (
                    <div className="flex flex-space-around-justified flex-center-aligned">
                        <button
                            onClick={() => this.promptDelete(d.original.id)}
                            className="btn btn-warning btn-xs"
                        >
                            <i className="fas fa-trash" />
                        </button>
                        {end_dates_diffs[d.original.id] < 30 ? (
                            <button
                                className="btn btn-danger btn-xs"
                                onClick={() =>
                                    this.handleSendReminder(d.original.id)
                                }
                            >
                                <i className="fas fa-envelope" />
                            </button>
                        ) : null}
                    </div>
                ),
            },
            {
                Header: t("users:adhesionList.columns.lastReminder"),
                id: "last_reminder",
                accessor: d => (
                    <a
                        href={`/users/${d.user.id}`}
                        className="w-100 d-flex text-dark"
                    >
                        {d.last_reminder
                            ? moment(d.last_reminder).format("DD MMM YYYY")
                            : t("users:adhesionList.notSpecified")}
                    </a>
                ),
                filterable: false,
            },
        ];

        return (
            <div>
                <ReactTable
                    data={data}
                    manual
                    pages={pages}
                    loading={loading}
                    onFetchData={this.fetchData}
                    columns={columns}
                    defaultSorted={[{ id: "validity_end_date", desc: true }]}
                    filterable
                    resizable={false}
                    previousText={t("common:reactTable.previousText")}
                    nextText={t("common:reactTable.nextText")}
                    loadingText={t("common:reactTable.loadingText")}
                    noDataText={t("common:reactTable.noDataText")}
                    pageText={t("common:reactTable.pageText")}
                    ofText={t("common:reactTable.ofText")}
                    rowsText={t("common:reactTable.rowsText")}
                    minRows={1}
                />

                <div className="flex flex-center-justified m-t-xs">
                    <h3>
                        {t("users:adhesionList.totalCount", {
                            count: this.state.total,
                        })}
                    </h3>
                </div>
            </div>
        );
    }
}

export default withTranslation("users")(AdhesionList);
