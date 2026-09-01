import BaseDataTable from "../BaseDataTable";
import swal from "sweetalert2";
import {csrfToken} from "../../utils";
import React from "react";
import {withTranslation} from "react-i18next";

class Features extends BaseDataTable
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
                id: "name",
                Header: t("practice.cols.name"),
                accessor: d => d.name,
            },
            {
                id: "active",
                Header: t("practice.cols.active"),
                accessor: d => d.active,
                Cell: props => <p>{props.original.active ? t("practice.yes") : t("practice.no")}</p>
            },
            {
                id: "actions",
                Header: t("practice.cols.actions"),
                Cell: props => {
                    return (
                        <div className="btn-wrapper">
                            <a className="btn-sm btn-primary m-r-sm" href={'/practice/room_features/' + props.original.id + "/edit"}>
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
            },
        ];

        this.deleteStatus = this.deleteStatus.bind(this);
    }

    deleteStatus(status)
    {
        const {t} = this.props;
        swal({
            title: t("practice.delete.feature", {name: status.name}),
            type: "warning",
            showCancelButton: true,
            cancelButtonText: t("practice.delete.confirmNo"),
            confirmButtonText: t("practice.delete.confirmYes")
        }).then(res =>
        {
            if(res.value)
            {
                fetch(`/practice/room_features/${status.id}`,
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
                                    title: t("practice.errorTitle"),
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

export default withTranslation("parameters")(Features);
