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

    test("toFullDateFr's weekday follows the active language (WEEKDAYS from tools/constants)", async () => {
        // 2026-01-12 is a Monday -> WEEKDAYS[getDay()] === WEEKDAYS[1]. Since constants-i18n
        // lot 1, WEEKDAYS is sourced from the `common` namespace, so this leading token is
        // "Lundi" in fr and "Monday" in en instead of always-French.
        const monday = new Date(2026, 0, 12);

        await i18n.changeLanguage("en");
        expect(toFullDateFr(monday)).toMatch(/^Monday /);

        await i18n.changeLanguage("fr");
        expect(toFullDateFr(monday)).toMatch(/^Lundi /);
    });
});
