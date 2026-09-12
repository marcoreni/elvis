import React, { useState } from "react";
import moment from "moment";
import type { Moment } from "moment";
import Month from "./Month";
import { range } from "./utils";
import type { CustomClasses } from "./utils";

interface CalendarProps {
    start: Moment;
    end: Moment;
    forceFullWeeks?: boolean;
    showDaysOfWeek?: boolean;
    showWeekSeparators?: boolean;
    firstDayOfWeek?: number;
    selectRange?: boolean;
    onPickDate?: (date: Moment, classes: string) => void;
    onPickRange?: (start: Moment, end: Moment) => void;
    selectedDay?: Moment;
    customClasses?: CustomClasses | undefined;
}

interface MonthsToDisplay {
    number: number;
    year: number;
}

// Builds the list of {number, year} months to display between `start` and
// `end` (inclusive of end's month). Guards against invalid moments (e.g. a
// null season start/end producing `moment(null)`) — without this guard,
// `.format("M")` on two invalid moments both return the literal string
// "Invalid date", which compare equal and keep the loop condition true
// forever while `.add(1, "month")` on an invalid moment stays invalid,
// hanging the tab.
export function monthsInRange(start: Moment, end: Moment): MonthsToDisplay[] {
    if (!start.isValid() || !end.isValid()) {
        return [];
    }

    const seasonStart = start.clone();
    const seasonEnd = end.clone();
    const monthsToDisplay: MonthsToDisplay[] = [];

    while (
        seasonEnd > seasonStart ||
        seasonStart.format("M") === seasonEnd.format("M")
    ) {
        monthsToDisplay.push({
            number: seasonStart.month() + 1,
            year: seasonStart.year(), // number, not string
        });
        seasonStart.add(1, "month");
    }

    return monthsToDisplay;
}

export const Calendar: React.FC<CalendarProps> = (props) => {
    const {
        start,
        end,
        forceFullWeeks = false,
        showDaysOfWeek = true,
        showWeekSeparators = true,
        firstDayOfWeek = 0,
        selectRange = false,
        onPickDate,
        onPickRange,
        selectedDay = moment(),
        customClasses,
    } = props;

    const [selectingRange, setSelectingRange] = useState<
        [Moment, Moment] | undefined
    >(undefined);

    const dayClicked = (date: Moment | null, classes: string) => {
        if (!date) {
            // clicked on prev or next month
            return;
        }

        if (!selectRange) {
            onPickDate?.(date, classes);
            return;
        }

        if (!selectingRange) {
            setSelectingRange([date, date]);
        } else {
            if (date > selectingRange[0]) {
                onPickRange?.(selectingRange[0], date);
            } else {
                onPickRange?.(date, selectingRange[0]);
            }
            setSelectingRange(undefined);
        }
    };

    const dayHovered = (hoveredDay: Moment | null) => {
        if (!hoveredDay) {
            // hovered on prev or next month
            return;
        }

        if (selectingRange) {
            setSelectingRange([selectingRange[0], hoveredDay]);
        }
    };

    const renderDaysOfWeek = () => {
        const totalDays = forceFullWeeks ? 42 : 37;

        const days: JSX.Element[] = [];
        range(firstDayOfWeek, totalDays + firstDayOfWeek).forEach((i) => {
            const day = moment().weekday(i).format("dd").charAt(0);

            if (showWeekSeparators) {
                if (i % 7 === firstDayOfWeek && days.length) {
                    // push week separator
                    days.push(
                        <th className="week-separator" key={`seperator-${i}`} />
                    );
                }
            }
            days.push(
                <th
                    key={`weekday-${i}`}
                    className={i % 7 === 0 ? "bolder" : ""}
                >
                    {day}
                </th>
            );
        });

        return (
            <tr>
                <th>&nbsp;</th>
                {days}
            </tr>
        );
    };

    // i: date début / i: date fin
    // o: [{ month: isoMonth, year: year for the month }]
    const monthsToDisplay: MonthsToDisplay[] = monthsInRange(
        moment(start),
        moment(end)
    );

    const months = monthsToDisplay.map((month) => (
        <Month
            month={month.number}
            key={`month-${month.number}`}
            dayClicked={(d, classes) => dayClicked(d, classes)}
            dayHovered={(d) => dayHovered(d)}
            year={month.year}
            forceFullWeeks={forceFullWeeks}
            showWeekSeparators={showWeekSeparators}
            selectedDay={selectedDay}
            firstDayOfWeek={firstDayOfWeek}
            selectRange={selectRange}
            selectingRange={selectingRange}
            customClasses={customClasses}
        />
    ));

    return (
        <table className="calendar">
            <thead className="day-headers">
                {showDaysOfWeek ? renderDaysOfWeek() : null}
            </thead>
            <tbody>{months}</tbody>
        </table>
    );
};
