import React, { useCallback, useMemo, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import frLocale from "@fullcalendar/core/locales/fr";
import type {
    DateSelectArg,
    DayHeaderContentArg,
    EventClickArg,
    EventContentArg,
    EventDropArg,
    MoreLinkContentArg,
} from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { withTranslation, WithTranslation } from "react-i18next";

import * as TimeIntervalHelpers from "./TimeIntervalHelpers";
import { getHoursString } from "../utils/DateUtils";
import i18n from "../../i18n";

import moment from "moment";

import _ from "lodash";

// The domain "schedule" shape is built by TimeIntervalHelpers.formatIntervalsForSchedule and
// consumed all the way up through Planning.jsx and several modal components -- it carries
// whatever fields the raw interval had (kind/teacher/activity/activityInstance/raw/etc.) on top
// of the calendar-generic ones below. Not worth modeling exhaustively here; callers already know
// its shape.
type Schedule = Record<string, any>;

const VIEW_MAP: Record<string, string> = {
    month: "dayGridMonth",
    week: "timeGridWeek",
    day: "timeGridDay",
};

interface TimeTemplateOptions {
    isAllDay?: boolean;
    isRoomCalendar?: boolean;
    seasons?: any[];
    user?: any;
    isMonthView?: boolean;
    t?: (key: string, opts?: any) => any;
}

export function getTimeTemplate(
    schedule: any,
    isMultiView: any,
    show_activity_code: any,
    options: TimeTemplateOptions
) {
    const {
        isAllDay = false,
        isRoomCalendar = false,
        seasons = [],
        user = null,
        isMonthView = false,
        t = (k: string) => k,
    } = options;
    let html: any[] = [];
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
                case "o":
                    monthTitle = t("scheduleTitles.availabilityOption");
                    break;
                case "c":
                    monthTitle = t("scheduleTitles.availabilityCourse");
                    break;
                case "e":
                    monthTitle = t("scheduleTitles.availabilityEvaluation");
                    break;
                case "p":
                    monthTitle = t("kinds.pause");
                    break;
                default:
                    monthTitle = t("scheduleTitles.availability");
            }
        }

        const comment = _.get(schedule, "raw.comment")
            ? ' <i class="fa fa-comment"></i>'
            : "";
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

    switch (
        _.get(
            _.get(schedule.raw, "activity_instance.activity.location") ||
                _.get(schedule.raw, "activity.location"),
            "label"
        )
    ) {
        case "Harfleur":
            pattern = "pattern-stars";
        default:
            break;
    }

    if (pattern) locationTeacherDisplayLine += `<div class="${pattern}"></div>`;

    if (schedule.isPrivate) {
        // These icon spans used to rely on tui-calendar's own bundled icon-font CSS (removed
        // along with the library) -- swapped for this app's existing Font Awesome icons.
        locationTeacherDisplayLine += '<i class="fas fa-lock"></i>';
        locationTeacherDisplayLine += " " + t("scheduleTitles.private");
    } else {
        if (schedule.isReadOnly) {
            locationTeacherDisplayLine += '<i class="fas fa-eye"></i>';
        } else if (schedule.recurrenceRule) {
            locationTeacherDisplayLine += '<i class="fas fa-sync"></i>';
        } else if (schedule.attendees.length > 0) {
            locationTeacherDisplayLine += '<i class="fas fa-user"></i>';
        } else if (schedule.location) {
            locationTeacherDisplayLine +=
                '<i class="fas fa-map-marker-alt"></i>';
        }
        const teacherName =
            schedule.teacher.first_name + " " + schedule.teacher.last_name;
        const roomName = schedule.location;

        locationTeacherDisplayLine += isRoomCalendar ? teacherName : roomName;

        const seasonForLevel = TimeIntervalHelpers.getSeasonFromDate(
            schedule.start.toDate(),
            seasons
        );

        if (schedule.activity && schedule.activityInstance) {
            const students: any[] = TimeIntervalHelpers.omitInactiveStudents(
                schedule.activity.users,
                schedule.activityInstance.inactive_students
            );

            studentTeacherDisplayLine +=
                (students.length === 1
                    ? `${students[0].first_name} ${students[0].last_name}`
                    : students.length +
                      "/" +
                      schedule.activity.activity_ref.occupation_limit +
                      " - " +
                      TimeIntervalHelpers.levelDisplayLabel(
                          TimeIntervalHelpers.levelDisplay(
                              students,
                              schedule.activity.activity_ref.id,
                              seasonForLevel ? seasonForLevel.id : 0
                          )
                      )) +
                " - " +
                TimeIntervalHelpers.averageAgeDisplay(
                    TimeIntervalHelpers.averageAge(students)
                );
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

        if (schedule.raw.comment)
            title += '<i class="m-l-xs fa fa-comment"></i>';

        hourDateDisplayLine += " - " + title;

        const coverTeacher = _.get(
            schedule.raw.activity_instance,
            "cover_teacher"
        );
        if (coverTeacher) {
            const teacher = _.get(schedule.activity, "teacher");

            if (teacher && teacher.id === user.id) {
                studentTeacherDisplayLine += `${t("multiViewModal.replacedBy")} <a style="color:inherit;font-weight:bold;" href="/users/${coverTeacher.id}">${coverTeacher.first_name} ${coverTeacher.last_name}</a>`;
            } else if (teacher && coverTeacher.id === user.id) {
                studentTeacherDisplayLine = `${t("calendar.substituteFor")} <a style="color:inherit;font-weight:bold;" href="/users/${teacher.id}">${teacher.first_name} ${teacher.last_name}</a>`;
            }
        }
    }

    locationTeacherDisplayLine += "</span>";
    studentTeacherDisplayLine += "</span>";

    // add lines to html

    if (show_activity_code) html.push(groupDisplayLine);

    html.push(hourDateDisplayLine);

    if (!isMultiView) {
        html.push(locationTeacherDisplayLine);

        if (
            _.get(schedule, "activity.activity_ref.occupation_limit") === 1 &&
            duration < 60
        ) {
            // append studentTeacherDisplayLine to first element of html tab
            html = [studentTeacherDisplayLine, ...html];
        } else {
            html.push(studentTeacherDisplayLine);
        }
    }

    return html.join("<br />");
}

// Rebuilds a tui-calendar-shaped "schedule" object from a FullCalendar EventApi so that
// Planning.jsx and its modals (which read .raw/.kind/.teacher/.activity/.activityInstance/etc,
// none of which FullCalendar knows about natively) see the exact same shape they always have.
// extendedProps carries the original schedule verbatim (set when building the `events` array
// below); start/end are re-derived from the live FullCalendar event so drag/resize updates are
// reflected, wrapped in moment() so callers can keep calling .toDate() the way tui-calendar's
// TZDate always let them.
function reconstructSchedule(event: {
    title: string;
    start: Date | null;
    end: Date | null;
    allDay: boolean;
    extendedProps: Record<string, any>;
}): Schedule {
    // event.id is intentionally not used here -- FullCalendar requires string event ids, but
    // extendedProps.id already carries the schedule's real id (often numeric) exactly as
    // Planning.jsx's own strict-equality lookups (e.g. `i.id === interval.id`) expect.
    //
    // event.end is null whenever FullCalendar considers the event zero-duration (start >= end) --
    // real data here (e.g. unscheduled "pause" markers, see calculateTotalHours' `i.start !==
    // i.end` check below) does include start === end intervals. Falling back to `start` keeps
    // `.toDate()`/moment usage elsewhere from silently receiving an Invalid Date. Not correct for
    // an all-day event (whose real end would be start + 1 day), but every current all-day
    // consumer (this file's own eventContent, Planning.jsx's clickSchedule) short-circuits on
    // isAllDay before reading .end at all -- revisit this fallback if that ever changes.
    return {
        ...event.extendedProps,
        title: event.title,
        isAllDay: event.allDay,
        start: moment(event.start),
        end: moment(event.end ?? event.start),
    };
}

interface CalendarProps extends WithTranslation {
    intervals: Schedule[];
    selectedPlannings: any[];
    show_activity_code?: boolean;
    generic?: boolean;
    user?: any;
    isTeacher?: boolean;
    isAdmin?: boolean;
    season?: { start: string };
    seasons?: any[];
    nextSeason?: { start: string };
    conflicts?: any[];
    conflict?: { ts: string | number } | null;
    displayOnly?: boolean;
    isRoomCalendar?: boolean;
    day: Date;
    loading?: boolean;
    view: "month" | "week" | "day";
    updateIntervals: (day: Date, view: string) => void;
    beforeCreateSchedule?: (interval: Schedule) => void;
    beforeUpdateSchedule?: (event: {
        schedule: Schedule;
        start: any;
        end: any;
    }) => any;
    // Accepted for interface parity with what Planning.jsx passes, but currently unwired below --
    // tui-calendar only fired this from its own built-in delete popup, which the app always kept
    // disabled (useDetailPopup: false), and FullCalendar has no equivalent built-in gesture to
    // wire it to. Pre-existing dead/broken path, see docs/KnownIssues.md.
    beforeDeleteSchedule?: (event: { schedule: Schedule }) => void;
    clickSchedule?: (event: { schedule: Schedule }) => void;
}

const isDateValid = (d: any) => d instanceof Date && !isNaN(d.valueOf());

function CustomCalendar(props: CalendarProps) {
    const { t } = props;
    const calendarRef = useRef<FullCalendar>(null);

    const isMultiView = props.selectedPlannings.length > 1;
    const isReadOnly = !!props.displayOnly || isMultiView;

    // FullCalendar only honors initialDate on mount, same as tui-calendar's original
    // componentDidMount-only setDate() call -- neither reacts to `day`/`conflict` changing later,
    // navigation after mount is driven entirely by the toolbar (which also calls
    // updateIntervals to keep the parent in sync).
    const initialDateRef = useRef<Date>(
        props.conflict
            ? new Date(props.conflict.ts)
            : isDateValid(props.day)
              ? props.day
              : new Date()
    );

    const daynames = useMemo(
        () => t("calendar.daynamesShort", { returnObjects: true }) as string[],
        [t]
    );

    const events = useMemo(
        () =>
            props.intervals.map((schedule) => {
                // The tui-calendar fork's Schedule model renamed activity_instance ->
                // activityInstance when it built its internal model (node_modules/tui-calendar/
                // src/js/model/schedule.js) -- formatIntervalsForSchedule only ever set the
                // snake_case key, so callers reading the camelCase field (Planning.jsx,
                // MultiViewModal.jsx, this file's own getTimeTemplate) need that rename replicated
                // here, or activityInstance is silently undefined everywhere downstream.
                const normalizedSchedule = {
                    ...schedule,
                    activityInstance:
                        schedule.activityInstance ??
                        schedule.activity_instance ??
                        null,
                };

                return {
                    id: String(schedule.id),
                    title: schedule.title,
                    start: schedule.start,
                    end: schedule.end,
                    allDay: !!schedule.isAllDay,
                    editable: !isReadOnly && !schedule.isReadOnly,
                    // formatIntervalsForSchedule computes per-event color/bgColor/borderColor
                    // (activity/kind coding, conflict greying, cover-teacher highlighting) --
                    // FullCalendar's field names differ from tui-calendar's.
                    backgroundColor: schedule.bgColor,
                    borderColor: schedule.borderColor,
                    textColor: schedule.color,
                    extendedProps: normalizedSchedule,
                };
            }),
        [props.intervals, isReadOnly]
    );

    const eventContent = useCallback(
        (arg: EventContentArg) => {
            if (arg.event.allDay) {
                // All-day entries today are only season holidays (formatHolidays), never
                // recurring/refreshing anything -- the icon here used to be fa-refresh (a v4 name,
                // rendered nothing in this app's FA5 install even before this migration), which
                // read as a stray "sync" glyph next to a holiday name and nothing else. Dropped
                // rather than swapped to another icon, since no icon is actually more informative
                // than a misleading one for a plain read-only date label.
                return { html: arg.event.title };
            }

            const schedule = reconstructSchedule(arg.event);
            return {
                html: getTimeTemplate(
                    schedule,
                    isMultiView,
                    props.show_activity_code,
                    {
                        isAllDay: false,
                        isRoomCalendar: props.isRoomCalendar,
                        seasons: props.seasons,
                        user: props.user,
                        isMonthView: props.view === "month",
                        t: props.t,
                    }
                ),
            };
        },
        [
            isMultiView,
            props.show_activity_code,
            props.isRoomCalendar,
            props.seasons,
            props.user,
            props.view,
            props.t,
        ]
    );

    const dayHeaderContent = useCallback(
        (arg: DayHeaderContentArg) => {
            // dayGridMonth's header row is a plain "one column per weekday" strip with no real
            // per-cell date (FullCalendar synthesizes an arbitrary Jan 1970 date for it) -- this
            // custom content (per-day date, presence-sheet link) only makes sense in week/day
            // views, which tui-calendar's own weekDayname template (the one this replaces) was
            // exclusively used for too. `true` tells FullCalendar to fall back to its own default
            // day-name rendering for month view.
            if (arg.view.type === "dayGridMonth") {
                return true;
            }

            const dayName = daynames[arg.date.getDay()];
            const renderDate = moment(arg.date).format("YYYY-MM-DD");

            return {
                html: `<div class="flex" style="align-items: center; height: 100%;">
                    <div class="m-r-md">
                        ${
                            props.generic
                                ? ""
                                : `<span class="m-r-sm tui-full-calendar-dayname-date">
                            ${arg.date.getDate()}
                        </span>`
                        }
                        <span class="tui-full-calendar-dayname-name">
                            ${dayName}
                        </span>
                    </div>
                    ${
                        props.user &&
                        !props.generic &&
                        (props.isAdmin || props.isTeacher)
                            ? `<a href="/users/${props.user.id}/presence_sheet/${renderDate}"
                            class="badge badge-primary" style="align-self: center;">
                            ${t("calendar.presences")}
                        </a>`
                            : ""
                    }
                </div>`,
            };
        },
        [daynames, props.generic, props.user, props.isAdmin, props.isTeacher, t]
    );

    const moreLinkContent = useCallback(
        (arg: MoreLinkContentArg) => ({
            html:
                '<span class="tui-full-calendar-weekday-grid-more-schedules">' +
                t("calendar.moreSchedules", { n: arg.num }) +
                "</span>",
        }),
        [t]
    );

    const handleSelect = useCallback(
        (selectInfo: DateSelectArg) => {
            props.beforeCreateSchedule?.({
                start: moment(selectInfo.start),
                end: moment(selectInfo.end),
                isAllDay: selectInfo.allDay,
            });
            calendarRef.current?.getApi().unselect();
        },
        [props.beforeCreateSchedule]
    );

    const handleEventClick = useCallback(
        (clickInfo: EventClickArg) => {
            props.clickSchedule?.({
                schedule: reconstructSchedule(clickInfo.event),
            });
        },
        [props.clickSchedule]
    );

    const handleEventChange = useCallback(
        (info: EventDropArg | EventResizeDoneArg) => {
            // Reuses schedule.start/.end (not separate moment(info.event.start/.end) calls) so
            // the null-end guard in reconstructSchedule actually applies here too -- Planning.jsx
            // reads this `end` argument directly (Planning.jsx:699-700), not schedule.end.
            const schedule = reconstructSchedule(info.event);
            const result = props.beforeUpdateSchedule?.({
                schedule,
                start: schedule.start,
                end: schedule.end,
            });

            // Planning.jsx's beforeUpdateSchedule ternary explicitly returns `null` when the
            // update isn't allowed (e.g. a non-admin teacher without edit rights), and its
            // allowed branch (handleUpdateTimeInterval) has no return statement at all --
            // `undefined` -- so `=== null` is the precise "explicitly rejected" signal, not a
            // general falsy check (which would also revert every successful update).
            // FullCalendar has already optimistically applied the drag/resize by this point,
            // unlike tui-calendar's rebuild-every-render approach that self-corrected on the next
            // unrelated re-render -- reverting explicitly here is both correct and more immediate.
            if (result === null) {
                info.revert();
            }
        },
        [props.beforeUpdateSchedule]
    );

    const handleToggleView = useCallback(
        (view: string) => {
            calendarRef.current?.getApi().changeView(VIEW_MAP[view]);
            if (view !== props.view) props.updateIntervals(props.day, view);
        },
        [props.view, props.day, props.updateIntervals]
    );

    const handleToggleTodayView = useCallback(() => {
        const api = calendarRef.current?.getApi();
        const today = new Date();
        api?.gotoDate(today);
        props.updateIntervals(today, props.view);
    }, [props.view, props.updateIntervals]);

    const handleToggleSeasonStartView = useCallback(() => {
        if (!props.season) return;
        const seasonStart = new Date(props.season.start);
        calendarRef.current?.getApi().gotoDate(seasonStart);
        props.updateIntervals(seasonStart, props.view);
    }, [props.season, props.view, props.updateIntervals]);

    const handleToggleNextSeasonStartView = useCallback(() => {
        if (!props.nextSeason) return;
        const nextSeasonStart = new Date(props.nextSeason.start);

        // si le jour de la semaine n'est pas lundi, ajuster nextSeasonStart
        if (nextSeasonStart.getDay() !== 1) {
            nextSeasonStart.setDate(
                nextSeasonStart.getDate() +
                    ((1 + 7 - nextSeasonStart.getDay()) % 7)
            );
        }

        calendarRef.current?.getApi().gotoDate(nextSeasonStart);
        props.updateIntervals(nextSeasonStart, props.view);
    }, [props.nextSeason, props.view, props.updateIntervals]);

    const handleTogglePrev = useCallback(() => {
        const api = calendarRef.current?.getApi();
        api?.prev();
        const newDate = api?.getDate();
        if (newDate) props.updateIntervals(newDate, props.view);
    }, [props.view, props.updateIntervals]);

    const handleToggleNext = useCallback(() => {
        const api = calendarRef.current?.getApi();
        api?.next();
        const newDate = api?.getDate();
        if (newDate) props.updateIntervals(newDate, props.view);
    }, [props.view, props.updateIntervals]);

    const totalHours = useMemo(() => {
        const currentDate = moment(props.day);
        // isoWeek (always Monday-start) rather than "week" (locale-dependent): the calendar grid
        // is hardcoded to a Monday-start week (firstDay: 1 below), so the week-total window must
        // be Monday-start regardless of the active locale.
        const granularity = props.view === "week" ? "isoWeek" : props.view;

        const lessonIntervals = props.intervals.filter(
            (i) =>
                (i.isValidated && i.kind === "c") ||
                (i.kind === "p" &&
                    i.start !== i.end &&
                    moment(i.start).isSame(currentDate, granularity))
        );
        const optionIntervals = props.intervals.filter(
            (i) =>
                i.isValidated &&
                i.kind === "o" &&
                i.start !== i.end &&
                moment(i.start).isSame(currentDate, granularity)
        );

        const lessonMinutes = lessonIntervals.map((i) =>
            moment(i.end).diff(i.start, "minutes")
        );
        const optionMinutes = optionIntervals.map((i) =>
            moment(i.end).diff(i.start, "minutes")
        );

        const lessonTotal = lessonMinutes.reduce((a, b) => a + b, 0) / 60;
        const optionTotal = optionMinutes.reduce((a, b) => a + b, 0) / 60;

        return { lesson: lessonTotal, option: optionTotal };
    }, [props.day, props.view, props.intervals]);

    return (
        <React.Fragment>
            {props.conflict || props.generic ? null : (
                <CalendarControls
                    t={props.t}
                    currentDate={props.day}
                    conflicts={props.conflicts}
                    view={props.view}
                    totalHours={totalHours}
                    handleToggleView={handleToggleView}
                    handleToggleSeasonStartView={handleToggleSeasonStartView}
                    handleToggleNextSeasonStartView={
                        handleToggleNextSeasonStartView
                    }
                    handleToggleTodayView={handleToggleTodayView}
                    handleTogglePrev={handleTogglePrev}
                    handleToggleNext={handleToggleNext}
                />
            )}

            <div className="loader-wrap">
                {props.loading && (
                    <div className="loader">
                        {t("common:reactTable.loadingText")}
                    </div>
                )}
                <div
                    className={
                        "conflict-calendar" +
                        ((props.loading && " loading") || "")
                    }
                >
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[
                            dayGridPlugin,
                            timeGridPlugin,
                            interactionPlugin,
                        ]}
                        headerToolbar={false}
                        height="100%"
                        expandRows={true}
                        locales={[frLocale]}
                        locale={i18n.language}
                        initialView={VIEW_MAP[props.view]}
                        initialDate={initialDateRef.current}
                        firstDay={1}
                        allDaySlot={!props.generic}
                        slotMinTime="08:00:00"
                        slotMaxTime="22:00:00"
                        slotLabelFormat={{
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: false,
                        }}
                        snapDuration="00:15:00"
                        selectable={!isReadOnly}
                        editable={!isReadOnly}
                        eventStartEditable={!isReadOnly}
                        eventDurationEditable={!isReadOnly}
                        dayMaxEvents={true}
                        // FullCalendar's default eventDisplay is "auto", which renders month-view
                        // (dayGridMonth) events as a small dot + plain-colored text instead of a
                        // colored block -- unlike timeGrid week/day views, which are "block" by
                        // default. That's what caused month-view events to show a different
                        // (unconfigured) color and near-invisible text until hover. Force "block"
                        // everywhere so events render consistently across all three views.
                        eventDisplay="block"
                        events={events}
                        eventContent={eventContent}
                        dayHeaderContent={dayHeaderContent}
                        moreLinkContent={moreLinkContent}
                        select={handleSelect}
                        eventClick={handleEventClick}
                        eventDrop={handleEventChange}
                        eventResize={handleEventChange}
                    />
                </div>
            </div>
        </React.Fragment>
    );
}

interface CalendarControlsProps {
    t: (key: string, opts?: any) => any;
    currentDate: any;
    view: string;
    totalHours: { lesson: number; option: number };
    handleToggleView: (view: string) => void;
    handleToggleTodayView: () => void;
    handleToggleSeasonStartView: () => void;
    handleToggleNextSeasonStartView: () => void;
    handleTogglePrev: () => void;
    handleToggleNext: () => void;
    conflicts?: any[];
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
}: CalendarControlsProps) => {
    const filteredConflicts = _.filter(conflicts, (c) => !c.is_resolved);

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
                    <div>
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
                            data-tippy-content={t(
                                "calendar.tooltips.seasonStart"
                            )}
                            onClick={() => handleToggleSeasonStartView()}
                        >
                            <i className="fas fa-angle-double-left"></i>
                        </button>
                        <button
                            className="btn btn-primary"
                            data-tippy-content={t("calendar.tooltips.today")}
                            onClick={() => handleToggleTodayView()}
                        >
                            <i className="fas fa-arrow-down"></i>
                        </button>
                        <button
                            className="btn btn-primary"
                            data-tippy-content={t(
                                "calendar.tooltips.nextSeason"
                            )}
                            onClick={() => handleToggleNextSeasonStartView()}
                        >
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

const CurrentDateDisplay = ({
    currentDate,
    view,
}: {
    currentDate: any;
    view: string;
}) => {
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
