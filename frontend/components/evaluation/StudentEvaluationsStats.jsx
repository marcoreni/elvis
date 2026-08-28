import React, { Component } from "react";
import Table from "react-table";
import { withTranslation } from "react-i18next";

class StudentEvaluationStats extends Component {
    constructor(props) {
        super(props);

        this.state = {};
    }

    render() {
        const { t } = this.props;

        const columns = [
            {
                id: "teacher",
                Header: t("stats.teacher"),
                accessor: d => `${d.teacher.last_name} ${d.teacher.first_name}`,
                Cell: c => <a href={`/users/${c.original.teacher.id}`}>
                    {c.value}
                </a>
            },
            {
                id: "nb_students",
                Header: t("stats.studentsCount"),
                accessor: d => d.nb_students,
                Cell: c => <div className="text-right font-bold font-size-big">
                    {c.value}
                </div>,
            },
            {
                id: "nb_evaluated_students",
                Header: t("stats.evaluationsCount"),
                accessor: d => d.nb_evaluated_students,
                Cell: c => <div className={`text-right font-bold font-size-big text-${c.original.evaluations_completion_rate_level}`}>
                    {c.value}
                </div>,
            },
            {
                id: "nb_redirections",
                Header: t("stats.changesCount"),
                accessor: d => d.nb_redirections,
                Cell: c => <div className={`text-right font-bold font-size-big`}>
                    {c.value}
                </div>,
            },
            {
                id: "nb_informed_redirections",
                Header: t("stats.informedCount"),
                accessor: d => d.nb_informed_redirections,
                Cell: c => <div className={`text-right font-bold font-size-big text-${c.original.redirection_information_rate_level}`}>
                    {c.value}
                </div>,
            },
            {
                id: "evaluations_completion_rate",
                Header: t("stats.completionRate"),
                accessor: d => d.evaluations_completion_rate,
                Cell: c => <div className="progress" style={{margin: "0", background: "white"}}>
                    <div className={`progress-bar progress-bar-${c.original.evaluations_completion_rate_level}`}
                        style={{
                            width: c.value + "%",
                            minWidth: "2em",
                        }}>
                        {c.value}%
                    </div>
                </div>,
            },
        ];

        return <Table
            columns={columns}
            data={this.props.stats}
            sortable />;
    }
}

export default withTranslation("evaluation")(StudentEvaluationStats);