// Regression test for the yearlyCalendar/index.tsx rewrite (a from-scratch TS reimplementation
// of the vendored react-yearly-calendar, with zero prior coverage). The reviewed bug: the
// month-generation loop dropped the old `if (!start.isValid() || !end.isValid()) return [];`
// guard. When `season.start`/`season.end` is null (a real, reachable state -- see
// TimeIntervalHelpers.getSeasonFromDate / YearlyCalendar.tsx), both `moment(...)` values are
// invalid; `.format("M")` on an invalid moment returns the literal string "Invalid date" on
// both sides, so the loop's exit condition never becomes false and `.add(1, "month")` on an
// already-invalid moment never becomes valid either -> infinite loop / hung tab.
//
// Each test below carries an explicit timeout so a regression here fails loudly (a slow test)
// instead of hanging the whole `vitest run` invocation.

import React from "react";
import moment from "moment";
import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Calendar, monthsInRange } from "./index";

describe("monthsInRange", () => {
    test("returns an empty array (not an infinite loop) when start is invalid", () => {
        expect(monthsInRange(moment(null), moment("2025-06-01"))).toEqual([]);
    }, 2000);

    test("returns an empty array (not an infinite loop) when end is invalid", () => {
        expect(monthsInRange(moment("2025-06-01"), moment(null))).toEqual([]);
    }, 2000);

    test("returns an empty array when both start and end are invalid", () => {
        expect(monthsInRange(moment(null), moment(null))).toEqual([]);
    }, 2000);

    test("returns every month across a multi-year range, inclusive of both ends", () => {
        const months = monthsInRange(
            moment("2024-08-15"),
            moment("2025-03-03")
        );

        expect(months).toHaveLength(8);
        expect(months[0]).toEqual({ number: 8, year: 2024 });
        expect(months[months.length - 1]).toEqual({
            number: 3,
            year: 2025,
        });
    }, 2000);
});

describe("Calendar", () => {
    test("renders without hanging when start/end are invalid moments", () => {
        const { container } = render(
            <Calendar start={moment(null)} end={moment(null)} />
        );

        // No month table rows -> monthsInRange bailed out instead of looping forever.
        expect(container.querySelectorAll("tbody tr")).toHaveLength(0);
    }, 2000);

    test("renders one table body row per month for a valid range", () => {
        const { container } = render(
            <Calendar start={moment("2025-01-01")} end={moment("2025-03-01")} />
        );

        expect(container.querySelectorAll("tbody tr").length).toBe(3);
    }, 2000);
});
