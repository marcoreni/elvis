import React, { Fragment } from "react";
import { withTranslation, useTranslation } from "react-i18next";
import _ from "lodash";
import { optionMapper, findAndGet } from "./utils";
import UserWithInfos from "./common/UserWithInfos";
import moment from "moment";
import { patch, set } from "../tools/api";
import { toast } from "react-toastify";
import Select from "react-select";

function getQueriedStudents(students, search, activities) {
    if (search)
        students = students.filter(s => {
            const nameRegex = new RegExp(`${search}.*`, "i"); // Prefix text search

            return nameRegex.exec(s.first_name) || nameRegex.exec(s.last_name);
        });

    if (activities)
        students = students.filter(s =>
            activities.find(({ value }) => value === s.activity_ref.kind)
        );

    return students;
}

class EvaluationAppointmentsList extends React.Component {
    constructor(props) {
        super(props);

        const { availableIntervals } = this.props;

        const students = _.keyBy(this.props.unassigned_students, "id");

        this.state = {
            students,
            search: null,
            activities: null,
            availableIntervals,
            selectedStudents: this.props.unassigned_students,
        };
    }

    refreshAvailableIntervals() {
        set()
            .success(availableIntervals => {
                this.setState({
                    availableIntervals,
                });
            })
            .error(toast.error)
            .get(
                `/time_intervals/available_appointments?season_id=${this.props.season.previous.id}`
            );
    }

    updateStudent(student) {
        const { search, students, activities } = this.state;

        const newStudents = {
            ...students,
            [student.id]: student,
        };

        const shouldIntervalBeRemoved = Boolean(
            _.get(student, "evaluation_appointment.time_interval_id")
        );

        // Remove time interval from available list
        const newAvailableIntervals = this.state.availableIntervals.filter(
            i =>
                !shouldIntervalBeRemoved ||
                i.id !== student.evaluation_appointment.time_interval_id
        );

        this.setState(
            {
                students: newStudents,
                availableIntervals: newAvailableIntervals,
                selectedStudents: getQueriedStudents(
                    Object.values(newStudents),
                    search,
                    activities
                ),
            },
            () => this.refreshAvailableIntervals()
        );
    }

    handleUpdateSearch(query) {
        this.setState({
            search: query || null,
        });
    }

    handleUpdateActivities(activities) {
        const { students, search } = this.state;

        const selectedActivities = activities.length ? activities : null;

        this.setState({
            activities: selectedActivities,
            selectedStudents: getQueriedStudents(
                Object.values(students),
                search,
                selectedActivities
            ),
        });
    }

    handleSearch() {
        const { students, search, activities } = this.state;

        this.setState({
            selectedStudents: getQueriedStudents(
                Object.values(students),
                search,
                activities
            ),
        });
    }

    render() {
        const { t } = this.props;
        const { activityRefs, teachers } = this.props;

        const {
            selectedStudents: students,
            availableIntervals,
            selectedActivities,
            search,
        } = this.state;

        const studentsPanels = (
            <table
                className="table table-bordered m"
                style={{ background: "white" }}
            >
                <thead>
                    <tr>
                        <th />
                        <th />
                        <th colSpan="3" style={{ textAlign: "center" }}>
                            {t("evaluation:appointmentsList.colAppointment")}
                        </th>
                        <th />
                    </tr>
                    <tr>
                        <th>{t("evaluation:appointmentsList.colStudent")}</th>
                        <th>{t("evaluation:appointmentsList.colActivity")}</th>
                        <th>{t("evaluation:appointmentsList.colSlot")}</th>
                        <th>{t("evaluation:appointmentsList.colTeacher")}</th>
                        <th>{t("evaluation:appointmentsList.colRoom")}</th>
                        <th>{t("evaluation:appointmentsList.colActions")}</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.values(students).map(s => (
                        <Student
                            key={s.id}
                            teachers={teachers}
                            student={s}
                            availableIntervals={availableIntervals}
                            handleUpdate={s => this.updateStudent(s)}
                        />
                    ))}
                </tbody>
            </table>
        );

        return (
            <div>
                <div className="row m-b">
                    <div className="col-lg-4 col-sm-12 flex-column">
                        <label>
                            {t("evaluation:appointmentsList.searchStudent")}
                        </label>
                        <SearchInput
                            query={search}
                            onChange={query => this.handleUpdateSearch(query)}
                            onSubmit={() => this.handleSearch()}
                        />
                    </div>
                    <div className="col-lg-4 col-sm-12 flex-column">
                        <label>
                            {t("evaluation:appointmentsList.searchByActivity")}
                        </label>
                        <ActivityInput
                            activityRefs={activityRefs}
                            value={selectedActivities}
                            onChange={value =>
                                this.handleUpdateActivities(value)
                            }
                        />
                    </div>
                </div>

                <div className="row flex-wrap">
                    {_.size(students) ? studentsPanels : <EmptyMessage />}
                </div>
            </div>
        );
    }
}

const EmptyMessage = () => {
    const { t } = useTranslation("evaluation");

    return (
        <div className="col-xs-12">
            <h2>
                <strong>{t("evaluation:appointmentsList.empty")}</strong>
            </h2>
        </div>
    );
};

function SearchInput({ query, onChange, onSubmit }) {
    const { t } = useTranslation("evaluation");

    return (
        <div className="input-group">
            <input
                value={query || ""}
                className="form-control"
                placeholder={t(
                    "evaluation:appointmentsList.studentNamePlaceholder"
                )}
                onChange={e => onChange(e.target.value.trim())}
                type="text"
            />
            <span className="input-group-btn">
                <button className="btn btn-primary" onClick={onSubmit}>
                    <i className="fas fa-search m-r-sm" />
                    {t("evaluation:appointmentsList.search")}
                </button>
            </span>
        </div>
    );
}

function ActivityInput({ value, activityRefs, onChange }) {
    const options = _.uniqBy(activityRefs, "kind").map(ref => ({
        value: ref.kind,
        label: ref.kind,
    }));

    return (
        <Select
            isMulti
            options={options}
            value={value}
            onChange={values => onChange(values)}
        />
    );
}

function Student({ teachers, student, availableIntervals, handleUpdate }) {
    const {
        activity_ref: activityRef,
        evaluation_appointment: evaluationAppointment,
    } = student;

    const validated = Boolean(evaluationAppointment);

    return (
        <tr>
            <td>
                <UserWithInfos userId={student.id}>
                    <p style={{ fontWeight: "bold" }}>
                        {student.first_name} {student.last_name}
                    </p>
                </UserWithInfos>
            </td>
            <td>{activityRef.kind}</td>
            {validated ? (
                <StudentInfos student={student} updateStudent={handleUpdate} />
            ) : (
                <TimeIntervalSelection
                    teachers={teachers}
                    student={student}
                    intervals={availableIntervals}
                    updateStudent={handleUpdate}
                />
            )}
        </tr>
    );
}

function StudentInfos({ student, updateStudent }) {
    const { t } = useTranslation("evaluation");

    const {
        evaluation_appointment: {
            id,
            time_interval: timeInterval,
            teacher,
            room,
        },
    } = student;

    const cancelAppointment = () => {
        patch(`/evaluation_appointments/${id}`, {
            student_id: null,
            activity_application_id: null,
        }).then(({ error }) => {
            if (error) {
                toast.error(error.join("\n"));
                return;
            }

            updateStudent({
                ...student,
                evaluation_appointment: null,
            });
        });
    };

    return (
        <Fragment>
            <td>{formatIntervalForDisplay(timeInterval, t)}</td>
            <td>
                {teacher.first_name} {teacher.last_name}
            </td>
            <td>
                {t("evaluation:appointmentsList.room", {
                    label: _.get(room, "label"),
                })}
            </td>
            <td>
                <button
                    onClick={cancelAppointment}
                    className="m-t btn btn-warning"
                    style={{ alignSelf: "end" }}
                >
                    {t("common:actions.cancel")}
                </button>
            </td>
        </Fragment>
    );
}

const formatIntervalForDisplay = (i, t) => {
    const params = {
        date: moment(i.start).format("dddd D MMMM YYYY"),
        startTime: moment(i.start).format("HH:mm"),
        endTime: moment(i.end).format("HH:mm"),
    };

    return i.teacher
        ? t("evaluation:appointmentsList.intervalDisplayWithTeacher", {
              ...params,
              teacher: `${i.teacher.first_name} ${i.teacher.last_name}`,
          })
        : t("evaluation:appointmentsList.intervalDisplay", params);
};

class TimeIntervalSelectionBase extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            intervalId: null,
            filterByActivity: true,
        };
    }

    handleSelectInterval(value) {
        this.setState({ intervalId: parseInt(value) || null });
    }

    handleChangeFilterByActivity(checked) {
        this.setState({ filterByActivity: checked });
    }

    handleSubmit() {
        const appointment = findAndGet(
            this.props.intervals,
            { id: this.state.intervalId },
            "evaluation_appointment"
        );

        patch(`/evaluation_appointments/${appointment.id}`, {
            student_id: this.props.student.id,
            activity_application_id: this.props.student.activity_application.id,
        }).then(({ data: evaluation_appointment, error }) => {
            if (error) {
                toast.error(
                    error.join("\n") +
                        ". " +
                        this.props.t("evaluation:appointmentsList.refreshHint")
                );
                this.setState({ intervalId: null });
                return;
            }

            this.props.updateStudent({
                ...this.props.student,
                evaluation_appointment,
            });
        });
    }

    render() {
        const { t, intervals, student, teachers } = this.props;

        const { intervalId, filterByActivity } = this.state;

        let filteredIntervals = intervals;

        if (filterByActivity) {
            const appropriateTeachersIds = teachers
                .filter(t =>
                    t.teachers_activity_refs.find(
                        tar =>
                            tar.activity_ref.kind === student.activity_ref.kind
                    )
                )
                .map(t => t.id);

            filteredIntervals = filteredIntervals.filter(interval =>
                appropriateTeachersIds.includes(
                    _.get(interval, "evaluation_appointment.teacher_id")
                )
            );
        }

        const groupedIntervals = _(filteredIntervals)
            .sortBy("start")
            .groupBy(({ start }) =>
                moment(start)
                    .format("MMMM")
                    .toUpperCase()
            )
            .value();

        const intervalFormatter = i => {
            const teacherFirstName =
                _.get(i, "evaluation_appointment.teacher.first_name") || "?";
            const teacherLastName =
                _.get(i, "evaluation_appointment.teacher.last_name") || "?";
            const room = _.get(i, "evaluation_appointment.room.label") || "??";

            return t("evaluation:appointmentsList.intervalOption", {
                teacher: `${teacherFirstName} ${teacherLastName}`,
                room,
                interval: formatIntervalForDisplay(i, t),
            });
        };

        const options = Object.entries(groupedIntervals).map(
            ([month, intervals]) => (
                <optgroup key={month} label={month}>
                    {intervals.map(optionMapper({ label: intervalFormatter }))}
                </optgroup>
            )
        );

        return (
            <Fragment>
                <td colSpan="3">
                    <select
                        className="form-control"
                        value={intervalId || ""}
                        onChange={e =>
                            this.handleSelectInterval(e.target.value)
                        }
                    >
                        <option value="" />
                        {options}
                    </select>
                    <div className="flex flex-start-aligned">
                        <input
                            style={{ marginRight: "10px" }}
                            id={`interval-choice-${student.id}`}
                            type="checkbox"
                            defaultChecked={filterByActivity}
                            onChange={e =>
                                this.handleChangeFilterByActivity(
                                    e.target.checked
                                )
                            }
                        />
                        <label htmlFor={`interval-choice-${student.id}`}>
                            {t("evaluation:appointmentsList.onlyKindSlots", {
                                kind: student.activity_ref.kind,
                            })}
                        </label>
                    </div>
                </td>
                <td>
                    <button
                        onClick={() => this.handleSubmit()}
                        disabled={intervalId === null}
                        className="m-t btn btn-primary"
                        style={{ alignSelf: "end" }}
                    >
                        {t("common:actions.confirm")}
                    </button>
                </td>
            </Fragment>
        );
    }
}

const TimeIntervalSelection = withTranslation("evaluation")(
    TimeIntervalSelectionBase
);

export default withTranslation("evaluation")(EvaluationAppointmentsList);
