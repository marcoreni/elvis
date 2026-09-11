import React, { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import CollapsePanel from "../utils/ui/collapse_panel";
import EvaluationForm from "./EvaluationForm";
import * as api from "../../tools/api";
import { fullname } from "../../tools/format";
import mapKeys from "lodash/mapKeys";
import type {
    Activity,
    Answer,
    ReferenceData,
    Season,
    StudentEvaluation,
    User,
} from "../utils/entities";
import { Question } from "./types";

// --- Types & Interfaces ---
export interface EvaluationProps {
    evaluations: StudentEvaluation[];
    activity: Activity;
    season: Season;
    user: User;
    questions: Question[];
    referenceData: ReferenceData;
}

// --- Helper Functions ---

function renderEvaluationHeader(
    t: TFunction,
    user: User,
    season: Season,
    activity: Activity,
    hasAnswered: boolean,
    collapsed: boolean
) {
    const level = user.levels.find(
        (l) =>
            l.activity_ref_id === activity.activity_ref_id &&
            l.season_id === season.id
    );

    const levelStr =
        level?.evaluation_level_ref &&
        t("header.level", { label: level.evaluation_level_ref.label });

    return (
        <Fragment>
            {hasAnswered ? (
                <span className="label label-success m-l-xs pull-right">
                    {levelStr || ""}
                </span>
            ) : (
                <span className="label label-warning m-l-xs pull-right">
                    {t("header.toEvaluate")}
                </span>
            )}

            {hasAnswered && (
                <span className="m-r-sm">
                    <i className="fas fa-check text-success font-bold" />
                </span>
            )}

            <span>{fullname(user)}</span>
        </Fragment>
    );
}

export function getAnswersObject(dbAnswers: Answer[]): Record<string, any> {
    return dbAnswers.reduce(
        (acc, a) => ({
            ...acc,
            [a.question_id]: a.value,
        }),
        {}
    );
}

// --- Main Component ---

/**
 * A wrapper component which lists an activity's students.
 * Each student panel is selectable, and when it is selected it expands
 * to display an evaluation form (collapse and expand using bootstrap classes).
 * The component manages the submitting of the forms, too.
 */
const Evaluation: React.FC<EvaluationProps> = ({
    evaluations,
    activity,
    season,
    user,
    questions,
    referenceData,
}) => {
    const { t } = useTranslation("evaluation");

    const [students, setStudents] = useState<Record<string, User>>(
        () => mapKeys(activity.users, "id") as Record<string, User>
    );

    const [studentAnswers, setStudentAnswers] = useState<
        Record<string, Record<string, any>>
    >(() =>
        evaluations.reduce(
            (acc, evaluation) => ({
                ...acc,
                [evaluation.student_id]: getAnswersObject(evaluation.answers),
            }),
            {}
        )
    );

    const [currentStudent, setCurrentStudent] = useState<number | undefined>(
        undefined
    );

    const handleSetCurrentStudent = (id: number): undefined => {
        setCurrentStudent((prevStudent) =>
            prevStudent === id ? undefined : id
        );
    };

    const handleSubmit = (answers: any) => {
        api.set()
            .success((data: any) => {
                setStudents((prev) => ({
                    ...prev,
                    [data.student.id]: {
                        ...prev[data.student.id],
                        levels: data.student.levels,
                    },
                }));

                setStudentAnswers((prev) => ({
                    ...prev,
                    [data.student.id]: getAnswersObject(
                        data.evaluation.answers
                    ),
                }));

                setCurrentStudent(undefined);
            })
            .post("/student_evaluations", {
                season_id: season.id.toString(),
                teacher_id: user.id.toString(),
                student_id: currentStudent!.toString(),
                activity_id: activity.id.toString(),
                answers,
            });
    };

    // Note: Converted students.map to Object.values(students).map since mapKeys produces an Object
    const studentsPanels = Object.values(students).map((u) => {
        const hasAnswered = !!studentAnswers[u.id];

        // Special case, some levels have a season id to null instead of 1
        const previousSeasonLevel = u.levels.find(
            (l) =>
                (l.season_id == season.previous?.id ||
                    l.season_id == undefined) &&
                l.activity_ref &&
                l.activity_ref.activity_ref_kind_id ==
                    activity.activity_ref.activity_ref_kind_id
        );

        return (
            <CollapsePanel
                id={u.id}
                key={u.id}
                className="panel-default"
                header={renderEvaluationHeader(
                    t,
                    u,
                    season,
                    activity,
                    hasAnswered,
                    currentStudent !== u.id
                )}
                onClick={() => handleSetCurrentStudent(u.id)}
                collapsed={currentStudent !== u.id}
            >
                <div className="p">
                    <span
                        className={`label label-${
                            previousSeasonLevel?.evaluation_level_ref
                                ? "info"
                                : "danger"
                        }`}
                    >
                        {(previousSeasonLevel?.evaluation_level_ref
                            ? t("previousLevel.found", {
                                  level: previousSeasonLevel
                                      .evaluation_level_ref.label,
                                  kind: activity.activity_ref.activity_ref_kind
                                      .name,
                                  season: season.previous?.label,
                              })
                            : t("previousLevel.notFound", {
                                  kind: activity.activity_ref.activity_ref_kind
                                      .name,
                                  season: season.previous?.label,
                              })
                        ).toUpperCase()}
                    </span>
                </div>
                <EvaluationForm
                    className="p"
                    key={u.id}
                    questions={questions.filter(
                        (q) => q.name !== "pursue_on_next_season"
                    )}
                    answers={
                        (currentStudent && studentAnswers[currentStudent]) || {}
                    }
                    referenceData={referenceData}
                    onSubmit={handleSubmit}
                />
            </CollapsePanel>
        );
    });

    return <Fragment>{studentsPanels}</Fragment>;
};

export default Evaluation;
