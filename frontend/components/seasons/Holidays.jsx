import React from "react";
import ReactTable from "react-table";
import { ceil } from "lodash";
import swal from "sweetalert2";
import { withTranslation } from "react-i18next";
import { csrfToken } from "../utils";
import "../../tools/format";
import { toLocaleDate } from "../../tools/format";

class Holidays extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            datas: this.props.datas.slice(0, 15) || [],
            pageSize: 15,
            pages: ceil((this.props.datas || []).length / 15),
            sauv: (this.props.datas || []).slice(),
        };

        this.changeData = this.changeData.bind(this);
        this.addModal = this.addModal.bind(this);
        this.fetchModal = this.fetchModal.bind(this);
    }

    getColumns() {
        const { t } = this.props;

        return [
            {
                Header: t("planning:holidays.columns.label"),
                accessor: "label",
                sortable: true,
            },
            {
                Header: t("planning:holidays.columns.start"),
                accessor: "start",
                sortable: true,
                Cell: props => (
                    <div
                        className="text-center"
                        title={t("planning:holidays.dateHint")}
                    >
                        {toLocaleDate(new Date(props.original.start))}
                    </div>
                ),
            },
            {
                Header: t("planning:holidays.columns.end"),
                accessor: "end",
                sortable: true,
                Cell: props => (
                    <div
                        className="text-center"
                        title={t("planning:holidays.dateHint")}
                    >
                        {toLocaleDate(new Date(props.original.end))}
                    </div>
                ),
            },
            {
                Header: t("planning:holidays.columns.action"),
                sortable: false,
                width: 75,
                Cell: props => {
                    return (
                        <div className="btn-wrapper text-center">
                            <button
                                type={"button"}
                                className="btn btn-xs btn-primary m-r-sm m-b-sm"
                                onClick={() => this.deleteModal(props)}
                            >
                                <i className="fas fa-trash" />
                            </button>
                        </div>
                    );
                },
            },
        ];
    }

    changeData(state) {
        const columns_sort =
            state.sorted.length > 0 ? state.sorted[0].id : undefined;

        let data = this.state.sauv.slice();

        if (columns_sort !== undefined) {
            data = data.sort((h1, h2) => {
                if (h1[columns_sort] < h2[columns_sort]) return -1;
                if (h1[columns_sort] == h2[columns_sort]) return 0;
                if (h1[columns_sort] > h2[columns_sort]) return 1;
            });

            if (state.sorted[0].desc) data = data.reverse();
        }

        this.setState({
            datas: data.slice(
                state.pageSize * state.page,
                state.pageSize * (state.page + 1)
            ),
            pages: ceil(data.length / state.pageSize),
            pageSize: state.pageSize,
        });
    }

    addModal() {
        const { t } = this.props;

        swal({
            title: t("planning:holidays.addModal.title"),
            confirmButtonText: t("common:actions.confirm"),
            cancelButtonText: t("common:actions.cancel"),
            showCancelButton: true,
            showLoaderOnConfirm: true,
            input: "text",
            html:
                '<div class="form-group text-center text-danger font-bold h5" id="er"></div>' +
                '<div class="form-group text-left">' +
                `<label>${t("planning:holidays.addModal.startLabel")}</label>` +
                '<input class="form-control" type="date" id="ds" />' +
                "</div>" +
                '<div class="form-group text-left">' +
                `<label>${t("planning:holidays.addModal.endLabel")}</label>` +
                '<input class="form-control" type="date" id="de" />' +
                "</div>" +
                '<div class="text-left">' +
                `<label>${t("planning:holidays.addModal.labelLabel")}</label>` +
                "</div>",
            preConfirm: data => {
                const er = $("#er");
                er.text("");

                const dateStart = $("#ds").val();
                const dateEnd = $("#de").val();
                const start = Date.parse(dateStart);
                const end = Date.parse(dateEnd);

                if (
                    dateStart == "" ||
                    dateEnd == "" ||
                    data === undefined ||
                    data === ""
                ) {
                    er.text(t("planning:holidays.addModal.errEmptyField"));

                    return false;
                }

                if (start > end) {
                    er.text(t("planning:holidays.addModal.errStartAfterEnd"));

                    return false;
                }

                // > 3 mois ?
                if (end - start > 3 * 31 * 24 * 60 * 60 * 1000) {
                    er.text(t("planning:holidays.addModal.errTooLong"));

                    return false;
                }

                return fetch(`/season/${this.props.sid}/holidays`, {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "X-CSRF-Token": csrfToken,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        label: data,
                        start: dateStart,
                        end: dateEnd,
                    }),
                }).then(response => {
                    return response.json();
                });
            },
        }).then(result => {
            if (result.value) {
                const sauv = this.state.sauv.slice();
                const datas = this.state.datas;

                sauv.push(result.value);
                datas.push(result.value);

                this.setState({
                    sauv,
                    datas: datas.slice(0, this.state.pageSize),
                    pages: ceil(datas.length / this.state.pageSize),
                });
            }
        });

        return false;
    }

    fetchModal() {
        const { t } = this.props;

        swal({
            title: t("planning:holidays.fetchModal.title"),
            confirmButtonText: t("common:actions.confirm"),
            cancelButtonText: t("common:actions.cancel"),
            showCancelButton: true,
            showLoaderOnConfirm: true,

            preConfirm: data => {
                return fetch(`/season/${this.props.sid}/fetch_holidays`, {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "X-CSRF-Token": csrfToken,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: null,
                }).then(response => {
                    return response.json();
                });
            },
        }).then(result => {
            if (result.value) {
                // on réinitialise complètement les données du tableau
                const sauv = [];
                const datas = [];

                for (const elt of result.value) {
                    sauv.push(elt);
                    datas.push(elt);
                }

                this.setState({
                    sauv,
                    datas: datas.slice(0, this.state.pageSize),
                    pages: ceil(datas.length / this.state.pageSize),
                });
            }
        });

        return false;
    }

    deleteModal(props) {
        const { t } = this.props;

        swal({
            title: t("planning:holidays.deleteModal.title", {
                label: props.original.label,
            }),
            confirmButtonText: t("common:actions.confirm"),
            cancelButtonText: t("common:actions.cancel"),
            showCancelButton: true,
            showLoaderOnConfirm: true,
            type: "question",
            preConfirm: () => {
                return fetch(`/season/${this.props.sid}/holidays`, {
                    method: "DELETE",
                    credentials: "same-origin",
                    headers: {
                        "X-CSRF-Token": csrfToken,
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        label: props.original.label,
                        start: props.original.start,
                        end: props.original.end,
                    }),
                }).then(response => response.json());
            },
        }).then(data => {
            if (data.value) {
                const sauv = this.state.sauv.filter(
                    s =>
                        s["label"] !== props.original.label &&
                        s["start"] !== props.original.start &&
                        s["end"] !== props.original.end
                );
                const datas = this.state.datas.filter(
                    s =>
                        s["label"] !== props.original.label &&
                        s["start"] !== props.original.start &&
                        s["end"] !== props.original.end
                );

                this.setState({ sauv, datas });
            }
        });
    }

    // =============================
    // SELECT HOLIDAYS ZONES MODAL
    // =============================
    handleOpenSelectZones(newInterval) {
        this.setState({
            isSelectZonesModalOpen: true,
        });
    }

    afterOpenSelectZonesModal() {
        // bla bla
    }
    closeSelectZonesModal() {
        this.setState({ isSelectZonesModalOpen: false });
    }

    handleFetchHolidays() {}

    render() {
        const { t } = this.props;

        return (
            <div>
                <div className="row">
                    <div className="col-sm-4 col-md-4 col-xs-4 col-lg-4">
                        <label>{t("planning:holidays.sectionTitle")}</label>
                    </div>

                    <div className="col-sm-8 col-md-8 col-xs-8 col-lg-8 text-right">
                        <button
                            className="btn btn-primary m-b-sm"
                            onClick={this.fetchModal}
                            type="button"
                        >
                            <i className="fas fa-plus m-r-sm" />
                            {t("planning:holidays.import")}
                        </button>{" "}
                        &nbsp;
                        <button
                            className="btn right m-b-sm"
                            onClick={this.addModal}
                            type="button"
                        >
                            <i className="fas fa-plus m-r-sm" />
                            {t("common:actions.add")}
                        </button>
                    </div>
                </div>
                <ReactTable
                    pageSizeOptions={[5, 10, 15]}
                    defaultPageSize={15}
                    data={this.state.datas}
                    onFetchData={this.changeData}
                    manual
                    columns={this.getColumns()}
                    resizable={false}
                    previousText={t("common:reactTable.previousText")}
                    nextText={t("common:reactTable.nextText")}
                    noDataText={t("planning:holidays.noData")}
                    pageText={t("common:reactTable.pageText")}
                    ofText={t("common:reactTable.ofText")}
                    pages={this.state.pages}
                />
            </div>
        );
    }
}

export default withTranslation("planning")(Holidays);
