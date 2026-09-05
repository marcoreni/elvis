import React from "react";
import Calendar from "tui-calendar";
import { withTranslation } from "react-i18next";

import * as TimeIntervalHelpers from "./TimeIntervalHelpers";
import { getHoursString } from "../utils/DateUtils";

import moment from "moment-timezone";

import _ from "lodash";

const EVENT_TYPES = [
    "beforeCreateSchedule",
    "beforeDeleteSchedule",
    "beforeUpdateSchedule",
    "clickSchedule",
];

export function getTimeTemplate(schedule, isMultiView, show_activity_code, {isAllDay=false, isRoomCalendar=false, seasons=[], user=null, isMonthView=false, t=(k => k),}) {
    let html = [];
    const start = moment(schedule.start);
    const end = moment(schedule.end);

    const duration = end.diff(start, "minutes");

    // Vue mensuelle : affichage compact sur une seule ligne (façon Google Agenda)
    // pour éviter que le contenu multiligne ne déborde et se chevauche dans les cellules.
    if (isMonthView && !isAllDay) {
        const timeStr = start.format("HH:mm");

        let monthTitle;
        if (schedule.isPrivate) {
            monthTitle = t("scheduleTitles.private");
        } else if (schedule.isValidated) {
            monthTitle = schedule.title;
        } else {
            switch (schedule.kind) {
                case "o": monthTitle = t("scheduleTitles.availabilityOption"); break;
                case "c": monthTitle = t("scheduleTitles.availabilityCourse"); break;
                case "e": monthTitle = t("scheduleTitles.availabilityEvaluation"); break;
                case "p": monthTitle = t("kinds.pause"); break;
                default: monthTitle = t("scheduleTitles.availability");
            }
        }

        const comment = _.get(schedule, "raw.comment") ? ' <i class="fa fa-comment"></i>' : "";
        const label = `${timeStr} - ${monthTitle}${comment}`;

        return `<span class="ti-month-line" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${label}</span>`;
    }

    // construct lines

    let groupDisplayLine = ""; // groups
    let hourDateDisplayLine = ""; // title
    let locationTeacherDisplayLine = "<span class='ti-second-line'>"; // location
    let studentTeacherDisplayLine = "<span class='ti-third-line'>"; // students

    if (!isAllDay) {
        if (schedule.activity && schedule.activity.group_name) {
            groupDisplayLine += `<span>${schedule.activity.group_name}</span>`;
        }

        hourDateDisplayLine += "<span>" + start.format("HH:mm") + "</span>";
    }

    let pattern = "";

    switch(_.get(_.get(schedule.raw, "activity_instance.activity.location") || _.get(schedule.raw, "activity.location"), "label")) {
        case "Harfleur":
            pattern = "pattern-stars";
        default:
            break;
    }

    if(pattern)
        locationTeacherDisplayLine += `<div class="${pattern}"></div>`;

    if (schedule.isPrivate)
    {
        locationTeacherDisplayLine += '<span class="calendar-font-icon ic-lock-b"></span>';
        locationTeacherDisplayLine += " " + t("scheduleTitles.private");
    }
    else
    {
        if (schedule.isReadOnly) {
            locationTeacherDisplayLine += '<span class="calendar-font-icon ic-readonly-b"></span>';
        } else if (schedule.recurrenceRule) {
            locationTeacherDisplayLine += '<span class="calendar-font-icon ic-repeat-b"></span>';
        } else if (schedule.attendees.length > 0) {
            locationTeacherDisplayLine += '<span class="calendar-font-icon ic-user-b"></span>';
        } else if (schedule.location) {
            locationTeacherDisplayLine += '<span class="calendar-font-icon ic-location-b"></span>';
        }
        const teacherName =
            schedule.teacher.first_name + " " + schedule.teacher.last_name;
        const roomName = schedule.location;

        locationTeacherDisplayLine += isRoomCalendar ? teacherName : roomName;

        const seasonForLevel = TimeIntervalHelpers.getSeasonFromDate(
            schedule.start.toDate(),
            seasons
        );

        if (schedule.activity && schedule.activityInstance)
        {
            const students = TimeIntervalHelpers.omitInactiveStudents(schedule.activity.users, schedule.activityInstance.inactive_students);

            studentTeacherDisplayLine += (students.length === 1 ? `${students[0].first_name} ${students[0].last_name}` : students.length +
                    "/" +
                    schedule.activity.activity_ref.occupation_limit +
                    " - " +
                    TimeIntervalHelpers.levelDisplayLabel(TimeIntervalHelpers.levelDisplay(
                        students,
                        schedule.activity.activity_ref.id,
                        seasonForLevel ? seasonForLevel.id : 0
                    ))) +
                " - " +
                TimeIntervalHelpers.averageAgeDisplay(TimeIntervalHelpers.averageAge(students));
        }

        let title = t("scheduleTitles.availability");
        switch (schedule.kind) {
            case "o":
                title = t("scheduleTitles.availabilityOption");
                break;
            case "c":
                title = t("scheduleTitles.availabilityCourse");
                break;
            case "e":
                title = t("scheduleTitles.availabilityEvaluation");
                break;
            case "p":
                title = t("kinds.pause");
                break;
        }
        if (schedule.isValidated) {
            title = schedule.title;
        }

        if(schedule.raw.comment)
            title += '<i class="m-l-xs fa fa-comment"></i>';

        hourDateDisplayLine += " - " + title;

        const coverTeacher = _.get(schedule.raw.activity_instance, "cover_teacher");
        if(coverTeacher)
        {
            const teacher = _.get(schedule.activity, "teacher");

            if(teacher && teacher.id === user.id) {
                studentTeacherDisplayLine += `${t("multiViewModal.replacedBy")} <a style="color:inherit;font-weight:bold;" href="/users/${coverTeacher.id}">${coverTeacher.first_name} ${coverTeacher.last_name}</a>`;
            } else if(teacher && coverTeacher.id === user.id) {
                studentTeacherDisplayLine = `${t("calendar.substituteFor")} <a style="color:inherit;font-weight:bold;" href="/users/${teacher.id}">${teacher.first_name} ${teacher.last_name}</a>`
            }
        }
    }

    locationTeacherDisplayLine += "</span>";
    studentTeacherDisplayLine += "</span>";

    // add lines to html

    if(show_activity_code)
        html.push(groupDisplayLine);

    html.push(hourDateDisplayLine);

    if(!isMultiView)
    {
        html.push(locationTeacherDisplayLine);

        if(_.get(schedule, "activity.activity_ref.occupation_limit") === 1 && duration < 60)
        {
            // append studentTeacherDisplayLine to first element of html tab
            html = [studentTeacherDisplayLine, ...html];
        }
        else
        {
            html.push(studentTeacherDisplayLine);
        }
    }

    return html.join("<br />");
}

class CustomCalendar extends React.Component {
    constructor(props) {
        super(props);

        this.calRef = React.createRef();
    }

    componentDidMount() {
        const { t } = this.props;
        const timezoneName = moment.tz.guess();
        Calendar.setTimezoneOffsetCallback(function(timestamp) {
            return moment.tz.zone(timezoneName).utcOffset(timestamp);
        });

        const props = this.props;

        const scheduleView = ["time"];

        if (!this.props.generic) scheduleView.push("allday");

        const isMultiView = this.props.selectedPlannings.length > 1;

        this.calendar = new Calendar(this.calRef.current, {
            usageStatistics: false,
            taskView: false,
            scheduleView,
            useCreationPopup: false,
            useDetailPopup: false,
            isReadOnly: this.props.displayOnly || isMultiView,
            disableClick: isMultiView,
            disableDbClick: isMultiView,
            week: {
                startDayOfWeek: 1,
                narrowWeekend: false,
                daynames: t("calendar.daynamesShort", { returnObjects: true }),
                hourStart: 8,
                hourEnd: 22,
            },
            template: {
                timegridDisplayPrimaryTime: function(time) {
                    return time.hour + ":" + time.minutes;
                },
                monthGridHeader(model) {
                    const date = new Date(model.date);
                    const template =
                        '<span class"tui-full-calendar-weekday-grid-date">' +
                        date.getDate() +
                        "</span>";
                    return template;
                },
                monthGridHeaderExceed(hiddenSchedules) {
                    return '<span class="tui-full-calendar-weekday-grid-more-schedules">' +
                        t("calendar.moreSchedules", { n: hiddenSchedules }) + "</span>";
                },
                weekDayname(dayname) {
                    return `<div class="flex">
                        <div class="m-r-md">
                            ${
                                props.generic
                                    ? ""
                                    : `<span class="m-r-sm tui-full-calendar-dayname-date">
                                ${dayname.date}
                            </span>`
                            }
                            <span class="tui-full-calendar-dayname-name">
                                ${dayname.dayName}
                            </span>
                        </div>
                        ${
                            props.user &&
                            !props.generic &&
                            (props.isAdmin || props.isTeacher)
                                ? `<a href="/users/${props.user.id}/presence_sheet/${dayname.renderDate}"
                                class="badge badge-primary" style="align-self: center;">
                                ${t("calendar.presences")}
                            </a>`
                                : ""
                        }
                    </div>`;
                },
                allday(schedule) {
                    return schedule.title + ' <i class="fas fa-refresh"></i>';
                },
                time: (schedule) => {
                    return getTimeTemplate(
                        schedule,
                        isMultiView,
                        this.props.show_activity_code,
                        {
                            isAllDay:false,
                            isRoomCalendar: props.isRoomCalendar,
                            seasons: props.seasons,
                            user: props.user,
                            isMonthView: this.props.view === "month",
                            // read the current prop (not the mount-time `t`) so schedule titles
                            // re-render in the active language when the calendar re-renders
                            t: this.props.t,
                        }
                    );
                },
            },
            ...this.props.options,
        });

        const isDateValid = d => !isNaN(d.valueOf());

        if (this.props.conflict) {
            this.calendar.setDate(moment(this.props.conflict.ts));
            this.setState({ currentDate: this.calendar.getDate().toDate() });
        } else {
            let startDate = isDateValid(this.props.day)
                ? this.props.day
                : new Date();
            this.calendar.setDate(startDate);
            this.setState({ currentDate: this.calendar.getDate().toDate() });
        }

        this.registerEvents();
        this.renderCal();
    }

    componentDidUpdate(prevProps) {
        EVENT_TYPES.map(event => {
            if (this.props[event] !== prevProps[event]) {
                this.calendar.off(event);
                this.calendar.on(event, this.props[event]);
            }
        });
        this.renderCal();
    }

    componentWillUnmount() {
        this.calendar.destroy();
    }

    calculateTotalHours() {
        const currentDate = moment(this.props.day);
        // isoWeek (always Monday-start) rather than "week" (locale-dependent): the tui-calendar
        // grid is hardcoded to startDayOfWeek: 1, so the week-total window must be Monday-start
        // regardless of the active locale. (This used to be kept aligned by a hardcoded
        // moment.locale("fr") here, now removed — locale is centralized in frontend/i18n.)
        const granularity = this.props.view === "week" ? "isoWeek" : this.props.view;

        const lessonIntervals = this.props.intervals.filter(
            i =>
                (i.isValidated && i.kind === "c") ||
                (i.kind === "p" &&
                    i.start !== i.end &&
                    moment(i.start).isSame(currentDate, granularity))
        );
        const optionIntervals = this.props.intervals.filter(
            i =>
                i.isValidated &&
                i.kind === "o" &&
                i.start !== i.end &&
                moment(i.start).isSame(currentDate, granularity)
        );

        const lessonMinutes = lessonIntervals.map(i =>
            moment(i.end).diff(i.start, "minutes")
        );
        const optionMinutes = optionIntervals.map(i =>
            moment(i.end).diff(i.start, "minutes")
        );

        const lessonTotal = lessonMinutes.reduce((a, b) => a + b, 0) / 60;
        const optionTotal = optionMinutes.reduce((a, b) => a + b, 0) / 60;

        return {
            lesson: lessonTotal,
            option: optionTotal,
        };
    }

    registerEvents() {
        const events = EVENT_TYPES.reduce((handlers, event) => {
            if (this.props[event]) {
                return { ...handlers, [event]: this.props[event] };
            }

            return handlers;
        }, {});

        this.calendar.on(events);
    }

    renderCal() {
        this.calendar.clear();
        this.calendar.createSchedules(this.props.intervals);
        this.calendar.render();
    }

    handleToggleView(view) {
        this.calendar.changeView(view, true);
        if (view !== this.props.view)
            this.props.updateIntervals(this.props.day, view);
    }

    handleToggleTodayView() {
        this.calendar.setDate(new Date());
        this.props.updateIntervals(new Date(), this.props.view);
        this.setState({ currentDate: new Date() });
    }
    handleToggleSeasonStartView() {
        const seasonStart = new Date(this.props.season.start);
        this.calendar.setDate(seasonStart);
        this.props.updateIntervals(seasonStart, this.props.view);
    }
    handleToggleNextSeasonStartView() {
        const nextSeasonStart = new Date(this.props.nextSeason.start);

        // si le jour de la semaine n'est pas lundi, ajuster nextSeasonStart
        if (nextSeasonStart.getDay() !== 1) {
            nextSeasonStart.setDate(nextSeasonStart.getDate() + (1 + 7 - nextSeasonStart.getDay()) % 7);
        }

        this.calendar.setDate(nextSeasonStart);
        this.props.updateIntervals(nextSeasonStart, this.props.view);
        this.setState({ currentDate: nextSeasonStart });
    }
    handleTogglePrev() {
        this.calendar.prev();
        this.props.updateIntervals(
            this.calendar.getDate().toDate(),
            this.props.view
        );
        this.setState({ currentDate: this.calendar.getDate().toDate() });
    }
    handleToggleNext() {
        this.calendar.next();
        this.props.updateIntervals(
            this.calendar.getDate().toDate(),
            this.props.view
        );
        this.setState({ currentDate: this.calendar.getDate().toDate() });
    }

    render() {
        const totalHours = this.calculateTotalHours();

        return (
            <React.Fragment>
                {this.props.conflict || this.props.generic ? null : (
                    <CalendarControls
                        t={this.props.t}
                        currentDate={this.props.day}
                        conflicts={this.props.conflicts}
                        view={this.props.view}
                        totalHours={totalHours}
                        handleToggleView={view => this.handleToggleView(view)}
                        handleToggleSeasonStartView={() =>
                            this.handleToggleSeasonStartView()
                        }
                        handleToggleNextSeasonStartView={() =>
                            this.handleToggleNextSeasonStartView()
                        }
                        handleToggleTodayView={() =>
                            this.handleToggleTodayView()
                        }
                        handleTogglePrev={() => this.handleTogglePrev()}
                        handleToggleNext={() => this.handleToggleNext()}
                    />
                )}

                <div className="loader-wrap">
                    {this.props.loading && <div className="loader">{this.props.t("common:reactTable.loadingText")}</div>}
                    <div ref={this.calRef} className={"conflict-calendar" + (this.props.loading && " loading" || "")} />
                </div>
            </React.Fragment>
        );
    }
}

export const CalendarControls = ({
    t,
    currentDate,
    view,
    totalHours,
    handleToggleView,
    handleToggleTodayView,
    handleToggleSeasonStartView,
    handleToggleNextSeasonStartView,
    handleTogglePrev,
    handleToggleNext,
    conflicts,
}) => {
    const filteredConflicts = _.filter(conflicts, c => !c.is_resolved);

    return (
        <React.Fragment>
            <div className="calendar-header">
                <div className="calendar-header-group">
                    <div className="date-component">
                        <button
                            className="btn btn-primary"
                            onClick={() => handleTogglePrev()}
                        >
                            <i className="fas fa-arrow-left" />
                        </button>
                        {currentDate != null ? (
                            <CurrentDateDisplay
                                currentDate={currentDate}
                                view={view}
                            />
                        ) : null}
                        <button
                            className="btn btn-primary"
                            onClick={() => handleToggleNext()}
                        >
                            <i className="fas fa-arrow-right" />
                        </button>
                    </div>
                    <span className="separator">|</span>
                    <div datatoggle="buttons-checkbox">
                        <button
                            className={`btn btn-primary ${view === "month" && "active"}`}
                            onClick={() => handleToggleView("month")}
                        >
                            {t("calendar.views.month")}
                        </button>
                        <button
                            className={`btn btn-primary ${view === "week" && "active"}`}
                            onClick={() => handleToggleView("week")}
                        >
                            {t("calendar.views.week")}
                        </button>
                        <button
                            className={`btn btn-primary ${view === "day" && "active"}`}
                            onClick={() => handleToggleView("day")}
                        >
                            {t("calendar.views.day")}
                        </button>
                    </div>
                    <span className="separator">|</span>
                </div>

                <div className="calendar-header-group">
                    <div className="btn-group">
                        <button
                            className="btn btn-primary"
                            data-tippy-content={t("calendar.tooltips.seasonStart")}
                            onClick={() => handleToggleSeasonStartView()}>
                            <i className="fas fa-angle-double-left"></i>
                        </button>
                        <button
                            className="btn btn-primary"
                            data-tippy-content={t("calendar.tooltips.today")}
                            onClick={() => handleToggleTodayView()}>
                            <i className="fas fa-arrow-down"></i>
                        </button>
                        <button
                            className="btn btn-primary"
                            data-tippy-content={t("calendar.tooltips.nextSeason")}
                            onClick={() => handleToggleNextSeasonStartView()}>
                            <i className="fas fa-angle-double-right"></i>
                        </button>
                    </div>
                    <span className="separator">|</span>
                    {conflicts && filteredConflicts.length > 0 ? (
                        <React.Fragment></React.Fragment>
                    ) : null}
                    <div className="m-l">
                        <h3>
                            {t("calendar.hoursSummary", {
                                lesson: getHoursString(totalHours.lesson),
                                option: getHoursString(totalHours.option),
                            })}
                        </h3>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
};

const currentDateInclude = (currentDate, ts) => {};

const CurrentDateDisplay = ({ currentDate, view }) => {
    // TODO We can do much better, but not for now
    const date = moment(currentDate);
    let dateFormat = "";
    switch (view) {
        case "day":
            dateFormat = date.format("DD MMMM YYYY");
            break;
        case "week":
            dateFormat =
                date.format("DD") +
                " - " +
                date.add(6, "d").format("DD MMMM YYYY");
            break;
        case "month":
            dateFormat = date.format("MMMM YYYY");
            break;
    }

    return <h4>{dateFormat}</h4>;
};

export default withTranslation("planning")(CustomCalendar);
