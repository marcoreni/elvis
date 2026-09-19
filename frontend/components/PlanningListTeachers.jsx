import React from "react";
import PropTypes from "prop-types";
import _ from "lodash";
import moment from "moment";

import TanStackGrid from "./common/baseDataTable/TanStackGrid";
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
                Cell: (row) => (
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
                accessor: (p) => moment(p.updated_at).format("DD-MM-YYYY"),
                filterable: false,
                Cell: (p) => (
                    <a
                        href={`/planning/${p.original.id}`}
                        className="w-100 d-flex text-dark"
                    >
                        {moment(p.original.updated_at).format("DD-MM-YYYY")}
                    </a>
                ),
            },
            // lastname/firstname text filters: v6's defaultFilterMethod did a case-insensitive
            // startsWith; TanStackGrid's default column filterFn is a case-insensitive "contains"
            // instead -- a minor, intentionally-accepted behavior difference (no per-column
            // filterFn override exists in the LegacyColumn shape).
            {
                id: "lastname",
                Header: t("planning:plannings.columns.lastName"),
                accessor: (d) => d.user.last_name,
                Cell: (d) => (
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
                accessor: (d) => d.user.first_name,
                Cell: (d) => (
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
                Cell: (props) => {
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
            <TanStackGrid
                tableName="planning-list-teachers"
                manual={false}
                data={this.props.plannings}
                loading={false}
                pages={null}
                columns={columns}
                // Was `{ id: "lastname", asc: true }` under react-table v6 -- v6's defaultSorted
                // items only ever read `desc` (an `asc` key is a no-op there), so this was
                // effectively `desc: false` by coincidence, not a deliberate `asc` key. Made
                // explicit here.
                defaultSorted={[{ id: "lastname", desc: false }]}
                minRows={1}
                pageSizeOptions={[5, 10, 20, 25, 50, 100]}
            />
        );
    }
}

export default withTranslation("planning")(PlanningListTeachers);
