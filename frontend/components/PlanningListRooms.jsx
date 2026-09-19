import React from "react";
import PropTypes from "prop-types";
import moment from "moment";

import TanStackGrid from "./common/baseDataTable/TanStackGrid";
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
                filterable: false,
            },
            {
                Header: t("planning:plannings.columns.room"),
                id: "room",
                accessor: (r) => r.label,
                // v6's sortMethod did a case-insensitive compare; TanStack's default string
                // sortingFn ("alphanumeric") is already case-insensitive, so no custom sortingFn
                // is needed here.
                filterable: false,
            },
            {
                id: "actions",
                Header: t("planning:plannings.columns.actions"),
                Cell: (props) => {
                    return (
                        <a href={`/rooms/${props.original.id}/planning`}>
                            <button className="btn btn-xs btn-primary ">
                                {t("planning:plannings.viewPlanning")}
                            </button>
                        </a>
                    );
                },
                sortable: false,
                filterable: false,
            },
        ];

        return (
            <TanStackGrid
                tableName="planning-list-rooms"
                manual={false}
                data={this.props.plannings}
                loading={false}
                pages={null}
                columns={columns}
                defaultSorted={[{ id: "room", desc: false }]}
                minRows={1}
            />
        );
    }
}

export default withTranslation("planning")(PlanningListRooms);
