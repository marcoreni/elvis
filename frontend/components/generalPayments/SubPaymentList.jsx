import React from "react";
import _ from "lodash";
import { withTranslation } from "react-i18next";

import moment from "moment";

import TanStackGrid from "../common/baseDataTable/TanStackGrid";

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

        // The couple of Filter render props these columns used to carry (payment_method_id/
        // reception_date/cashing_date) were dead code even under v6 -- table-level
        // `filterable={false}` disabled them regardless of any column-level setting -- so they
        // were dropped rather than carried forward.
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
            },
            {
                Header: t("general.subPayments.columns.reception"),
                id: "reception_date",
                accessor: d =>
                    d.reception_date
                        ? moment(d.reception_date).format("DD-MM-YYYY")
                        : "",
            },
            {
                Header: t("general.subPayments.columns.cashing"),
                id: "cashing_date",
                accessor: d =>
                    d.cashing_date
                        ? moment(d.cashing_date).format("DD-MM-YYYY")
                        : "",
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
            },
        ];

        return (
            <div style={{ padding: "20px 20px", background: "aliceblue" }}>
                <TanStackGrid
                    tableName="sub-payment-list"
                    style={{ backgroundColor: "white" }}
                    data={this.props.data}
                    pages={pages}
                    // Not `this.state.loading`: that flag starts (and stays) `true` -- nothing in
                    // this component ever sets it `false` -- and was never actually wired into the
                    // old <ReactTable> either (v6 defaults `loading` to `false` when the prop is
                    // omitted, which is what actually rendered). Wiring it here would show
                    // TanStackGrid's spinner forever instead of the rows.
                    loading={false}
                    columns={columns}
                    showPagination={false}
                    filterable={false}
                    sortable={false}
                    minRows={1}
                />
            </div>
        );
    }
}

export default withTranslation("payments")(SubPaymentList);
