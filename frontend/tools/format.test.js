// Regression tests for the PR #4 review fix: these helpers used to hardcode "fr-FR"/"fr" and
// silently ignore the active UI language. They should now format using whatever locale i18next
// is currently set to.

import i18n from "../i18n";
import { toLocaleDate, toMonthName, formatActivityForDisplay, toFullDateFr } from "./format";

describe("locale-aware date formatting", () => {
    afterEach(async () => {
        await i18n.changeLanguage("fr");
    });

    test("toLocaleDate formats using the active i18n language, not a hardcoded locale", async () => {
        const date = new Date(2026, 0, 15);

        await i18n.changeLanguage("en");
        expect(toLocaleDate(date)).toBe(
            date.toLocaleString("en", { year: "numeric", month: "numeric", day: "numeric" })
        );

        await i18n.changeLanguage("fr");
        expect(toLocaleDate(date)).toBe(
            date.toLocaleString("fr", { year: "numeric", month: "numeric", day: "numeric" })
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
            time_interval: { start: "2026-01-12T10:00:00", end: "2026-01-12T11:00:00" },
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
