import React, { Fragment, memo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import moment from "moment";

import * as TimeIntervalHelpers from "./TimeIntervalHelpers";
import {
    fullnameWithAge,
    fullname,
    toDate,
    toHourMin,
    toLocaleDate,
} from "../../tools/format";
import * as api from "../../tools/api";
import { WEEKDAYS, INTERVAL_KINDS } from "../../tools/constants";
import { makeDebounce } from "../../tools/inputs";
import KindLegend from "../common/KindLegend";
import QuestionnaireModal from "./QuestionnaireModal";
import SelectTeachers from "./SelectTeachers";
import type { Question } from "../evaluation/types";
import type {
    ActivityRef,
    EvaluationLevelRef,
    ReferenceData,
    Room,
    Season,
    TimeInterval,
    User,
} from "../utils/entities";

type TFunction = (key: string, options?: Record<string, unknown>) => string;

const debounce = makeDebounce();
const debounceModal = makeDebounce();

// The planning endpoint's per-day interval shape: a validated slot is either a lesson/option
// (`activity_instance` populated) or an evaluation appointment (`evaluation_appointment`
// populated), never both. Extends the shared `TimeInterval` (narrowing a few fields this
// endpoint always sends to required) instead of redeclaring them, and reuses `ActivityRef`/
// `Room`/`EvaluationLevelRef` for the nested shapes rather than inlining ad-hoc ones (same
// pattern planning/RawPlanning.tsx already follows in this batch).
interface SimpleTimeInterval extends TimeInterval {
    id: number;
    kind: string;
    is_validated: boolean;
    activity_instance?: {
        activity: {
            group_name?: string;
            activity_ref: ActivityRef;
            room: Room;
            evaluation_level_ref?: EvaluationLevelRef;
            time_interval?: unknown;
        };
    };
    students?: { active: User[]; options: User[] };
    evaluation_appointment?: {
        id: number;
        activity_ref: ActivityRef;
        student: User;
    };
}

const StudentItems = ({
    students,
    selectedPlanning,
    currentPlanning,
}: {
    students: User[];
    selectedPlanning: number | null;
    currentPlanning: number;
}) => {
    const viewingSomeoneElsesPlanning =
        selectedPlanning !== null && currentPlanning !== selectedPlanning;

    return (
        <Fragment>
            {students.map((u) =>
                viewingSomeoneElsesPlanning ? (
                    <li key={u.id} className="list-group-item no-borders">
                        {fullnameWithAge(u)}
                    </li>
                ) : (
                    <li key={u.id} className="list-group-item no-borders">
                        <a href={`/users/${u.id}`}>{fullnameWithAge(u)}</a>
                    </li>
                )
            )}
        </Fragment>
    );
};

const OptionItems = ({
    options,
    selectedPlanning,
    currentPlanning,
}: {
    options: User[];
    selectedPlanning: number | null;
    currentPlanning: number;
}) => {
    const viewingSomeoneElsesPlanning =
        selectedPlanning !== null && currentPlanning !== selectedPlanning;

    return (
        <Fragment>
            {options.map((u) =>
                viewingSomeoneElsesPlanning ? (
                    <li className="list-group-item no-borders" key={u.id}>
                        <span className="option-student">
                            {fullnameWithAge(u)}
                        </span>
                    </li>
                ) : (
                    <li className="list-group-item no-borders" key={u.id}>
                        <a href={`/users/${u.id}`}>
                            <span className="option-student">
                                {fullnameWithAge(u)}
                            </span>
                        </a>
                    </li>
                )
            )}
        </Fragment>
    );
};

const SimpleActivity = ({
    timeInterval,
    seasons,
    selectedPlanning,
    currentPlanning,
    t,
}: {
    timeInterval: SimpleTimeInterval;
    seasons: Season[];
    selectedPlanning: number | null;
    currentPlanning: number;
    t: TFunction;
}) => {
    if (!timeInterval.activity_instance) {
        return null;
    }

    // Vars
    const activity = timeInterval.activity_instance.activity;

    // No optional-chaining guard here (same policy as planning/RawPlanning.tsx's OptionItems) --
    // the original was `timeInterval.students.active`/`.options` with no guard, trusting
    // `students` to always be populated once `activity_instance` is (checked just above).
    const students = timeInterval.students!.active;
    const options = timeInterval.students!.options;

    // Render
    return (
        <div className="raw-activity">
            <div className="ibox">
                <div
                    className={`ibox-title border-kind border-kind-${timeInterval.kind}`}
                >
                    <h4>
                        {toHourMin(toDate(timeInterval.start))}
                        {" - "}
                        {toHourMin(toDate(timeInterval.end))}
                        {activity.group_name ? (
                            <span
                                className={`label bg-kind-${timeInterval.kind} text-white pull-right`}
                            >
                                {activity.group_name}
                            </span>
                        ) : null}
                    </h4>
                </div>

                <div className="ibox-content p-xs">
                    <p className="font-bold">{activity.activity_ref.label}</p>
                    <p>{activity.room.label}</p>

                    <p className="font-bold font-italic">
                        {t("rawPlanning.occupancy", {
                            n: students.length + options.length,
                            limit: activity.activity_ref.occupation_limit,
                        })}{" "}
                        {TimeIntervalHelpers.levelDisplayLabel(
                            TimeIntervalHelpers.levelDisplayForActivity(
                                {
                                    ...activity,
                                    users: students,
                                    time_interval: timeInterval,
                                },
                                seasons
                            )
                        )}
                    </p>

                    <ul className="list-group">
                        <StudentItems
                            students={students}
                            selectedPlanning={selectedPlanning}
                            currentPlanning={currentPlanning}
                        />
                        <OptionItems
                            options={options}
                            selectedPlanning={selectedPlanning}
                            currentPlanning={currentPlanning}
                        />
                    </ul>
                </div>
            </div>
        </div>
    );
};

// Was a `React.PureComponent` -- `memo` preserves the same shallow-prop-comparison skip-render
// optimization now that it's a function component.
const SimpleEvaluation = memo(function SimpleEvaluation({
    timeInterval,
    toggleModal,
    setQuestionnaire,
    t,
}: {
    timeInterval: SimpleTimeInterval;
    toggleModal: () => void;
    setQuestionnaire: (
        student: User,
        questions: Question[],
        questionnaire: { answers: any },
        referenceData: ReferenceData
    ) => void;
    t: TFunction;
}) {
    const appointment = timeInterval.evaluation_appointment;

    function fetchQuestionnaire() {
        if (appointment) {
            toggleModal();

            debounceModal(() => {
                api.set()
                    .success(
                        ({
                            questions,
                            new_student_level_questionnaire: questionnaire,
                            reference_data: referenceData,
                        }) =>
                            setQuestionnaire(
                                appointment.student,
                                questions,
                                questionnaire,
                                referenceData
                            )
                    )
                    .get(
                        `/new_student_level_questionnaire/appointment/${appointment.id}`
                    );
            }, 400);
        }
    }

    if (!appointment) {
        return null;
    }

    // Render
    return (
        <div className="raw-activity">
            <div className="ibox">
                <div
                    className={`ibox-title border-kind border-kind-${timeInterval.kind}`}
                >
                    <h4>
                        {toHourMin(toDate(timeInterval.start))}
                        {" - "}
                        {toHourMin(toDate(timeInterval.end))}

                        <span className="label bg-kind-e text-white pull-right">
                            {t("simplePlanning.evalBadge")}
                        </span>
                    </h4>
                </div>

                <div className="ibox-content p-xs">
                    <p className="font-bold text-primary">
                        {appointment.activity_ref.label}
                    </p>

                    <div className="list-group">
                        <div>{fullname(appointment.student)}</div>
                    </div>

                    <div className="clearfix">
                        <button
                            className="btn btn-default btn-xs btn-block"
                            onClick={() => fetchQuestionnaire()}
                        >
                            {t("evaluationModal.readSelfAssessment")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

interface SimplePlanningProps {
    data: Record<string, SimpleTimeInterval[]>;
    day: string;
    seasons: Season[];
    selectedPlanning: number | null;
    currentPlanning: number;
    listTeachers: User[];
    selectedName: { first_name: string; last_name: string };
}

// Dropped from the old propTypes' usage/declaration mismatch, fixed the other way around:
// `day`, `selectedPlanning`, `currentPlanning`, `listTeachers`, `selectedName` were all read
// unconditionally but never declared (confirmed against the real caller,
// app/views/planning/show_simple.erb, and SimplePlanning.test.tsx's fixture).

function SimplePlanning({
    data: initialData,
    day: initialDay,
    seasons,
    selectedPlanning,
    currentPlanning,
    listTeachers,
    selectedName,
}: SimplePlanningProps) {
    const { t } = useTranslation("planning");

    // Both computed once, from the initial props only -- the class constructor copied
    // `props.data`/`props.day` into state and never resynced them from props again
    // (`changeDate` below is what updates them from then on).
    const [data, setData] = useState(() => initialData);
    const [day, setDay] = useState(() => initialDay);
    const [loading, setLoading] = useState(false);
    const [evalModalIsOpen, setEvalModalIsOpen] = useState(false);
    const [questions, setQuestions] = useState<Question[] | null>(null);
    const [questionnaire, setQuestionnaireState] = useState<{
        answers: any;
    } | null>(null);
    const [referenceData, setReferenceData] = useState<ReferenceData | null>(
        null
    );
    const [student, setStudent] = useState<User | null>(null);

    function renderDayColumns(tis: SimpleTimeInterval[]) {
        return Array.isArray(tis) && tis.length
            ? tis
                  .sort(
                      (a, b) =>
                          toDate(a.start).getTime() - toDate(b.start).getTime()
                  )
                  .reduce<React.ReactNode[]>((comps, ti) => {
                      if (ti.is_validated) {
                          if (ti.kind == INTERVAL_KINDS.EVALUATION) {
                              comps.push(
                                  <SimpleEvaluation
                                      key={ti.id}
                                      timeInterval={ti}
                                      toggleModal={toggleEvalModal}
                                      setQuestionnaire={setQuestionnaire}
                                      t={t}
                                  />
                              );
                          } else {
                              comps.push(
                                  <SimpleActivity
                                      key={ti.id}
                                      timeInterval={ti}
                                      seasons={seasons}
                                      selectedPlanning={selectedPlanning}
                                      currentPlanning={currentPlanning}
                                      t={t}
                                  />
                              );
                          }
                      }

                      return comps;
                  }, [])
            : null;
    }

    function changeDate(newDay: string) {
        let historyUrl = `/planning/simple/${newDay}`;
        let intervalUrl = `/planning/simple/intervals/${newDay}/${currentPlanning}`;

        if (selectedPlanning !== null && currentPlanning !== selectedPlanning) {
            historyUrl = `/planning/simple/${newDay}/${selectedPlanning}`;
            intervalUrl = `/planning/simple/intervals/${newDay}/${selectedPlanning}`;
        }

        setLoading(true);
        // The class version stored `moment(day)` (a Moment instance) in state.day here, vs. the
        // initial plain string from props -- a mixed-type field, but harmless, since every
        // consumer below only ever reads it through `moment(day)`, which accepts either form
        // and produces the same instant. Kept as a plain string throughout for a consistent
        // state type; behaviorally identical.
        setDay(newDay);
        history.pushState({}, "", historyUrl);

        debounce(() => {
            api.set()
                .success(({ data: nextData }) => {
                    setData(nextData);
                    setLoading(false);
                })
                .get(intervalUrl);
        }, 600);
    }

    // `useCallback` with an empty dependency array (not plain function declarations) -- these 2
    // are passed straight through to `SimpleEvaluation`, which is wrapped in `React.memo` to
    // keep the old `PureComponent`'s shallow-prop-comparison skip-render behavior. Every setState
    // setter below is itself referentially stable across renders, so these callbacks' own
    // identities stay stable too; without this, `memo` would see a new function on every
    // `SimplePlanning` render and never actually skip re-rendering `SimpleEvaluation`.
    const setQuestionnaire = useCallback(
        (
            nextStudent: User,
            nextQuestions: Question[],
            nextQuestionnaire: { answers: any },
            nextReferenceData: ReferenceData
        ) => {
            setStudent(nextStudent);
            setQuestions(nextQuestions);
            setQuestionnaireState(nextQuestionnaire);
            setReferenceData(nextReferenceData);
        },
        []
    );

    const toggleEvalModal = useCallback(() => {
        setEvalModalIsOpen((prev) => !prev);
        setQuestions(null);
        setQuestionnaireState(null);
        setReferenceData(null);
        setStudent(null);
    }, []);

    const sortedData = Object.keys(data).sort();

    const momentDay = moment(day);
    const weekDay = moment(day).format("YYYY-MM-DD");

    const endOfWeek = moment(day).add(6, "d");
    const prevWeek = moment(day).subtract(1, "week").format("YYYY-MM-DD");
    const nextWeek = moment(day).add(1, "week").format("YYYY-MM-DD");

    const dateFormat =
        momentDay.month() !== endOfWeek.month() ? "DD MMMM" : "DD";
    const displayWeek = `${momentDay.format(dateFormat)} - ${endOfWeek.format("DD MMMM YYYY")}`;

    return (
        <Fragment>
            <SelectTeachers
                listTeacher={listTeachers}
                selectedName={selectedName}
                currentUser={currentPlanning}
                date={weekDay}
            />
            <div>
                <div className="calendar-header">
                    <div className="calendar-header-group">
                        <div className="date-component">
                            <button
                                className="btn btn-primary"
                                onClick={() => changeDate(prevWeek)}
                            >
                                <i className="fas fa-arrow-left" />
                            </button>

                            <h4 className="auto p-sm">{displayWeek}</h4>

                            <button
                                className="btn btn-primary"
                                onClick={() => changeDate(nextWeek)}
                            >
                                <i className="fas fa-arrow-right" />
                            </button>
                        </div>
                    </div>
                </div>

                <div>
                    <KindLegend kinds={["e", "c", "o"]} />
                </div>

                {loading ? (
                    <div>{t("common:reactTable.loadingText")}</div>
                ) : (
                    <Fragment>
                        <div className="flex">
                            {sortedData.length == 0 ? (
                                <p className="p-sm lead">
                                    {t("rawPlanning.noActivityThisWeek")}
                                </p>
                            ) : null}
                        </div>

                        <div className="row m-t-sm">
                            {sortedData.map((dayKey) => (
                                <div
                                    key={dayKey}
                                    className="col-lg-2 col-md-3 col-sm-6 col-xs-12"
                                >
                                    <h4 className="text-center bg-primary p-xs sticked">
                                        {WEEKDAYS[Number(dayKey)]}{" "}
                                        {data[dayKey].length
                                            ? toLocaleDate(
                                                  toDate(data[dayKey][0].start)
                                              )
                                            : null}
                                    </h4>

                                    {renderDayColumns(data[dayKey])}
                                </div>
                            ))}
                        </div>
                    </Fragment>
                )}

                <QuestionnaireModal
                    isOpen={evalModalIsOpen}
                    toggleModal={() => toggleEvalModal()}
                    student={student ?? undefined}
                    questions={questions ?? undefined}
                    questionnaire={questionnaire ?? undefined}
                    // QuestionnaireModal declares this required; the class version passed the same
                    // possibly-null state through untyped, relying on its own isLoading
                    // guard (!student || !questions || !questionnaire) to never actually
                    // read it before all 4 are populated together.
                    referenceData={referenceData as ReferenceData}
                />
            </div>
        </Fragment>
    );
}

export default SimplePlanning;
