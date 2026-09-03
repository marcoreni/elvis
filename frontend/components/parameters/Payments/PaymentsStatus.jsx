import React from "react";
import {csrfToken} from "../../utils";
import swal from "sweetalert2";
import BaseDataTable from "../BaseDataTable";
import {withTranslation} from "react-i18next";

class PaymentsStatus extends BaseDataTable
{
    constructor(props)
    {
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
                id: "color",
                Header: t("payments.status.cols.color"),
                accessor: d => d.color,
                Cell: props =>
                {
                    return <div style={{backgroundColor: props.original.color}} className="w-100">{props.original.color}</div>
                }
            },
            {
                id: "actions",
                Header: t("shared.actions"),
                Cell: props => {
                    return (
                        props.original.built_in ?
                            null
                            :
                            <div className="btn-wrapper">
                                <a className="btn-sm btn-primary m-r-sm" href={'/payment_statuses/' + props.original.id + "/edit"}>
                                    <i className="fas fa-edit"/>
                                </a>

                                <a className="btn-sm btn-warning" onClick={() => this.deleteStatus(props.original)}>
                                    <i className="fas fa-trash"/>
                                </a>
                            </div>
                    );
                },
                sortable: false,
                filterable: false,
            }
        ];

        this.deleteStatus = this.deleteStatus.bind(this);
    }

    deleteStatus(status)
    {
        const {t} = this.props;
        swal({
            title: t("shared.deleteStatusConfirm", {name: status.label}),
            type: "warning",
            showCancelButton: true,
            cancelButtonText: t("shared.deleteConfirmNo"),
            confirmButtonText: t("shared.deleteConfirmYes")
        }).then(res =>
        {
            if(res.value)
            {
                fetch(`/payment_statuses/${status.id}`,
                    {
                        method: "DELETE",
                        credentials: "same-origin",
                        headers: {
                            "X-CSRF-Token": csrfToken,
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        }
                    })
                    .then(result =>
                    {
                        if(result.status === 200)
                        {
                            this.fetchData(this.state.tableState)
                        }
                        else
                        {
                            result.text().then(text =>
                            {
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

export default withTranslation("parameters")(PaymentsStatus);
