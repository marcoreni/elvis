import React from "react";
import BaseDataTable from "../parameters/BaseDataTable";
import {csrfToken} from "../utils";
import swal from "sweetalert2";
import { withTranslation } from "react-i18next";


class ActivityRefKind extends BaseDataTable
{
    constructor(props)
    {
        super(props);

        this.state.columns = [
            {
                id: "name",
                Header: this.props.t("activities:activityRefKind.columns.name"),
                accessor: d => d.name,
            },
            {
                id: "default_activity_ref",
                Header: this.props.t("activities:activityRefKind.columns.defaultActivity"),
                accessor: d => d.default_activity_ref ? d.default_activity_ref.label : "",
            },
            {
                id: "actions",
                Header: this.props.t("activities:columns.actions"),
                Cell: props => {
                    return (
                        <div className="btn-wrapper">
                            <a className="btn-sm btn-primary m-r-sm" href={'/activity_ref_kind/' + props.original.id + "/edit"}>
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
        swal({
            title: this.props.t("activities:activityRefKind.confirmDelete", {name: status.name}),
            type: "warning",
            showCancelButton: true,
            cancelButtonText: this.props.t("activities:common.no"),
            confirmButtonText: this.props.t("activities:common.yes")
        }).then(res =>
        {
            if(res.value)
            {
                fetch(`/activity_ref_kind/${status.id}`,
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
                        if(result.status === 200) {
                            this.fetchData(this.state.tableState)
                        } else {
                            result.json().then(text => {
                                swal({
                                    title: this.props.t("activities:common.errorTitle"),
                                    type: "error",
                                    text: text['message'] + " (" + text['activities'] + ")"
                                })
                            })
                        }
                    })
            }
        });
    }
}

export default withTranslation("activities")(ActivityRefKind);
