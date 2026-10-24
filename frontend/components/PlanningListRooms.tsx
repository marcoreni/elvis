import React from "react";
import { useTranslation } from "react-i18next";

import TanStackGrid, {
    LegacyColumn,
} from "./common/baseDataTable/TanStackGrid";

interface RoomPlanning {
    id: number;
    label: string;
}

interface PlanningListRoomsProps {
    // The table is the whole point of this component -- rendered unconditionally against
    // `this.props.plannings` with no guard, same reasoning as other batches' tightenings.
    plannings: RoomPlanning[];
}

function PlanningListRooms({ plannings }: PlanningListRoomsProps) {
    const { t } = useTranslation("planning");

    const columns: LegacyColumn<RoomPlanning>[] = [
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
            data={plannings}
            loading={false}
            pages={null}
            columns={columns}
            defaultSorted={[{ id: "room", desc: false }]}
            minRows={1}
            pageSizeOptions={[5, 10, 20, 25, 50, 100]}
        />
    );
}

// Was `withTranslation("planning")(PlanningListRooms)` -- the HOC existed only because class
// components can't call hooks; now that it's a function component, useTranslation above does the
// same job, no parent-side change needed for any `react_component("PlanningListRooms", {...})`
// caller.
export default PlanningListRooms;
