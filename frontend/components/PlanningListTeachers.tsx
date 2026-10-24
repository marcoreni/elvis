import React from "react";
import moment from "moment";
import { useTranslation } from "react-i18next";

import TanStackGrid, {
    LegacyColumn,
} from "./common/baseDataTable/TanStackGrid";

interface TeacherPlanning {
    id: number;
    updated_at: string;
    user: {
        id: number;
        first_name: string;
        last_name: string;
    };
}

interface PlanningListTeachersProps {
    // Rendered unconditionally against `this.props.plannings`, same as PlanningListRooms.
    plannings: TeacherPlanning[];
}

// Dropped: `durationToString` (defined but never called from any column -- confirmed by grep) and
// the `lodash` import it would have needed, neither referenced anywhere else in this file.

function PlanningListTeachers({ plannings }: PlanningListTeachersProps) {
    const { t } = useTranslation("planning");

    const columns: LegacyColumn<TeacherPlanning>[] = [
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
                                &nbsp; {t("planning:plannings.groupSimulation")}
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
            data={plannings}
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

// Was `withTranslation("planning")(PlanningListTeachers)` -- the HOC existed only because class
// components can't call hooks; now that it's a function component, useTranslation above does the
// same job, no parent-side change needed for any `react_component("PlanningListTeachers", {...})`
// caller (e.g. app/views/planning/index_for_teachers.html.erb).
export default PlanningListTeachers;
