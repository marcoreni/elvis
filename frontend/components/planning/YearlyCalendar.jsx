import React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import _ from "lodash";
import { withTranslation } from "react-i18next";
import { ISO_DATE_FORMAT } from "../utils";
import moment from "moment";

const PLUGINS = [dayGridPlugin, interactionPlugin];

class YearlyCalendar extends React.Component {
    constructor(props) {
        super(props);
        this.state = { ...this.props };
    }

    buildCustomClasses() {
        const activityInstances =
            typeof this.props.activityInstances === "function"
                ? this.props.activityInstances()
                : this.props.activityInstances;

        let seasonDays = [];
        let seasonStart = moment(
            this.props.season && this.props.season.start
        ).clone();
        while (
            seasonStart.isSameOrBefore(
                moment(this.props.season && this.props.season.end)
            )
        ) {
            seasonDays.push(seasonStart.format(ISO_DATE_FORMAT));
            seasonStart.add(1, "days");
        }

        return {
            holiday: _.map(
                this.props.season && this.props.season.holidays,
                h => h.date
            ),
            seasonDay: seasonDays,
            activityInstance: _(activityInstances)
                .filter(instance => instance.selected)
                .map(instance => instance.start.format(ISO_DATE_FORMAT))
                .value(),
            existingInstances: _.map(this.state.existingDates, ai =>
                moment(ai.time_interval.start).format(ISO_DATE_FORMAT)
            ),
            today: [moment().format(ISO_DATE_FORMAT)],
        };
    }

    // returns array of css classes for a given date
    classesForDate(dateKey, customClasses) {
        return _.keys(customClasses).filter(cls =>
            customClasses[cls].includes(dateKey)
        );
    }

    // list of {year, month} pairs between season start and end (inclusive)
    monthsInRange(start, end) {
        if (!start.isValid() || !end.isValid()) return [];

        const months = [];
        // normalize to first day of month so day-of-month never affects the loop
        const cursor = start.clone().startOf("month");
        const lastMonth = end.clone().startOf("month");

        while (cursor.isSameOrBefore(lastMonth)) {
            months.push({ year: cursor.year(), month: cursor.month() });
            cursor.add(1, "month");
        }
        return months;
    }


    renderMonth({ year, month }, customClasses) {
        return (
            <div key={`year−{year}-year−{month}`} className="year-grid-month">
                <div className="year-grid-month-label">
                    {moment(new Date(year, month, 1)).format("MMMM")}
                </div>
                <FullCalendar
                    plugins={PLUGINS}
                    initialView="dayGridMonth"
                    initialDate={new Date(year, month, 1)}
                    headerToolbar={false}
                    height="auto"
                    fixedWeekCount={false}
                    showNonCurrentDates={false}
                    dayHeaderFormat={{ weekday: "short" }}
                    dayCellClassNames={arg => {
                        const key = moment(arg.date).format(ISO_DATE_FORMAT);
                        return this.classesForDate(key, customClasses);
                    }}
                    dateClick={info => {
                        const key = moment(info.date).format(ISO_DATE_FORMAT);
                        this.props.handlePickDate(
                            moment(info.date),
                            this.classesForDate(key, customClasses)
                        );
                        this.forceUpdate();
                    }}
                />
            </div>
        );
    }

    render() {
        const { t } = this.props;
        const legend = this.props.legend;

        const activityInstances =
            typeof this.props.activityInstances === "function"
                ? this.props.activityInstances()
                : this.props.activityInstances;

        const customClasses = this.buildCustomClasses();

        const start = moment(this.props.season && this.props.season.start);
        const end = moment(this.props.season && this.props.season.end);
        const months = this.monthsInRange(start, end);

        return (
            <div>
                <h2>{this.props.label}</h2>
                <h3>
                    {t("yearlyCalendar.coursesPlanned", {
                        n: _.size(
                            (_.isArray(activityInstances)
                                ? activityInstances
                                : Object.values(activityInstances)
                            ).filter(ai => ai.selected)
                        ),
                    })}
                </h3>

                <div className="year-grid">
                    {months.map(m => this.renderMonth(m, customClasses))}
                </div>

                <div className="flex m-t">
                    <div className="flex m-r-sm">
                        <b className="m-r-xs">
                            {legend ? legend.selected : t("kinds.course")}
                        </b>
                        <div
                            className="calendar-key-color"
                            style={{ backgroundColor: "#d63031" }}
                        />
                    </div>
                    <div className="flex m-r-sm">
                        <b className="m-r-xs">
                            {legend
                                ? legend.unselected
                                : t("yearlyCalendar.legendExisting")}
                        </b>
                        <div
                            className="calendar-key-color"
                            style={{ backgroundColor: "#d630318F" }}
                        />
                    </div>
                </div>
            </div>
        );
    }
}

export default withTranslation("planning")(YearlyCalendar);
