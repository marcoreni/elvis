import React from "react";
import Table, { Column } from "react-table";
import { useTranslation } from "react-i18next";
import type { StudentEvaluationStat, Teacher } from "../utils/entities";

interface StudentEvaluationStatsProps {
    stats: StudentEvaluationStat[];
}

const StudentEvaluationStats: React.FC<StudentEvaluationStatsProps> = ({
    stats,
}) => {
    const { t } = useTranslation("evaluation");

    const columns: Column<StudentEvaluationStat>[] = [
        {
            id: "teacher",
            Header: t("stats.teacher"),
            accessor: (d) => `${d.teacher.last_name} ${d.teacher.first_name}`,
            Cell: (c) => (
                <a href={`/users/${c.original.teacher.id}`}>{c.value}</a>
            ),
        },
        {
            id: "nb_students",
            Header: t("stats.studentsCount"),
            accessor: (d) => d.nb_students,
            Cell: (c) => (
                <div className="text-right font-bold font-size-big">
                    {c.value}
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
                    {c.value}
                </div>
            ),
        },
        {
            id: "nb_redirections",
            Header: t("stats.changesCount"),
            accessor: (d) => d.nb_redirections,
            Cell: (c) => (
                <div className="text-right font-bold font-size-big">
                    {c.value}
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
                    {c.value}
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
                            width: c.value + "%",
                            minWidth: "2em",
                        }}
                    >
                        {c.value}%
                    </div>
                </div>
            ),
        },
    ];

    return (
        <Table
            columns={columns}
            data={stats}
            sortable
            previousText={t("common:reactTable.previousText")}
            nextText={t("common:reactTable.nextText")}
            loadingText={t("common:reactTable.loadingText")}
            noDataText={t("common:reactTable.noDataText")}
            pageText={t("common:reactTable.pageText")}
            ofText={t("common:reactTable.ofText")}
            rowsText={t("common:reactTable.rowsText")}
        />
    );
};

export default StudentEvaluationStats;
