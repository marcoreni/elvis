import React from "react";
import PropTypes from "prop-types";
import moment from "moment";

import ReactTable from "react-table";
import { withTranslation } from "react-i18next";

class PlanningListRooms extends React.Component {
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
            },
            {
                Header: t("planning:plannings.columns.room"),
                id: "room",
                accessor: r => r.label,
                sortMethod: (a, b) => {
                    if (a === b) return 0;
                    return a.toLowerCase() > b.toLowerCase() ? 1 : -1;
                },
            },
            {
                id: "actions",
                Header: t("planning:plannings.columns.actions"),
                Cell: props => {
                    return (
                        <a href={`/rooms/${props.original.id}/planning`}>
                            <button className="btn btn-xs btn-primary ">
                                {t("planning:plannings.viewPlanning")}
                            </button>
                        </a>
                    );
                },
                sortable: false,
            },
        ];

        return (
            <ReactTable
                data={this.props.plannings}
                columns={columns}
                defaultSorted={[{ id: "room", desc: false }]}
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
        );
    }
}

export default withTranslation("planning")(PlanningListRooms);
