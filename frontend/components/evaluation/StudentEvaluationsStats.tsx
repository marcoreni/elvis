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

    const columns: LegacyColumn[] = [
        {
            id: "teacher",
            Header: t("stats.teacher"),
            accessor: (d: StudentEvaluationStat) =>
                `${d.teacher.last_name} ${d.teacher.first_name}`,
            Cell: (c) => (
                <a href={`/users/${c.original.teacher.id}`}>
                    {c.value as string}
                </a>
            ),
        },
        {
            id: "nb_students",
            Header: t("stats.studentsCount"),
            accessor: (d: StudentEvaluationStat) => d.nb_students,
            Cell: (c) => (
                <div className="text-right font-bold font-size-big">
                    {c.value as number}
                </div>
            ),
        },
        {
            id: "nb_evaluated_students",
            Header: t("stats.evaluationsCount"),
            accessor: (d: StudentEvaluationStat) => d.nb_evaluated_students,
            Cell: (c) => (
                <div
                    className={`text-right font-bold font-size-big text-${c.original.evaluations_completion_rate_level}`}
                >
                    {c.value as number}
                </div>
            ),
        },
        {
            id: "nb_redirections",
            Header: t("stats.changesCount"),
            accessor: (d: StudentEvaluationStat) => d.nb_redirections,
            Cell: (c) => (
                <div className="text-right font-bold font-size-big">
                    {c.value as number}
                </div>
            ),
        },
        {
            id: "nb_informed_redirections",
            Header: t("stats.informedCount"),
            accessor: (d: StudentEvaluationStat) => d.nb_informed_redirections,
            Cell: (c) => (
                <div
                    className={`text-right font-bold font-size-big text-${c.original.redirection_information_rate_level}`}
                >
                    {c.value as number}
                </div>
            ),
        },
        {
            id: "evaluations_completion_rate",
            Header: t("stats.completionRate"),
            accessor: (d: StudentEvaluationStat) =>
                d.evaluations_completion_rate,
            Cell: (c) => (
                <div
                    className="progress"
                    style={{ margin: "0", background: "white" }}
                >
                    <div
                        className={`progress-bar progress-bar-${c.original.evaluations_completion_rate_level}`}
                        style={{
                            width: (c.value as number) + "%",
                            minWidth: "2em",
                        }}
                    >
                        {c.value as number}%
                    </div>
                </div>
            ),
        },
    ];

    return (
        <TanStackGrid
            tableName="StudentEvaluationStats"
            columns={columns}
            data={stats}
            loading={false}
            pages={null}
            manual={false}
            filterable={false}
        />
    );
};

export default StudentEvaluationStats;
