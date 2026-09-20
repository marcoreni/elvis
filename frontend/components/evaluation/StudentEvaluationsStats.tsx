import React from "react";
import TanStackGrid, {
    LegacyColumn,
} from "../common/baseDataTable/TanStackGrid";
import { useTranslation } from "react-i18next";
import type { StudentEvaluationStat } from "../utils/entities";

interface StudentEvaluationStatsProps {
    stats: StudentEvaluationStat[];
}

const StudentEvaluationStats: React.FC<StudentEvaluationStatsProps> = ({
    stats,
}) => {
    const { t } = useTranslation("evaluation");

    const teacherName = (d: StudentEvaluationStat) =>
        `${d.teacher.last_name} ${d.teacher.first_name}`;

    const columns: LegacyColumn<StudentEvaluationStat>[] = [
        {
            id: "teacher",
            Header: t("stats.teacher"),
            accessor: teacherName,
            Cell: (c) => (
                <a href={`/users/${c.original.teacher.id}`}>
                    {teacherName(c.original)}
                </a>
            ),
        },
        {
            id: "nb_students",
            Header: t("stats.studentsCount"),
            accessor: (d) => d.nb_students,
            Cell: (c) => (
                <div className="text-right font-bold font-size-big">
                    {c.original.nb_students}
                </div>
            ),
        },
        {
            id: "nb_evaluated_students",
            Header: t("stats.evaluationsCount"),
            accessor: (d) => d.nb_evaluated_students,
            Cell: (c) => (
                <div
                    className={`text-right font-bold font-size-big text-${c.original.evaluations_completion_rate_level}`}
                >
                    {c.original.nb_evaluated_students}
                </div>
            ),
        },
        {
            id: "nb_redirections",
            Header: t("stats.changesCount"),
            accessor: (d) => d.nb_redirections,
            Cell: (c) => (
                <div className="text-right font-bold font-size-big">
                    {c.original.nb_redirections}
                </div>
            ),
        },
        {
            id: "nb_informed_redirections",
            Header: t("stats.informedCount"),
            accessor: (d) => d.nb_informed_redirections,
            Cell: (c) => (
                <div
                    className={`text-right font-bold font-size-big text-${c.original.redirection_information_rate_level}`}
                >
                    {c.original.nb_informed_redirections}
                </div>
            ),
        },
        {
            id: "evaluations_completion_rate",
            Header: t("stats.completionRate"),
            accessor: (d) => d.evaluations_completion_rate,
            Cell: (c) => (
                <div
                    className="progress"
                    style={{ margin: "0", background: "white" }}
                >
                    <div
                        className={`progress-bar progress-bar-${c.original.evaluations_completion_rate_level}`}
                        style={{
                            width: c.original.evaluations_completion_rate + "%",
                            minWidth: "2em",
                        }}
                    >
                        {c.original.evaluations_completion_rate}%
                    </div>
                </div>
            ),
        },
    ];

    return (
        <TanStackGrid<StudentEvaluationStat>
            tableName="StudentEvaluationStats"
            columns={columns}
            data={stats}
            loading={false}
            pages={null}
            manual={false}
            filterable={false}
            pageSizeOptions={[5, 10, 20, 25, 50, 100]}
        />
    );
};

export default StudentEvaluationStats;
