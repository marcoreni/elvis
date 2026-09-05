import React, { useState } from "react";
import { Calendar } from "../yearlyCalendar/index";
import { withTranslation, WithTranslation } from "react-i18next";
import { ISO_DATE_FORMAT } from "../utils";

import moment, { Moment } from "moment";

interface ActivityInstance {
    selected: boolean;
    start: Moment;
    // add other fields your instances carry if needed
}

interface Season {
    start?: string | Moment;
    end?: string | Moment;
    holidays?: { date: string }[];
}

interface Legend {
    selected?: string;
    unselected?: string;
}

interface YearlyCalendarProps extends WithTranslation {
    label: string;
    season?: Season;
    legend?: Legend;
    activityInstances:
        | ActivityInstance[]
        | (() => ActivityInstance[])
        | Record<string, ActivityInstance>
        | (() => Record<string, ActivityInstance[]>);
    existingDates?: { time_interval: { start: string } }[];
    handlePickDate: (date: Moment, classes: string) => void;
}

const YearlyCalendar: React.FC<YearlyCalendarProps> = (props) => {
    const { t } = props;
    const legend = props.legend;

    // Used to force a re-render after each click to work around a React bug
    // where data doesn't reload on its own (cause unknown, likely parent elements).
    // This replaces the class component's this.forceUpdate().
    const [, setRenderTick] = useState(0);
    const forceUpdate = () => setRenderTick((tick) => tick + 1);

    // call the function on each render and force re-render after each click
    // (type check keeps the element functional with other parent components)
    const rawActivityInstances =
        typeof props.activityInstances === "function"
            ? props.activityInstances()
            : props.activityInstances;
    const activityInstances = Array.isArray(rawActivityInstances)
        ? rawActivityInstances
        : Object.values(rawActivityInstances);

    const seasonDays: Moment[] = [];
    const seasonStart = moment(props.season && props.season.start).clone();

    while (
        seasonStart.isSameOrBefore(moment(props.season && props.season.end))
    ) {
        seasonDays.push(moment(seasonStart));
        seasonStart.add(1, "days");
    }

    const customCssClasses = {
        holiday: props.season?.holidays?.map((h) => h.date),
        seasonDay: seasonDays.map((date) => date.format(ISO_DATE_FORMAT)),
        activityInstance: activityInstances
            .filter((instance) => instance.selected)
            .map((instance) => instance.start.format(ISO_DATE_FORMAT)),
        existingInstances: props.existingDates?.map((ai) =>
            moment(ai.time_interval.start).format(ISO_DATE_FORMAT)
        ),
        today: [moment().format(ISO_DATE_FORMAT)],
    };

    return (
        <div>
            <h2>{props.label}</h2>
            <h3>
                {t("yearlyCalendar.coursesPlanned", {
                    n: activityInstances.filter((ai) => ai.selected)?.length,
                })}
            </h3>
            <Calendar
                start={moment(props.season && props.season.start)}
                end={moment(props.season && props.season.end)}
                selectedDay={undefined}
                customClasses={customCssClasses}
                onPickDate={(date, classes) => {
                    props.handlePickDate(date, classes);
                    forceUpdate();
                }}
            />

            <div className="flex m-t">
                <div className="flex m-r-sm">
                    <b className="m-r-xs">
                        {legend ? legend.selected : t("kinds.course")}
                    </b>
                    <div
                        className="calendar-key-color"
                        style={{ backgroundColor: "#d63031" }}
                    ></div>
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
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default withTranslation("planning")(YearlyCalendar);
