import _, { filter } from "lodash";
import React from "react";
import { withTranslation } from "react-i18next";
import TanStackGrid, {
    goFullScreen,
} from "../common/baseDataTable/TanStackGrid";
import Switch from "react-switch";
import { makeDebounce } from "../../tools/inputs";
import {
    csrfToken,
    ISO_DATE_FORMAT,
    findAndGet,
    optionMapper,
    reactOptionMapper,
} from "../utils";

const FILTER_STORAGE_KEY = "general_checks_list_filters";

const defaultTableProps = () => ({
    page: 0,
    pageSize: 10,
    sorted: [{ id: "cashing_date", desc: true }],
    filtered: [{ id: "check_status", value: "all" }],
    resized: [],
    expanded: {},
});

const NB_DISPLAYED_RECIPIENTS = 3;

const debounce = makeDebounce();

const requestData = (pageSize, page, sorted, filtered, format) => {
    return fetch(`/payments/checklist${format ? `.${format}` : ""}`, {
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
        .catch((reason) => alert(reason))
        .then((response) => {
            if (!format || format === "json") return response.json();
            else {
                return response.blob();
            }
        })
        .then((data) => {
            if (!format || format === "json") {
                return {
                    // TanStackGrid assumes an array (reads .length); fall back defensively rather
                    // than propagate a malformed/empty response into a render-time crash.
                    data: data.payments || [],
                    pages: data.pages,
                    rowsCount: data.rowsCount,
                    totalAmount: data.totalAmount,
                };
            } else {
                return data;
            }
        });
};

const putCheckStatus = (id, check_status) => {
    let format = "json";
    return fetch(`/payments/check_status${format ? `.${format}` : ""}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
            "X-CSRF-Token": csrfToken,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            id,
            check_status,
        }),
    });
};

class CheckList extends React.Component {
    constructor(props) {
        super(props);

        const localStorageValue = localStorage.getItem(FILTER_STORAGE_KEY);
        const filter =
            localStorageValue != null
                ? JSON.parse(localStorageValue)
                : defaultTableProps();

        this.state = {
            data: [],
            pages: null,
            bulkEdit: {},
            page: 0,
            filter,
            loading: true,
            rowsCount: 0,
            totalAmount: 0,
            targets: [],
        };

        this.fetchData = this.fetchData.bind(this);
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
    }

    fetchData(filter, delay = 400) {
        this.setState({ filter });

        debounce(() => {
            if (!this.mounted) return;
            this.setState({ loading: true, file: undefined });
            requestData(
                filter.pageSize,
                filter.page,
                filter.sorted,
                filter.filtered,
                "json"
            ).then((res) => {
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
        this.setState({ filter: defaultTableProps() }, () => {
            this.fetchData(this.state.filter);
        });
    }

    handleChangeSwitch(checked, check) {
        putCheckStatus(check.id, checked).then(() =>
            this.setState({
                data: this.state.data.map((p) => ({
                    ...p,
                    check_status: p.id === check.id ? checked : p.check_status,
                })),
            })
        );
    }

    handleChangeReferenceDate(value) {
        const filter = { ...this.state.filter };
        const indexFiltered = _.keyBy(filter.filtered, "id");
        indexFiltered.reference_date = { id: "reference_date", value };
        filter.filtered = Object.values(indexFiltered);
        this.fetchData(filter);
    }

    handleChangeRadio(event) {
        const filter = { ...this.state.filter };
        const indexFiltered = _.keyBy(filter.filtered, "id");
        indexFiltered.check_status = {
            id: "check_status",
            value: event.target.value,
        };
        filter.filtered = Object.values(indexFiltered);
        this.fetchData(filter);
    }

    render() {
        const { data, pages, loading } = this.state;
        const { t, i18n } = this.props;

        let referenceDate = this.state.filter.filtered.find(
            (obj) => obj.id === "reference_date"
        );
        referenceDate = referenceDate == undefined ? "" : referenceDate.value;

        let radioCheckValue = this.state.filter.filtered.find(
            (obj) => obj.id === "check_status"
        );
        radioCheckValue =
            radioCheckValue == undefined ? "" : radioCheckValue.value;

        const columns = [
            {
                Header: t("general.checks.columns.payer"),
                // maxWidth: 175,
                id: "users.last_name",
                Cell: (props) => {
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
                Header: t("general.checks.columns.memberNumbers"),
                // maxWidth: 100,
                id: "users.adherent_number",
                Cell: (props) => {
                    const user = _.get(
                        props.original,
                        "due_payment.payment_schedule.user"
                    );
                    let family = _.get(user, "get_users_paying_for_self");
                    family = (user.students.length ? [user] : []).concat(
                        family
                    );
                    // check for unicity
                    let familyList = [];
                    let map = new Map();
                    for (const member of family) {
                        if (!map.has(member.id)) {
                            map.set(member.id, true);
                            familyList.push(member);
                        }
                    }
                    // build the list
                    let numbersList = familyList.map(function (member, index) {
                        return (
                            <li key={index}>
                                {member.adherent_number} - {member.last_name}{" "}
                                {member.first_name}
                            </li>
                        );
                    });
                    return user && <ul>{numbersList}</ul>;
                },
                sortable: false,
                filterable: true,
            },
            {
                Header: t("general.checks.columns.amount"),
                maxWidth: 100,
                id: "payments.amount",
                style: {
                    display: "block",
                    textAlign: "right",
                },
                accessor: (d) => `${d.amount || "?"} €`,
                filterable: true,
                sortable: true,
            },
            {
                Header: t("general.checks.columns.checkNumber"),
                // maxWidth: 100,
                id: "check_number",
                style: {
                    display: "block",
                    textAlign: "right",
                },
                accessor: (d) => `${d.check_number || ""}`,
                filterable: true,
                sortable: true,
            },
            {
                Header: t("general.checks.columns.status"),
                // maxWidth: 100,
                id: "check_status",
                accessor: "check_status",
                Cell: (d) => {
                    return (
                        <label>
                            <Switch
                                className="react-switch"
                                onChange={(checked, event, id) => {
                                    return this.handleChangeSwitch(
                                        checked,
                                        d.original
                                    );
                                }}
                                checked={d.original.check_status}
                            />
                        </label>
                    );
                },
                filterable: false,
            },
        ];

        return (
            <div>
                <div
                    className="flex flex-space-between-justified flex-center-aligned reglement-table-header m-b-sm"
                    style={{ width: "100%" }}
                >
                    <div className="flex flex-center-aligned">
                        <h2 className="m-r">
                            {t("general.checks.paymentDateLabel")}
                        </h2>
                        <div
                            className="input-group"
                            data-tippy-content={t(
                                "general.checks.paymentDateTooltip"
                            )}
                            style={{ maxWidth: "200px" }}
                        >
                            <div className="input-group-addon">
                                <i className="fas fa-calendar"></i>
                            </div>
                            <input
                                id="headcount-reference"
                                type="date"
                                className="form-control"
                                value={referenceDate}
                                onChange={(e) =>
                                    this.handleChangeReferenceDate(
                                        e.target.value
                                    )
                                }
                            />
                        </div>
                        <div
                            className="m-md"
                            onChange={(e) => this.handleChangeRadio(e)}
                        >
                            <label className="radio-inline">
                                <input
                                    type="radio"
                                    value="all"
                                    name="check_status_radio"
                                    checked={radioCheckValue === "all"}
                                    onChange={() => {}}
                                />
                                {t("general.checks.allChecks")}
                            </label>
                            <label className="radio-inline">
                                <input
                                    type="radio"
                                    value="true"
                                    name="check_status_radio"
                                    checked={radioCheckValue === "true"}
                                    onChange={() => {}}
                                />
                                {t("general.checks.clearedChecks")}
                            </label>
                            <label className="radio-inline">
                                <input
                                    type="radio"
                                    value="false"
                                    name="check_status_radio"
                                    checked={radioCheckValue === "false"}
                                    onChange={() => {}}
                                />
                                {t("general.checks.unclearedChecks")}
                            </label>
                        </div>
                        <button
                            className="btn btn-primary m-r"
                            data-tippy-content={t(
                                "general.tableControls.reload"
                            )}
                            onClick={() => this.fetchData(this.state.filter)}
                        >
                            <i className="fas fa-sync" />
                        </button>
                        <button
                            data-tippy-content={t(
                                "general.tableControls.resetFilters"
                            )}
                            className="btn btn-primary m-r"
                            onClick={() => this.resetFilters()}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                        <button
                            data-tippy-content={t(
                                "general.tableControls.fullscreen"
                            )}
                            className="btn btn-primary m-r"
                            onClick={() => goFullScreen("table-checks")}
                        >
                            <i className="fas fa-expand-arrows-alt"></i>
                        </button>

                        <h2 className="m-r" style={{ whiteSpace: "nowrap" }}>
                            {t("general.checks.checkCount", {
                                n: this.state.rowsCount,
                            })}
                        </h2>
                    </div>

                    <div className="ibox-title-right">
                        <span>
                            {t("general.checks.totalAmount", {
                                amount: new Intl.NumberFormat(i18n.language, {
                                    style: "currency",
                                    currency: "EUR",
                                }).format(this.state.totalAmount),
                            })}
                        </span>
                    </div>
                </div>

                <div className="ibox-content no-padding">
                    <TanStackGrid
                        tableName="table-checks"
                        data={data}
                        pages={pages}
                        totalCount={this.state.rowsCount}
                        loading={loading}
                        columns={columns}
                        pageSizeOptions={[5, 10, 11, 15, 20, 50, 100]}
                        pagination={{
                            pageIndex:
                                this.state.filter.page <= this.state.pages
                                    ? this.state.filter.page
                                    : this.state.pages - 1,
                            pageSize: this.state.filter.pageSize,
                        }}
                        onPaginationChange={({ pageIndex, pageSize }) =>
                            this.fetchData({
                                ...this.state.filter,
                                page: pageIndex,
                                pageSize,
                            })
                        }
                        sorting={this.state.filter.sorted}
                        onSortingChange={(sorted) => {
                            if (sorted[0]?.id === "payments.amount") {
                                this.setState({
                                    data: _.orderBy(
                                        this.state.data,
                                        ["amount"],
                                        [sorted[0].desc ? "asc" : "desc"]
                                    ),
                                    filter: { ...this.state.filter, sorted },
                                });
                            } else {
                                this.fetchData({
                                    ...this.state.filter,
                                    sorted,
                                });
                            }
                        }}
                        columnFilters={this.state.filter.filtered}
                        onColumnFiltersChange={(filtered) =>
                            this.fetchData({
                                ...this.state.filter,
                                filtered,
                                page: 0,
                            })
                        }
                        minRows={1}
                    />
                </div>
            </div>
        );
    }
}

export default withTranslation("payments")(CheckList);
