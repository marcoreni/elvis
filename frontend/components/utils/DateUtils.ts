/**
 * Creates days ranging from the given month
 * of the given year's start to its end.
 *
 * @param {*} year  the year in which the month is.
 * @param {*} month the month of the year.
 */
function daysRange(year: number, month: number): Date[] {
    let date = new Date(year, month, 1);
    const range: Date[] = [];

    while (date.getMonth() === month) {
        range.push(date);
        date = addDuration(date, 1, "day");
    }

    return range;
}

interface Shift {
    morning: number;
    afternoon: number;
}
/**
 * Fills the given array's day gaps with empty work shifts.
 *
 * @param {*} days the existing shifts.
 * @param {*} year the year in which the shifts are.
 * @param {*} month the month in which the shifts are.
 */
function fillMonthsGaps(
    days: Record<string, Shift>,
    year: number,
    month: number
): Record<string, Shift> {
    let firstDay;
    if (Object.keys(days).length === 0) {
        firstDay = new Date(year, month);
    } else {
        firstDay = new Date(Object.keys(days)[0]);
    }

    const range = daysRange(firstDay.getFullYear(), firstDay.getMonth()).map(
        (d) =>
            `${d.getFullYear()}-${(d.getMonth() + 1)
                .toString()
                .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`
    );

    const emptyShift = { morning: 0, afternoon: 0 };

    range.forEach((d) => {
        if (!days[d]) {
            days[d] = emptyShift;
        }
    });

    return days;
}

/**
 * Return a new date to which we added a duration, given in parameters.
 *
 * @param {*} date the date which we want to add a duration to.
 * @param {*} nb the number of duration type to add.
 * @param {*} type duration type (year, month, week, day, hour, second).
 */
function addDuration(date: Date, nb: number, type: string): Date {
    const epoch = date.valueOf();

    let toAdd = nb;
    switch (type) {
        case "years":
        case "year":
        case "y":
            toAdd *= 12;
        case "months":
        case "month":
        case "m":
            toAdd *= 4;
        case "weeks":
        case "week":
        case "w":
            toAdd *= 7;
        case "days":
        case "day":
        case "d":
            toAdd *= 24;
        case "hours":
        case "hour":
        case "H":
            toAdd *= 60;
        case "minutes":
        case "minute":
        case "M":
            toAdd *= 60;
        case "seconds":
        case "second":
        case "S":
            toAdd *= 1000;
        default:
            break;
    }

    return new Date(epoch + toAdd);
}

function getHoursString(n: number): string {
    return n || n === 0
        ? `${Math.floor(n)}h${Math.round((n % 1) * 60) || ""}`
        : "";
}

function monthWeekNum(d: Date): number {
    const dayOneNum = frDayNum(new Date(d.getFullYear(), d.getMonth()));

    return Math.floor((d.getDate() + dayOneNum + 1) / 7);
}

function weekNum(d: Date): number {
    const yearStart = new Date(d.getFullYear(), 0);
    const firstWeekDay = frDayNum(yearStart);

    const yearValue = yearStart.valueOf() - firstWeekDay * 8.64e7;

    const elapsed = d.valueOf() - yearValue;

    return Math.floor(elapsed / 6.048e8 + 1);
}

function weekFirstDay(year: number, n: number): Date {
    if (n > 52 || n < 1)
        throw new RangeError("Week number can only be in range 1-52.");

    const yearStart = new Date(year, 0);
    const firstWeekDay = frDayNum(yearStart);

    const yearValue = yearStart.valueOf() - firstWeekDay * 8.64e7;

    return new Date(yearValue + (n - 1) * 6.048e8);
}

// Monday starting week number
const frDayNum = (d: Date) => (7 + d.getDay() - 1) % 7;

export {
    daysRange,
    addDuration,
    getHoursString,
    monthWeekNum,
    weekNum,
    weekFirstDay,
    fillMonthsGaps,
};
