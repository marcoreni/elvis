import React from "react";
import { withTranslation } from "react-i18next";
import { Form } from "react-final-form";
import StepZilla from "react-stepzilla";
import swal from "sweetalert2";
import { toast } from "react-toastify";
import { MESSAGES } from "../../tools/constants";
import AddActivityForCourse from "./AddActivityForCourse";
import AddSlotForCourse from "./AddSlotForCourse";
import AddTeacherForCourse from "./AddTeacherForCourse";
import AddLocationForCourse from "./AddLocationForCourse";
import * as api from "../../tools/api.js";
import moment from "moment-timezone";
import { csrfToken } from "../utils";

class AddCourse extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            seasons: undefined,
            season: undefined,
            teacher: undefined,
            activityRef: undefined,
            activityRefKind: undefined,
            room: undefined,
            location: undefined,
            dayOfWeek: undefined,
            fromDate: undefined,
            toDate: undefined,
            startTime: undefined,
            endTime: undefined,
            firstDayStartTime: undefined,
            firstDayEndTime: undefined,
            holidays: [],
            showAlert: false,
        };

        let current_season = undefined;
        api.set()
            .success( data => {
                current_season = data
                    ? data.find(season => season.is_current)
                    : undefined;

                if (current_season) {
                    this.setState({
                        season: {
                            id: current_season.id,
                            label: current_season.label,
                        },
                        startTime: moment(current_season.start).set({
                            hour: 8
                        }),
                        endTime:moment(current_season.start).set({ hour: 9 }),

                        fromDate: moment(current_season.start).format("YYYY-MM-DD"),
                        toDate: moment(current_season.end).format("YYYY-MM-DD"),
                        dayOfWeek: "1",
                        holidays: current_season.holidays,
                        showAlert: current_season.holidays.length === 0,
                    });
                }
            })
            .get(`/seasons`);

        this.handleFieldChange = this.handleFieldChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit() {
        const { t } = this.props;

        const {season, teacher, activityRef, room, dayOfWeek, fromDate, toDate, firstDayStartTime, firstDayEndTime} = this.state
        if (
            !season ||
            !teacher ||
            !activityRef ||
            !room ||
            !dayOfWeek ||
            !fromDate ||
            !toDate ||
            !firstDayStartTime ||
            !firstDayEndTime
        ) {
            toast.error(MESSAGES.err_data_missing, { autoClose: 3000 });
        } else {
            swal({
                title: t("addCourse.loading"),
                onOpen: () => swal.showLoading(),
            });
            const authToken = _.get(this.state, "infos.authentication_token");
            api.set()
                .success(res => {
                    let htmltext = `<p>${t("addCourse.created")}</p>`;

                    swal.fire({
                        title: t("addCourse.successTitle"),
                        html: htmltext,
                        type: "success",
                        allowOutsideClick: false,
                        showCancelButton: true,
                        width: "400px",
                        cancelButtonText: t("addCourse.seeCourseList"),
                        confirmButtonText: t("addCourse.createAnother"),
                    }).then(res => {
                        if (res.value) {
                            window.location.href = `/addCourse?auth_token=${csrfToken}`;
                        } else {
                            window.location.href = `/activities?auth_token=${csrfToken}`;
                        }
                    });
                })
                .error(errorMsg => {
                    console.log("error adding course : ", errorMsg);
                    swal({
                        type: "error",
                        title: t("addCourse.genericError"),
                    });
                })
                .post(
                    `/activity${authToken ? `?auth_token=${authToken}` : ""}`,
                    {
                        activity: {
                            seasonId: this.state.season.id,
                            teacherId: this.state.teacher.id,
                            activityRefId: this.state.activityRef.id,
                            roomId: this.state.room.id,
                            dayOfWeek: this.state.dayOfWeek,
                            startTime: moment(firstDayStartTime),
                            endTime: moment(firstDayEndTime),
                        },
                        recurrence: 1,
                        fromDate: this.state.fromDate,
                        toDate: this.state.toDate,
                    }
                );
        }
    }

    handleFieldChange(values) {
        const updatedSummary = { ...this.state.summary, ...values.summary };
        this.setState({
            ...this.state,
            ...values,
            summary: updatedSummary,
        });
    }

    closeAlert = () => {
        this.setState({ showAlert: false });
    };

    render() {
        const { t } = this.props;
        let {
            season,
            teacher,
            activityRef,
            activityRefKind,
            room,
            location,
            startTime,
            endTime,
            fromDate,
            toDate,
            dayOfWeek,
            firstDayStartTime,
            firstDayEndTime
        } = this.state;

        const href_path = this.props.href_path;

        const summary = {
            teacher: teacher
                ? {
                      first_name: teacher.first_name,
                      last_name: teacher.last_name,
                  }
                : undefined,
            activityRef: activityRef ? activityRef.label : undefined,
            room: room ? room.label : undefined,
            location: location ? location.label : undefined,
            firstDayStartTime: firstDayStartTime,
            firstDayEndTime: firstDayEndTime,
            dayOfWeek: dayOfWeek
            
        };

        const steps = [
            {
                name: t("addActivity.stepName"),
                component: (
                    <AddActivityForCourse
                        href_path={href_path}
                        activityRefId={activityRef ? activityRef.id : undefined}
                        activityRefKindId={activityRefKind}
                        summary={summary}
                        onChange={this.handleFieldChange}
                    />
                ),
            },
            {
                name: t("addSlot.stepName"),
                component: (
                    <AddSlotForCourse
                        initialValues={{
                            seasonId: season ? season.id : undefined,
                            startTime: startTime,
                            endTime: endTime,
                            fromDate: fromDate,
                            toDate: toDate,
                            dayOfWeek: dayOfWeek,
                        }}
                        href_path={href_path}
                        summary={summary}
                        onChange={this.handleFieldChange}
                    />
                ),
            },
            {
                name: t("addTeacher.stepName"),
                component: (
                    <AddTeacherForCourse
                        initialValues={{
                            activityRefId: activityRef ? activityRef.id : "",
                            teacherId: teacher ? teacher.id : undefined,
                            firstDayStartTime: firstDayStartTime
                                ? moment.utc(firstDayStartTime).format()
                                : undefined,
                            firstDayEndTime: firstDayEndTime
                                ? moment.utc(firstDayEndTime).format()
                                : undefined,
                            fromDate: fromDate,
                            toDate: toDate
                        }}
                        summary={summary}
                        href_path={href_path}
                        onChange={this.handleFieldChange}
                    />
                ),
            },
            {
                name: t("addLocation.stepName"),
                component: (
                    <AddLocationForCourse
                        initialValues={{
                            activityRefId: activityRef ? activityRef.id : "",
                            roomId: room ? room.id : undefined,
                            locationId: location ? location.id : undefined,
                            firstDayStartTime: firstDayStartTime
                                ? firstDayStartTime.format("HH,mm")
                                : undefined,
                            firstDayEndTime: firstDayEndTime
                                ? firstDayEndTime.format("HH,mm")
                                : undefined,
                            fromDate: fromDate,
                            toDate: toDate,
                        }}
                        summary={summary}
                        href_path={href_path}
                        onChange={this.handleFieldChange}
                    />
                ),
            },
        ];

        if (this.state.season !== undefined) {
            return (
                <Form
                    onSubmit={this.handleSubmit}
                    render={({ handleSubmit }) => (
                        <form onSubmit={handleSubmit} className="p-lg">
                            <div className="padding-page application-form">
                                {this.state.holidays.length === 0 && this.state.showAlert && (
                                    <div className="alert alert-danger mb-5" role="alert">
                                        {t("planning:container.holidaysAlert")}&nbsp;
                                        <a href={`/seasons/${this.state.season.id}/edit`}>
                                            {t("planning:container.manageHolidaysLink")}
                                        </a>

                                        <button
                                            type="button"
                                            className="close"
                                            aria-label={t("planning:common.close")}
                                            onClick={this.closeAlert}
                                        >
                                            <span aria-hidden="true">&times;</span>
                                        </button>
                                    </div>
                                )}
                                <h1 className="text-center">{t("addCourse.title")}</h1>
                                <div className="step-progress">
                                    <StepZilla
                                        steps={steps}
                                        showSteps={true}
                                        stepsNavigation={true}
                                        nextButtonText={t("addCourse.nextStep")}
                                        backButtonText={t("addCourse.prevStep")}
                                        nextButtonCls={
                                            "btn btn-prev btn-primary btn-md pull-right"
                                        }
                                        backButtonCls={
                                            "btn btn-prev btn-primary btn-md pull-left"
                                        }
                                    />
                                </div>
                            </div>
                        </form>
                    )}
                />
            );
        } else { return <div>{t("common:reactTable.loadingText")}</div> }

    }
}

export default withTranslation("courses")(AddCourse);
