import React from "react";
import PropTypes from "prop-types";
import _ from "lodash";
import moment from "moment";

import ReactTable from "react-table";
import { withTranslation } from "react-i18next";

function durationToString(duration) {
    if (moment.isDuration(duration))
        return `${Math.floor(duration.asHours())}h${Math.floor(
            duration.minutes()
        )}`;

    return "";
}

class PlanningListTeachers extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { t } = this.props;
        const columns = [
            {
                Header: "#",
                accessor: "id",
                width: 50,
                filterable: false,
                Cell: row => (
                    <a
                        href={`/planning/${row.original.id}`}
                        className="w-100 d-flex text-dark"
                    >
                        {row.original.id}
                    </a>
                ),
            },
            {
                Header: t("planning:plannings.columns.lastModified"),
                id: "date",
                accessor: p => moment(p.updated_at).format("DD-MM-YYYY"),
                filterable: false,
                Cell: p => (
                    <a
                        href={`/planning/${p.original.id}`}
                        className="w-100 d-flex text-dark"
                    >
                        {moment(p.original.updated_at).format("DD-MM-YYYY")}
                    </a>
                ),
            },
            {
                id: "lastname",
                Header: t("planning:plannings.columns.lastName"),
                accessor: d => d.user.last_name,
                Cell: d => (
                    <a
                        href={`/planning/${d.original.id}`}
                        className="w-100 d-flex text-dark"
                    >
                        {d.original.user.last_name}
                    </a>
                ),
            },
            {
                id: "firstname",
                Header: t("planning:plannings.columns.firstName"),
                accessor: d => d.user.first_name,
                Cell: d => (
                    <a
                        href={`/planning/${d.original.id}`}
                        className="w-100 d-flex text-dark"
                    >
                        {d.original.user.first_name}
                    </a>
                ),
            },
            {
                id: "actions",
                Header: t("planning:plannings.columns.actions"),
                Cell: props => {
                    return (
                        <div className="text-center">
                            <a href={`/users/${props.original.user.id}`}>
                                <button className="btn btn-sm btn-primary ">
                                    <i className="fas fa-user" />
                                    &nbsp; {t("planning:plannings.profile")}
                                </button>
                            </a>
                            <a
                                className="m-l"
                                href={`/teachers/${props.original.user.id}/previsional_groups`}
                            >
                                <button className="btn btn-sm btn-primary ">
                                    <i className="fas fa-users" />
                                    &nbsp;{" "}
                                    {t("planning:plannings.groupSimulation")}
                                </button>
                            </a>
                        </div>
                    );
                },
                sortable: false,
                filterable: false,
            },
        ];

        return (
            <ReactTable
                data={this.props.plannings}
                columns={columns}
                defaultSorted={[{ id: "lastname", asc: true }]}
                resizable={false}
                filterable
                defaultFilterMethod={(filter, row) => {
                    if (row[filter.id] != null) {
                        return row[filter.id]
                            .toLowerCase()
                            .startsWith(filter.value.toLowerCase());
                    }
                }}
                previousText={t("common:reactTable.previousText")}
                nextText={t("common:reactTable.nextText")}
                loadingText={t("common:reactTable.loadingText")}
                noDataText={t("common:reactTable.noDataText")}
                pageText={t("common:reactTable.pageText")}
                ofText={t("common:reactTable.ofText")}
                rowsText={t("common:reactTable.rowsText")}
                minRows={1}
            />
        );
    }
}

export default withTranslation("planning")(PlanningListTeachers);
