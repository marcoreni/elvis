import React from "react";
import _ from "lodash";
import { withTranslation } from "react-i18next";

const moment = require("moment");

import ReactTable from "react-table";
import DateFilter from "../utils/DateFilter";

class SubPaymentList extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            data: [],
            pages: null,
            page: 0,
            loading: true,
            totalAmount: 0,
            rowsCount: 0,
        };
    }

    render() {
        const { pages } = this.state;
        const { t } = this.props;

        const columns = [
            {
                Header: t("general.subPayments.columns.method"),
                id: "payment_method_id",
                accessor: d => {
                    const pm = _.find(
                        this.props.paymentMethods,
                        pm => pm.id == d.payment_method_id
                    );
                    return pm ? pm.label : t("general.subPayments.unspecified");
                },
                sortable: false,
                Filter: ({ filter, onChange }) => (
                    <select
                        onChange={event => onChange(event.target.value)}
                        style={{ width: "100%" }}
                        value={filter ? filter.value : ""}
                    >
                        <option value="" />
                        {this.props.paymentMethods.map(method => (
                            <option key={method.id} value={method.id}>
                                {method.label}
                            </option>
                        ))}
                    </select>
                ),
            },
            {
                Header: t("general.subPayments.columns.reception"),
                id: "reception_date",
                accessor: d =>
                    d.reception_date
                        ? moment(d.reception_date).format("DD-MM-YYYY")
                        : "",
                Filter: ({ filter, onChange }) => (
                    <DateFilter
                        minYear={this.props.minYear}
                        maxYear={this.props.maxYear}
                        onChange={onChange}
                    />
                ),
            },
            {
                Header: t("general.subPayments.columns.cashing"),
                id: "cashing_date",
                accessor: d =>
                    d.cashing_date
                        ? moment(d.cashing_date).format("DD-MM-YYYY")
                        : "",
                Filter: ({ filter, onChange }) => (
                    <DateFilter
                        minYear={this.props.minYear}
                        maxYear={this.props.maxYear}
                        onChange={onChange}
                    />
                ),
            },
            {
                Header: t("general.subPayments.columns.checkNumber"),
                id: "check_number",
                style: {
                    display: "block",
                    textAlign: "right",
                },
                accessor: d => d.check_number || t("general.subPayments.unspecified"),
            },
            {
                Header: t("general.subPayments.columns.checkIssuer"),
                id: "check_issuer_name",
                style: {
                    display: "block",
                    textAlign: "right",
                },
                accessor: d => d.check_issuer_name || t("general.subPayments.unknown"),
            },
            {
                Header: t("general.subPayments.columns.amount"),
                id: "amount",
                style: {
                    display: "block",
                    textAlign: "right",
                },
                accessor: d => `(${d.operation}) ${d.amount || "#"} €`,
                filterable: false,
            },
        ];

        return (
            <div style={{ padding: "20px 20px", background: "aliceblue" }}>
                <ReactTable
                    style={{ backgroundColor: "white" }}
                    data={this.props.data}
                    manual
                    pages={pages}
                    columns={columns}
                    defaultSorted={[{ id: "number", desc: true }]}
                    defaultPageSize={10}
                    filterable={false}
                    showPagination={false}
                    sortable={false}
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
            </div>
        );
    }
}

export default withTranslation("payments")(SubPaymentList);
