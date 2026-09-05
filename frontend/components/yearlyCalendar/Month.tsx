import React from "react";
import moment, { Moment } from "moment";
import Day from "./Day";
import { range } from "./utils";
import type { CustomClasses } from "./utils";

interface MonthProps {
    year: number;
    month: number;
    forceFullWeeks: boolean;
    showWeekSeparators: boolean;
    selectedDay: Moment;
    firstDayOfWeek: number;
    selectingRange?: [Moment, Moment];
    selectRange: boolean;
    selectedRange?: [Moment, Moment];
    customClasses?: CustomClasses;
    dayClicked: (day: Moment | null, classes: string) => void;
    dayHovered: (day: Moment | null) => void;
}

const sortRange = (start: number, end: number): [number, number] =>
    start > end ? [end, start] : [start, end];

const Month: React.FC<MonthProps> = ({
    year,
    month,
    forceFullWeeks,
    showWeekSeparators,
    selectedDay,
    firstDayOfWeek,
    selectingRange,
    selectRange,
    selectedRange,
    customClasses,
    dayClicked,
    dayHovered,
}) => {
    const onDayClicked = (day: Moment | null, classes: string) => {
        dayClicked(day, classes);
    };

    const onDayHovered = (day: Moment | null) => {
        if (selectRange) {
            dayHovered(day);
        }
    };

    const renderMonthDays = () => {
        // NOTE: moment indexes months from 0, so we subtract 1 to get the correct month
        const monthStart = moment([year, month - 1, 1]);

        // number of days to insert before the first of the month to align weekdays
        let prevMonthDaysCount = monthStart.weekday();
        while (prevMonthDaysCount < firstDayOfWeek) {
            prevMonthDaysCount += 7;
        }

        // days in month
        const numberOfDays = monthStart.daysInMonth();
        // 37 (max days in a month + 6) or 42 (if user prefers weeks closing with Sunday)
        const totalDays = forceFullWeeks ? 42 : 37;

        const days: JSX.Element[] = [];
        range(firstDayOfWeek + 1, totalDays + firstDayOfWeek + 1).forEach(
            (i) => {
                const day = moment([year, month - 1, i - prevMonthDaysCount]);

                const classes: string[] = [];
                if (i <= prevMonthDaysCount) {
                    classes.push("prev-month");
                } else if (i > numberOfDays + prevMonthDaysCount) {
                    classes.push("next-month");
                } else {
                    if (selectRange) {
                        const [start, end] = selectingRange || selectedRange!;

                        if (day.isBetween(start, end, "day", "[]")) {
                            classes.push("range");
                        }
                        if (day.isSame(start, "day")) {
                            classes.push("range-left");
                        }
                        if (day.isSame(end, "day")) {
                            classes.push("range-right");
                        }
                    } else if (day.isSame(selectedDay, "day")) {
                        classes.push("selected");
                    }

                    if (typeof customClasses === "function") {
                        classes.push(...customClasses(day));
                    }
                }

                if ((i - 1) % 7 === 0) {
                    // sunday
                    classes.push("bolder");
                }

                if (customClasses && typeof customClasses !== "function") {
                    Object.keys(customClasses).forEach((k) => {
                        const obj = customClasses[k];
                        if (typeof obj === "string") {
                            if (obj.indexOf(day.format("ddd")) > -1) {
                                classes.push(k);
                            }
                        } else if (Array.isArray(obj)) {
                            obj.forEach((d) => {
                                if (day.format("YYYY-MM-DD") === d)
                                    classes.push(k);
                            });
                        } else if (typeof obj === "function") {
                            if (obj(day)) {
                                classes.push(k);
                            }
                        } else if (obj && obj.start && obj.end) {
                            const startDate = moment(
                                obj.start,
                                "YYYY-MM-DD"
                            ).add(-1, "days");
                            const endDate = moment(obj.end, "YYYY-MM-DD").add(
                                1,
                                "days"
                            );
                            if (day.isBetween(startDate, endDate)) {
                                classes.push(k);
                            }
                        }
                    });
                }

                if (
                    showWeekSeparators &&
                    (i - 1) % 7 === firstDayOfWeek &&
                    days.length
                ) {
                    days.push(
                        <td className="week-separator" key={`separator-${i}`} />
                    );
                }

                days.push(
                    <Day
                        key={`day-${i}`}
                        day={day.isValid() ? day : null}
                        classes={classes.join(" ")}
                        dayClicked={(d) => onDayClicked(d, classes.join(" "))}
                        dayHovered={(d) => onDayHovered(d)}
                    />
                );
            }
        );

        return days;
    };

    return (
        <tr>
            <td className="month-name">
                {moment([year, month - 1, 1]).format("MMM")}
            </td>
            {renderMonthDays()}
        </tr>
    );
};

/**
 * Replacement for the class component's shouldComponentUpdate.
 * React.memo's compare function returns TRUE to SKIP re-render,
 * so the original "return true" (=> repaint) cases now return false.
 */
const areEqual = (prev: MonthProps, next: MonthProps): boolean => {
    const { month, selectingRange, selectedRange } = prev;

    // full repaint for global-affecting rendering props
    if (
        prev.year !== next.year ||
        prev.forceFullWeeks !== next.forceFullWeeks ||
        prev.showWeekSeparators !== next.showWeekSeparators ||
        prev.firstDayOfWeek !== next.firstDayOfWeek ||
        prev.selectRange !== next.selectRange ||
        prev.customClasses !== next.customClasses ||
        (prev.selectRange &&
            selectingRange === undefined &&
            next.selectingRange === undefined)
    ) {
        return false; // repaint
    }

    if (prev.selectRange) {
        if (selectingRange === undefined) {
            // first time: repaint months in old selectedRange and next selectingRange
            const [oldStart, oldEnd] = sortRange(
                selectedRange![0].month(),
                selectedRange![1].month()
            );
            const [newStart, newEnd] = sortRange(
                next.selectingRange![0].month(),
                next.selectingRange![1].month()
            );
            return !(
                (oldStart <= month && month <= oldEnd) ||
                (newStart <= month && month <= newEnd)
            );
        } else if (next.selectingRange === undefined) {
            // last time: repaint months in previous selectingRange
            const [oldStart, oldEnd] = sortRange(
                selectingRange[0].month(),
                selectingRange[1].month()
            );
            const [newStart, newEnd] = sortRange(
                next.selectedRange![0].month(),
                next.selectedRange![1].month()
            );
            return !(
                (oldStart <= month && month <= oldEnd) ||
                (newStart <= month && month <= newEnd)
            );
        }

        // day hovering changed
        const [oldStart, oldEnd] = sortRange(
            selectingRange[0].month(),
            selectingRange[1].month()
        );
        const [newStart, newEnd] = sortRange(
            next.selectingRange![0].month(),
            next.selectingRange![1].month()
        );
        return !(
            (oldStart <= month && month <= oldEnd) ||
            (newStart <= month && month <= newEnd)
        );
    } else if (
        prev.selectedDay.month() === month ||
        next.selectedDay.month() === month
    ) {
        // selectedDay changed: repaint months where it was and where it will be
        return false; // repaint
    }

    return true; // props are equal => skip re-render
};

export default React.memo(Month, areEqual);
