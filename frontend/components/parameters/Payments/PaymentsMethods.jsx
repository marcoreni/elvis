import React, {Component, Fragment} from "react";
import swal from "sweetalert2";
import {csrfToken} from "../../utils";
import {makeDebounce} from "../../../tools/inputs";
import ReactTable from "react-table";
import BaseDataTable from "../BaseDataTable";
import {withTranslation} from "react-i18next";

class PaymentsMethods extends BaseDataTable {
    constructor(props) {
        super(props);
        const {t} = props;

        this.state.columns = [
            {
                Header: "#",
                accessor: "id",
                width: 75,
            },
            {
                id: "label",
                Header: t("shared.colLabel"),
                accessor: d => d.label,
            },
            {
                id: "show_payment_method_to_user",
                Header: t("payments.methods.cols.showToUser"),
                accessor: d => d.show_payment_method_to_user,
                Cell: props => <div>{props.original.show_payment_method_to_user ? t("shared.yes") : t("shared.no")}</div>
            },
            {
                id: "is_special",
                Header: t("payments.methods.cols.isSpecial"),
                accessor: d => d.is_special,
                Cell: props => <div>{props.original.is_special ? t("shared.yes") : t("shared.no")}</div>
            },
            {
                id: "is_credit_note",
                Header: t("payments.methods.cols.isCreditNote"),
                accessor: d => d.is_credit_note,
                Cell: props => <div>{props.original.is_credit_note ? t("shared.yes") : t("shared.no")}</div>
            },
            {
                id: "actions",
                Header: t("shared.actions"),
                Cell: props => {
                    return <div className="btn-wrapper">
                        <a className="btn-sm btn-primary m-r-sm"
                           href={'/payment_method/' + props.original.id + "/edit"}>
                            <i className="fas fa-edit"/>
                        </a>

                        {props.original.built_in ?
                            null
                            :
                            <a className="btn-sm btn-warning" onClick={() => this.deleteStatus(props.original)}>
                                <i className="fas fa-trash"/>
                            </a>}
                    </div>
                },
                sortable: false,
                filterable: false,
            },
        ];

        this.deleteStatus = this.deleteStatus.bind(this);
    }

    deleteStatus(status) {
        const {t} = this.props;
        swal({
            title: t("payments.methods.deleteConfirm", {name: status.label}),
            type: "warning",
            showCancelButton: true,
            cancelButtonText: t("shared.deleteConfirmNo"),
            confirmButtonText: t("shared.deleteConfirmYes")
        }).then(res => {
            if (res.value) {
                fetch(`/payment_method/${status.id}`,
                    {
                        method: "DELETE",
                        credentials: "same-origin",
                        headers: {
                            "X-CSRF-Token": csrfToken,
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        }
                    })
                    .then(result => {
                        if (result.status === 200) {
                            this.fetchData(this.state.tableState)
                        } else {
                            result.text().then(text => {
                                swal({
                                    title: t("shared.errorTitle"),
                                    type: "error",
                                    text: text
                                })
                            })
                        }
                    })
            }
        });
    }
}

export default withTranslation("parameters")(PaymentsMethods);
