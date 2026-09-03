import BaseDataTable from "../BaseDataTable";
import React from "react";
import {withTranslation} from "react-i18next";
import swal from "sweetalert2";
import {csrfToken} from "../../utils";

class BandsType extends BaseDataTable
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
                Header: t("shared.colName"),
                accessor: d => d.name,
            },
            {
                id: "actions",
                Header: t("shared.actions"),
                Cell: props => {
                    return (
                        <div className="btn-wrapper">
                            <a className="btn-sm btn-primary m-r-sm" href={'/practice/band_types/' + props.original.id + "/edit"}>
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
            title: t("practice.delete.bandType", {name: status.name}),
            type: "warning",
            showCancelButton: true,
            cancelButtonText: t("shared.deleteConfirmNo"),
            confirmButtonText: t("shared.deleteConfirmYes")
        }).then(res =>
        {
            if(res.value)
            {
                fetch(`/practice/band_types/${status.id}`,
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

export default withTranslation("parameters")(BandsType);
