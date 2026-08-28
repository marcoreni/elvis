import _ from "lodash";
import React from "react";
import ReactTableFullScreen from "../ReactTableFullScreen";
import swal from "sweetalert2";
import { withTranslation, useTranslation } from "react-i18next";
import {makeDebounce} from "../../tools/inputs";
import {
    csrfToken,
    findAndGet,
    optionMapper,
    reactOptionMapper,
} from "../utils";
import MessageModal from "./MessageModal";
import DateRangePicker from "../utils/DateRangePicker";
import * as api from "../../tools/api";
import * as PaymentStatus from "../utils/PaymentStatuses";

const moment = require("moment");

const FILTER_STORAGE_KEY = "general_payments_list_filters";

const PAYMENT_STATUS = {
    VALIDATED: 1,
    FAILED: 2,
    PENDING: 3,
    UNPAID: 4
};

const defaultTableProps = () => ({
    page: 0,
    pageSize: 11,
    sorted: [{id: "cashing_date"}],
    filtered: [],
    resized: [],
    expanded: {},
});

const NB_DISPLAYED_RECIPIENTS = 3;
const MESSAGE_MODAL_ID = "messagesModal";

const debounce = makeDebounce();

const pageSizeOptions = [5, 10, 11, 15, 20, 50, 100];

const requestData = (pageSize, page, sorted, filtered, format) => {
    return fetch(`/payments/list${format ? `.${format}` : ""}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
            "X-CSRF-Token": csrfToken,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            pageSize,
            page,
            sorted: sorted[0],
            filtered,
        }),
    })
        .catch(reason => alert(reason))
        .then(response => {
            if (!format || format === "json") return response.json();
            else {
                return response.blob();
            }
        })
        .then(data => {
            if (!format || format === "json") {
                return {
                    data: data.payments,
                    pages: data.pages,
                    rowsCount: data.rowsCount,
                    totalAmount: data.totalAmount,
                };
            } else {
                return data;
            }
        });
};

class PaymentList extends React.Component {
    constructor(props) {
        super(props);

        const { t } = props;

        const localStorageValue = localStorage.getItem(FILTER_STORAGE_KEY);
        const filter =
            localStorageValue != null
                ? JSON.parse(localStorageValue)
                : defaultTableProps();


        const columns = [
            {
                Header: "",
                id: "selection",
                width: 25,
                sortable: false,
                Filter: () => (
                    <input
                        type="checkbox"
                        checked={
                            this.state.targets === "all" ||
                            this.state.targets.length === this.state.data.length
                        }
                        onChange={e =>
                            e.target.checked
                                ? this.setState({
                                    targets: this.state.data.map(r => r.id),
                                    targetStatus: (this.state.data.filter(r => {return r.payment_status_id === PaymentStatus.UNPAID_ID})
                                        .map(r => r.id)),
                                })
                                : this.setState({
                                    targets: [],
                                    targetStatus: []
                                })
                        }
                    />
                ),
                Cell: d => <input
                            type="checkbox"
                            checked={this.state.targets === "all" || this.state.targets.includes(d.original.id)}
                            onChange={e => {
                                    console.log(d);
                                    this.updateTarget(d.original.id, e.target.checked, d.original.payment_status_id)
                                }
                            }
                        />,
            },
            {
                Header: t("general.payments.columns.number"),
                id: "number",
                maxWidth: 70,
                accessor: d => d.number,
                Filter: ({onChange, filter}) => {
                    let nextValue = "t";
                    let badgeClass = "badge ";
                    let label = t("general.numberFilter.all");

                    switch ((filter && filter.value) || "") {
                        case "t":
                            nextValue = "f";
                            badgeClass += "badge-primary";
                            label = t("general.numberFilter.member");
                            break;
                        case "f":
                            nextValue = "";
                            badgeClass += "badge-warning";
                            label = t("general.numberFilter.nonMember");
                            break;
                    }

                    return (
                        <div
                            style={{height: "100%"}}
                            className="flex flex-center-aligned flex-center-justified"
                        >
                            <span
                                className={badgeClass}
                                style={{
                                    padding: "initial 10px initial 10px",
                                    cursor: "pointer",
                                }}
                                onClick={e => onChange(nextValue)}
                            >
                                {label}
                            </span>
                        </div>
                    );
                },
            },
            {
                Header: t("general.payments.columns.status"),
                id: "payment_status_id",
                maxWidth: 75,
                className: "flex flex-center-justified",
                accessor: d => d.payment_status_id,
                Cell: c => this.renderStatus(c),
                //filterable: true,
                Filter: ({filter, onChange}) => (
                    <select
                        onChange={event => {
                            console.log("Selected value:", event.target.value);
                            onChange(event.target.value)
                        }}
                        style={{width: "100%"}}
                        value={filter ? filter.value : ""}
                    >
                        <option value="all">{t("general.numberFilter.all")}</option>
                        <option value={0}>{t("general.payments.statusNone")}</option>
                        {this.props.paymentStatuses.map(method => (
                            <option key={method.id} value={method.id}>
                                {method.label}
                            </option>
                        ))}
                    </select>
                ),
            },
            {
                Header: t("general.payments.columns.cashingDate"),
                id: "cashing_date",
                width: 320,
                accessor: p =>
                    moment(p.cashing_date)
                        .local()
                        .format("DD/MM/YYYY"),
                Filter: ({filter, onChange}) => {
                    const start = _.get(filter, "value.start");
                    const end = _.get(filter, "value.end");

                    return (
                        <React.Fragment>
                            <DateRangePicker
                                onChange={onChange}
                                defaultStart={start}
                                defaultEnd={end}
                            />
                        </React.Fragment>
                    );
                },
            },
            {
                Header: t("general.payments.columns.paymentMethod"),
                id: "payment_method_id",
                sortable: false,
                accessor: p => {
                    const pm = _.find(
                        this.props.paymentMethods,
                        pm => pm.id == p.payment_method_id
                    );

                    return pm ? pm.label : t("general.payments.noPaymentMethod");
                },
                Filter: ({filter, onChange}) => (
                    <select
                        onChange={event => onChange(event.target.value)}
                        style={{width: "100%"}}
                        value={filter ? filter.value : ""}
                    >
                        <option key={-2} value=""/>
                        <option key={-1} value="null">
                            {t("general.noPaymentMethodOption")}
                        </option>
                        {_.orderBy(
                            this.props.paymentMethods,
                            pm => pm.label
                        ).map(method => (
                            <option key={method.id} value={method.id}>
                                {method.label}
                            </option>
                        ))}
                    </select>
                ),
            },
            {
                Header: t("general.payments.columns.payer"),
                maxWidth: 175,
                id: "users.last_name",
                Cell: props => {
                    const user = _.get(
                        props.original,
                        "due_payment.payment_schedule.user"
                    );
                    return (
                        (user && (
                            <a href={`/payments/summary/${user.id}`}>
                                {`${user.last_name} ${user.first_name}`}
                            </a>
                        )) ||
                        t("general.unknownPayer")
                    );
                },
            },
            {
                Header: t("general.payments.columns.location"),
                id: "location_id",
                maxWidth: 120,
                accessor: d =>
                    d.location_id && this.props.locations[d.location_id].label,
                Filter: ({filter, onChange}) => (
                    <select
                        value={(filter && filter.value) || ""}
                        onChange={e => onChange(e.target.value)}
                    >
                        <option value=""/>
                        {_.orderBy(
                            Object.values(this.props.locations),
                            l => l.label
                        ).map(l => (
                            <option key={l.id} value={l.id}>
                                {l.label}
                            </option>
                        ))}
                    </select>
                ),
            },
            {
                Header: t("general.payments.columns.amount"),
                maxWidth: 100,
                id: "amount",
                style: {
                    display: "block",
                    textAlign: "right",
                },
                accessor: d => `${d.amount || "?"} €`,
                filterable: true,
                sortable: false,
            },
            // n'est plus utilisé depuis la mise en place de la nouvelle interface d'envoi de mail
            // {
            //     Header: "Actions",
            //     maxWidth: 75,
            //     id: "actions",
            //     filterable: false,
            //     sortable: false,
            //     accessor: p => ({
            //         userId: p.due_payment.payment_schedule.payable_id,
            //         mail: p.payment_status_id !== PAYMENT_STATUS.VALIDATED,
            //     }),
            //     Cell: d => (
            //         <div className="flex">
            //             {d.value.mail ? (
            //                 <button
            //                     data-toggle="modal"
            //                     onClick={() =>
            //                         this.setState({targets: [d.original.id]})
            //                     }
            //                     data-target={`#${MESSAGE_MODAL_ID}`}
            //                     className="btn btn-xs btn-primary"
            //                     title="Envoyer un rappel"
            //                 >
            //                     <i className="fas fa-envelope"/>
            //                 </button>
            //             ) : null}
            //         </div>
            //     ),
            // },
        ];

        this.state = {
            columns: columns,
            data: [],
            pages: null,
            message: {
                title: t("general.reminder.defaultTitle"),
                content: "",
                isEmail: true,
                isSMS: false,
            },
            bulkEdit: {},
            page: 0,
            filter,
            loading: true,
            rowsCount: 0,
            totalAmount: 0,
            targets: [],
            targetStatus: [],
            csv_export_loading: false,
        };

        this.fetchData = this.fetchData.bind(this);
        this.downloadFile = this.downloadFile.bind(this);
        this.returnBlob = this.returnBlob.bind(this);
        this.onCsvExport = this.onCsvExport.bind(this);
    }

    componentDidMount() {
        this.mounted = true;
        this.fetchData(this.state.filter, 0);
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    componentDidUpdate() {
        localStorage.setItem(
            FILTER_STORAGE_KEY,
            JSON.stringify(this.state.filter)
        );

        loadTippy(getTippyNodes());
    }

    fetchData(filter, delay = 400) {
        this.setState({filter});

        debounce(() => {
            if (!this.mounted) return;
            this.setState({loading: true, file: undefined});
            requestData(
                filter.pageSize,
                filter.page,
                filter.sorted,
                filter.filtered,
                "json"
            ).then(res => {
                if (!this.mounted) return;

                this.setState({
                    ...res,
                    loading: false,
                });
            });
        }, delay);
    }

    resetFilters() {
        localStorage.setItem(
            FILTER_STORAGE_KEY,
            JSON.stringify(defaultTableProps())
        );
        this.setState({filter: defaultTableProps()}, () => {
            this.fetchData(this.state.filter);
        });
    }

    handleChangeSeason(value) {
        const filter = {...this.state.filter};

        const indexFiltered = _.keyBy(filter.filtered, "id");

        if (value) indexFiltered.season_id = {id: "season_id", value};
        else delete indexFiltered.season_id;

        filter.filtered = Object.values(indexFiltered);

        this.fetchData(filter);
    }

    returnBlob(res) {
        if (res.headers.has("content-disposition")) {

            const content = res.headers.get("content-disposition");
            const match = content.match(/filename=\"(.*)\"/);
            if (match) {
                this.filename = match[1]
            }
        }
        return res.blob();
    }

    downloadFile(file) {
        const download = document.createElement("a");
        download.download = this.filename || `${moment().format(
            "DD_MM_YYYY-HH_mm_ss"
        )}.csv`;
        download.href = URL.createObjectURL(file);
        document.body.appendChild(download);
        download.click();
        document.body.removeChild(download);
    }

    onCsvExport() {
        this.setState({csv_export_loading: true})
        const filter = this.state.filter.filtered;
        let ids = [];

        if(this.state.targets === "all")
        {
            ids = "all";
        }
        else
        {
            ids = this.state.targets && this.state.targets.length > 0 ? this.state.targets : this.state.data.map(d => d.id);
        }

        let searchParams;

        if (ids === "all") {
            searchParams = new URLSearchParams({
                filtered: JSON.stringify(filter),
                stream: true
            });
        } else {
            searchParams = new URLSearchParams({
                list: JSON.stringify(ids),
                stream: true
            });
        }

        const url = `/payments/export?${searchParams.toString()}`
        fetch(url, {
            method: "GET",
            credentials: "same-origin",
            headers: {
                "X-CSRF-Token": csrfToken,
                "Content-Type": "application/json",
            }
        }).then(res => this.returnBlob(res))
            .then(file => this.downloadFile(file))
            .then(() => this.setState({csv_export_loading: false}));
    }

    sendReminderMail() {
        const { t } = this.props;

        const to = _.uniq(
            this.state.data
                .filter(
                    ({id, payment_status_id}) =>
                        this.state.targets.includes(id) &&
                        (payment_status_id === PAYMENT_STATUS.UNPAID || payment_status_id === PAYMENT_STATUS.PENDING)
                )
                .map(d => _.get(d, "payment_schedule.user.id"))
                .filter(id => id)
        );

        swal({
            title: t("general.reminder.confirmSendTitle"),
            text: t("common:confirm.sure"),
            type: "question",
            showCancelButton: true,
        })
            .then(v => {
                if (v.value) {
                    return fetch("/messages/create", {
                        method: "POST",
                        headers: {
                            "X-Csrf-Token": csrfToken,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            message: this.state.message,
                            to,
                        }),
                    });
                }
            })
            .then(res => {
                if (res) {
                    if (res.ok)
                        swal({
                            title: t("general.reminder.successTitle"),
                            text: t("general.reminder.successText"),
                            type: "success",
                        });
                    else
                        throw new Error(
                            t("general.reminder.errorStatus", {
                                status: res.status,
                                statusText: res.statusText,
                            })
                        );
                }
            })
            .catch(reason =>
                swal({
                    title: t("general.reminder.errorTitle"),
                    text: reason,
                    type: "error",
                })
            );
    }

    sendPaymentMail() {
        const { t } = this.props;

        swal({
            title: t("general.paymentMail.title"),
            text: t("general.payments.paymentMailText"),
            type: "question",
            showCancelButton: true,
            cancelButtonText: t("common:actions.cancel"),
        }).then(res => {
            if (res.value) {
                api.set()
                    .success(res => {
                        if (res.status === "success")
                            swal({title: t("general.paymentMail.successTitle"), text: t("general.paymentMail.successText"), type: "success"});
                    })
                    .error(errorMsg => {
                        swal({
                            type: "error",
                            title: t("general.paymentMail.errorTitle"),
                            text: errorMsg,
                        });
                    })
                    .post(
                        `/payments/send_reglement_mail`,{
                            targets: this.state.targetStatus,
                        }
                    );
            }
        });
    }

    submitBulkEdit() {
        fetch("/due_payments/bulkedit/general", {
            method: "POST",
            headers: {
                "X-Csrf-Token": csrfToken,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                targets: this.state.targets,
                filter: this.state.targets === "all" ? this.state.filter : null,
                due_payment: {
                    ...this.state.bulkEdit,
                },
            }),
        }).then(res => {
            if (res.ok) {
                let targets =
                    this.state.targets === "all"
                        ? this.state.data.map(d => d.id)
                        : this.state.targets;

                let data = [...this.state.data].map(d => {
                    if (targets.includes(d.id))
                        return {
                            ...d,
                            ...this.state.bulkEdit,
                        };

                    return {
                        ...d,
                    };
                });

                this.setState({
                    data,
                });
            }
        });
    }

    renderStatus(cell) {
        const { t } = this.props;

        let status = this.props.paymentStatuses.find(s => s.id === cell.value);
        let paymentId = cell.original.id;

        return (
            <div
                className="badge"
                value={status ? status.id : 0}
                style={{
                    background: status ? status.color : "grey",
                    color: "white",
                    cursor: "pointer",
                }}
                onClick={e => this.promptStatusEdit(paymentId, status.id)}
            >
                {status ? status.label : t("general.payments.statusNone")}
            </div>
        );
    }

    updateTarget(id, checked, status) {
        if (checked) {
            //add target to bulk targets list
            this.setState({
                targets: [...this.state.targets, id]
            });

            if (status === PaymentStatus.UNPAID_ID)
                this.setState({targetStatus: [...this.state.targetStatus, id]});

        } else {
            if (this.state.targets === "all")
                this.setState({
                    targets: this.state.data
                        .map(d => d.id)
                        .filter(d => d !== id),
                });
            else
                this.setState({
                    targets: this.state.targets.filter(r => r !== id),
                    targetStatus: this.state.targetStatus.filter(r => r !== id),
                });
        }
    }

    //Goto ActivitiesApplicationsList#bulkAlert
    targetsAlert() {
        const { t } = this.props;

        const count =
            (this.state.targets === "all" && this.state.rowsCount) ||
            this.state.targets.length;

        return (
            <div className="alert alert-info m-t-sm" style={{width: "100%"}}>
                <div className="flex flex-space-between-justified flex-center-aligned">
                    <div id="targets-infos">
                        {t("general.payments.selectedCount", { n: count })}{" "}
                        {this.state.targets.length === this.state.data.length &&
                        Math.max(
                            this.state.rowsCount - this.state.targets.length,
                            0
                        ) ? (
                            <button
                                onClick={() =>
                                    this.setState({targets: "all"})
                                }
                                className="btn btn-sm btn-info m-l-sm"
                            >
                                {t("general.selectRemaining", {
                                    n:
                                        this.state.rowsCount -
                                        this.state.targets.length,
                                })}
                            </button>
                        ) : null}
                    </div>
                    <div id="targets-actions">
                        {this.state.targetStatus.length > 0 || this.state.targets.length === this.state.data.length ? (
                            <button
                                className="btn btn-sm btn-primary m-r animated"
                                disabled={this.state.targets === "all"}
                                data-toggle="modal"
                                onClick={() => this.sendPaymentMail()}
                            >
                                {t("general.payments.sendUnpaidMail")}
                            </button>
                        ) : ""}
                        <button
                            className="btn btn-danger btn-sm"
                            onClick={this.bulkDelete.bind(this)}
                        >
                            {t("common:actions.delete")}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    bulkDelete() {
        const { t } = this.props;

        swal({
            title: t("general.bulkDeleteTitle"),
            text: t("general.payments.bulkDeleteText"),
            type: "question",
            showCancelButton: true,
            cancelButtonText: t("common:actions.cancel"),
        }).then(r => {
            if (r.value) {
                fetch("/payments/bulkdelete", {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-Token": csrfToken,
                    },
                    body: JSON.stringify({
                        targets: this.state.targets,
                    }),
                })
                    .catch(res => console.error(res))
                    .then(res => res.json())
                    .then(res => {
                        this.setState({
                            data: this.state.data.filter(
                                d => !this.state.targets.includes(d.id)
                            ),
                            targets: [],
                        });
                    });
            }
        });
    }

    handleFilesDropped(files) {
        const { t } = this.props;

        const body = new FormData();
        body.append("file", files[0]);

        fetch("/payments/import_file", {
            headers: {
                "X-CSRF-Token": csrfToken,
            },
            method: "POST",
            body,
        })
            .then(res => res.json())
            .then(res => {
                swal({
                    type: "info",
                    title: t("general.payments.importResults.title"),
                    text: t("general.payments.importResults.text", {
                        inserted: res.inserted,
                        failed: res.failed,
                        ignored: res.ignored,
                    }),
                }).then(() =>
                    this.setState({
                        failedCount: this.state.failedCount + res.failed,
                    })
                );
            });
    }

    promptStatusEdit(id, statusId) {
        const { t } = this.props;

        swal({
            title: t("general.statusEdit.title"),
            type: "warning",
            confirmButtonText: t("common:actions.validate"),
            input: "select",
            inputOptions: _.zipObject(
                this.props.statuses.map(status => status.id),
                this.props.statuses.map(status => status.label)
            ),
            inputClass: "form-control",
            inputValue: statusId,
            showCancelButton: true,
            cancelButtonText: t("common:actions.cancel"),
        }).then(res => {
            const newStatusId = res.value;
            if (newStatusId) {
                fetch("/payments/edit_status", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-Token": csrfToken,
                    },
                    body: JSON.stringify({id, status: res.value}),
                }).then(res => {
                    if (!res.ok) swal(t("general.statusEditFailed"), "", "error");
                    else
                        this.setState({
                            data: this.state.data.map(p => {
                                if (p.id === id) {
                                    return {
                                        ...p,
                                        payment_status_id: parseInt(newStatusId),
                                    };
                                }

                                return p;
                            }),
                        });
                });
            }
        });
    }

    render() {
        const {data, pages, loading} = this.state;
        const { t } = this.props;

        const duePaymentMethodsOptions = [
            {
                label: t("general.noPaymentMethodOption"),
                value: "null",
            },
            ..._.map(this.props.paymentMethods, reactOptionMapper()),
        ];

        const totalRecipients = _.chain(this.state.data)
            .filter(
                d =>
                    (d.payment_status_id === PAYMENT_STATUS.UNPAID || d.payment_status_id === PAYMENT_STATUS.PENDING) &&
                    (this.state.targets === "all" ||
                        this.state.targets.includes(d.id))
            )
            .map(d => _.get(d, "payment_schedule.user"))
            .compact()
            .uniqBy(u => u.id)
            .value();

        let recipientsToDisplay = totalRecipients.slice(
            0,
            NB_DISPLAYED_RECIPIENTS
        );

        let recipients = recipientsToDisplay
            .map(u => `${u.first_name} ${u.last_name}`)
            .join(", ");

        const restCount = Math.max(
            0,
            this.state.targets === "all"
                ? this.state.total - NB_DISPLAYED_RECIPIENTS
                : totalRecipients.length - NB_DISPLAYED_RECIPIENTS
        );
        if (restCount)
            recipients += t("general.reminder.andNOthers", { n: restCount });

        const filteredSeasonId =
            findAndGet(
                this.state.filter.filtered,
                f => f.id === "season_id",
                "value"
            ) || "";

        const events = [];

        return (
            <div>
                <div
                    className="flex flex-space-between-justified flex-center-aligned reglement-table-header m-b-sm"
                    style={{width: "100%"}}
                >
                    <div className="flex flex-center-aligned">
                        <h2 className="m-r">
                            {t("general.payments.rowCount", { n: this.state.rowsCount })}
                        </h2>
                        <button
                            className="btn btn-primary m-r-sm"
                            data-tippy-content={t("general.tableControls.reload")}
                            onClick={() => this.fetchData(this.state.filter)}
                        >
                            <i className="fas fa-sync"/>
                        </button>
                        <button
                            data-tippy-content={t("general.tableControls.resetFilters")}
                            className="btn btn-primary m-r"
                            onClick={() => this.resetFilters()}
                        >
                            <i className="fas fa-times"></i>
                        </button>

                        <button
                            data-tippy-content={t("general.tableControls.fullscreen")}
                            className="btn btn-primary m-r"
                            onClick={() => events[0]()}
                        >
                            <i className="fas fa-expand-arrows-alt"></i>
                        </button>

                        <select
                            onChange={e =>
                                this.handleChangeSeason(e.target.value)
                            }
                            value={filteredSeasonId}
                            className="form-control m-r"
                        >
                            <option value="">{t("general.seasonFilter")}</option>
                            {this.props.seasons.map(optionMapper())}
                        </select>

                        <button
                            className="btn btn-primary"
                            data-tippy-content={t("general.csvExport.prefix") + (this.state.targets.length > 0 ? t("general.csvExport.scopeSelected", { n: this.state.targets === "all" ? this.state.rowsCount : this.state.targets.length }) : t("general.csvExport.scopeAll"))}
                            onClick={() => {this.onCsvExport()}}
                            disabled={this.state.csv_export_loading}
                        >
                            {this.state.csv_export_loading ? <i className="fas fa-circle-notch fa-spin"/> : <i className="fas fa-upload"/>}
                        </button>

                        {/*todo: restore import functionnality... so do not delete */}
                        {/*<a*/}
                        {/*    href="/payments/failed_imports"*/}
                        {/*    className="btn btn-primary"*/}
                        {/*    data-tippy-content="Imports ratés"*/}
                        {/*    style={{height: "100%"}}*/}
                        {/*>*/}
                        {/*    <i className="fas fa-eye m-r-sm"/>*/}
                        {/*    {this.state.failedCount > 100*/}
                        {/*        ? "100+"*/}
                        {/*        : this.state.failedCount || "0"}*/}
                        {/*</a>*/}
                    </div>

                    <div className="ibox-title-right">
                        <span>
                            {t("general.payments.totalPayments", {
                                amount: new Intl.NumberFormat("fr-FR", {
                                    style: "currency",
                                    currency: "EUR",
                                }).format(this.state.totalAmount),
                            })}
                        </span>
                    </div>
                </div>
                {this.state.targets.length > 0 ? this.targetsAlert() : null}

                <div className="ibox-content no-padding">
                    <ReactTableFullScreen
                        events={events}
                        data={data}
                        manual
                        pages={pages}
                        loading={loading}
                        columns={this.state.columns}
                        pageSizeOptions={pageSizeOptions}
                        page={
                            this.state.filter.page <= this.state.pages
                                ? this.state.filter.page
                                : this.state.pages - 1
                        }
                        pageSize={this.state.filter.pageSize}
                        sorted={this.state.filter.sorted}
                        filtered={this.state.filter.filtered}
                        onPageChange={page =>
                            this.fetchData({...this.state.filter, page})
                        }
                        onPageSizeChange={(pageSize, page) =>
                            this.fetchData({
                                ...this.state.filter,
                                page,
                                pageSize,
                            })
                        }
                        onSortedChange={sorted =>
                            this.fetchData({...this.state.filter, sorted})
                        }
                        onFilteredChange={filtered =>
                            this.fetchData({
                                ...this.state.filter,
                                filtered,
                            })
                        }
                        filterable
                        resizable={false}
                        previousText={t("common:reactTable.previousText")}
                        nextText={t("common:reactTable.nextText")}
                        loadingText={t("common:reactTable.loadingText")}
                        noDataText={t("common:reactTable.noDataText")}
                        pageText={t("common:reactTable.pageText")}
                        ofText={t("common:reactTable.ofText")}
                        rowsText={t("common:reactTable.rowsText")}
                        minRows={8}
                        SubComponent={row => {
                            return (
                                <SubDuePayment
                                    data={row.original.due_payment}
                                    paymentMethods={this.props.paymentMethods}
                                />
                            );
                        }}
                    />
                </div>
                <MessageModal
                    id={MESSAGE_MODAL_ID}
                    recipients={recipients}
                    message={this.state.message}
                    onChange={e =>
                        this.setState({
                            message: {
                                ...this.state.message,
                                [e.target.name]: e.target.value,
                            },
                        })
                    }
                    onSend={() => this.sendReminderMail()}
                />
            </div>
        );
    }
}

function SubDuePayment({data, paymentMethods}) {
    const { t } = useTranslation("payments");

    const paymentMethod = paymentMethods.find(
        pm => pm.id === data.payment_method_id
    );

    return (
        <table className="table table-striped">
            <thead>
            <tr>
                <th>{t("general.payments.subDuePayment.number")}</th>
                <th>{t("general.payments.subDuePayment.previsionalDate")}</th>
                <th>{t("general.payments.subDuePayment.paymentMethod")}</th>
                <th>{t("general.payments.subDuePayment.amount")}</th>
            </tr>
            </thead>
            <tbody>
            <tr>
                <td>{data.number}</td>
                <td>{data.previsional_date}</td>
                <td>{paymentMethod && paymentMethod.label}</td>
                <td>{data.adjusted_amount}</td>
            </tr>
            </tbody>
        </table>
    );
}

export default withTranslation("payments")(PaymentList);
