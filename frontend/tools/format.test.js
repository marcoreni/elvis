// Regression tests for the PR #4 review fix: these helpers used to hardcode "fr-FR"/"fr" and
// silently ignore the active UI language. They should now format using whatever locale i18next
// is currently set to.

import i18n from "../i18n";
import {
    toLocaleDate,
    toMonthName,
    formatActivityForDisplay,
    toFullDateFr,
    occupationInfos,
} from "./format";

describe("locale-aware date formatting", () => {
    afterEach(async () => {
        await i18n.changeLanguage("fr");
    });

    test("toLocaleDate formats using the active i18n language, not a hardcoded locale", async () => {
        const date = new Date(2026, 0, 15);

        await i18n.changeLanguage("en");
        expect(toLocaleDate(date)).toBe(
            date.toLocaleString("en", {
                year: "numeric",
                month: "numeric",
                day: "numeric",
            })
        );

        await i18n.changeLanguage("fr");
        expect(toLocaleDate(date)).toBe(
            date.toLocaleString("fr", {
                year: "numeric",
                month: "numeric",
                day: "numeric",
            })
        );
    });

    test("toMonthName respects the active language", async () => {
        await i18n.changeLanguage("en");
        expect(toMonthName(1)).toMatch(/January/);

        await i18n.changeLanguage("fr");
        expect(toMonthName(1)).toMatch(/janvier/i);
    });

    test("formatActivityForDisplay's weekday uses the active language, not a hardcoded fr", async () => {
        const activity = {
            group_name: "Group",
            activity_ref: { label: "Ref" },
            // 2026-01-12 is a Monday
            time_interval: {
                start: "2026-01-12T10:00:00",
                end: "2026-01-12T11:00:00",
            },
        };

        await i18n.changeLanguage("en");
        expect(formatActivityForDisplay(activity)).toMatch(/Monday/);

        await i18n.changeLanguage("fr");
        expect(formatActivityForDisplay(activity)).toMatch(/lundi/i);
    });

    test("toFullDateFr follows the active language, including the month (WEEKDAYS from tools/constants)", async () => {
        // 2026-01-12 is a Monday -> WEEKDAYS[getDay()] === WEEKDAYS[1]. Since constants-i18n
        // lot 1, WEEKDAYS is sourced from the `common` namespace, so the leading token is
        // "Lundi" in fr and "Monday" in en instead of always-French. toMonthName is 1-based;
        // toFullDateFr used to feed it a 0-based getMonth() (December instead of January) —
        // fixed, so the full string (weekday + month) is asserted here, not just the weekday.
        const monday = new Date(2026, 0, 12);

        await i18n.changeLanguage("en");
        expect(toFullDateFr(monday)).toBe("Monday 12 January 2026");

        await i18n.changeLanguage("fr");
        // WEEKDAYS is capitalised ("Lundi"); the month segment comes straight from
        // Date#toLocaleString, which renders French month names lowercase ("janvier").
        expect(toFullDateFr(monday)).toBe("Lundi 12 janvier 2026");
    });
});

// Regression tests for the `referenceDate` handling in occupationInfos, added alongside the
// TS-conversion bugfix pass (see docs/KnownIssues.md). findAndGet's not-found default reverted
// from `undefined` back to `null` (its pre-TS lodash behaviour), and a real call site
// (LessonList's `findAndGet(filter.filtered, ..., "value")`, no explicit `def`) feeds that
// straight into `occupationInfos` as `referenceDate`. occupationInfos used to check
// `referenceDate === undefined`, which does NOT catch `null` -- so a `null` referenceDate fell
// through to `u.begin_at <= referenceDate`, comparing every date against `null` and dropping
// every user. The check is now `referenceDate == null`, matching the original loose
// `referenceDate == undefined` from the pre-TS .js version.
describe("occupationInfos — referenceDate handling", () => {
    const nonWorkGroupActivity = {
        activity_ref: { is_work_group: false, occupation_limit: 5 },
        activities_instruments: [],
        options: [],
        users: [
            { id: 1, begin_at: "2020-01-01", stopped_at: null },
            { id: 2, begin_at: "2026-01-01", stopped_at: null },
        ],
    };

    test.each([
        ["undefined", undefined],
        ["null", null],
    ])(
        "with no reference date (%s), every user counts regardless of begin_at",
        (_label, referenceDate) => {
            const { headCount, validatedHeadCount } = occupationInfos(
                nonWorkGroupActivity,
                referenceDate
            );
            expect(headCount).toBe(2);
            expect(validatedHeadCount).toBe(2);
        }
    );

    test("with a real reference date, only users already begun (and not yet stopped) count", () => {
        const { headCount, validatedHeadCount } = occupationInfos(
            nonWorkGroupActivity,
            "2024-06-01"
        );
        expect(headCount).toBe(1);
        expect(validatedHeadCount).toBe(1);
    });

    // Regression test for a real bug found while auditing frontend/components/utils/entities.ts
    // against actual backend response shapes: `begin_at`/`stopped_at` are full ISO timestamps
    // in production (e.g. from ActivityController#list's per-user ActivityApplication flattening),
    // not the bare "YYYY-MM-DD" strings the earlier tests above use. occupationInfos used to
    // compare those timestamps against `referenceDate` with raw string `<=`/`>`, which is wrong
    // on the exact boundary day: a user beginning (or stopping) exactly on referenceDate was
    // dropped from / kept in the headcount incorrectly because the longer timestamp string sorts
    // after the shorter bare-date string. See docs/KnownIssues.md.
    test("a full ISO timestamp begin_at/stopped_at compares correctly against a bare-date referenceDate on the exact boundary day", () => {
        const activity = {
            activity_ref: { is_work_group: false, occupation_limit: 5 },
            activities_instruments: [],
            options: [],
            users: [
                // begins exactly on the reference date -> already active that day, must count
                { id: 1, begin_at: "2024-06-01T00:00:00.000+02:00", stopped_at: null },
                // begins the day after the reference date -> not yet active, excluded
                { id: 2, begin_at: "2024-06-02T00:00:00.000+02:00", stopped_at: null },
                // stops exactly on the reference date -> no longer active that day, excluded
                {
                    id: 3,
                    begin_at: "2020-01-01T00:00:00.000+01:00",
                    stopped_at: "2024-06-01T00:00:00.000+02:00",
                },
                // stops the day after the reference date -> still active that day, must count
                {
                    id: 4,
                    begin_at: "2020-01-01T00:00:00.000+01:00",
                    stopped_at: "2024-06-02T00:00:00.000+02:00",
                },
            ],
        };

        const { headCount, validatedHeadCount } = occupationInfos(
            activity,
            "2024-06-01"
        );
        expect(headCount).toBe(2);
        expect(validatedHeadCount).toBe(2);
    });

    test("work-group activities ignore referenceDate entirely (undefined/null/date all agree)", () => {
        const workGroupActivity = {
            activity_ref: { is_work_group: true },
            activities_instruments: [
                { user_id: 1, is_validated: true },
                { user_id: 2, is_validated: false },
                { user_id: null, is_validated: false },
            ],
            options: [],
            users: [],
        };

        const expected = {
            headCount: 2,
            validatedHeadCount: 1,
            headCountLimit: 3,
            hasOption: true,
        };
        expect(occupationInfos(workGroupActivity, undefined)).toEqual(expected);
        expect(occupationInfos(workGroupActivity, null)).toEqual(expected);
        expect(occupationInfos(workGroupActivity, "2024-06-01")).toEqual(
            expected
        );
    });
});
