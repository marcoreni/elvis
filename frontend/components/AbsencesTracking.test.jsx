import { describe, it, expect } from "vitest";
import { buildGroups } from "./AbsencesTracking";

// Regression coverage for the KnownIssues.md entry "AbsencesController::DAYS_FR hardcoded French
// day names, paired with a frontend sort dependency": buildGroups() used to sort day groups by
// looking up the (now locale-translated) `day` label in a hardcoded French DAYS_ORDER array via
// indexOf, which breaks the moment `day` stops being a fixed French string (e.g. an English
// locale). It now sorts on the API's stable, locale-independent `day_index` field instead.
describe("AbsencesTracking buildGroups() day sort", () => {
    const row = (day, day_index, overrides = {}) => ({
        teacher: "Jean Dupont",
        day,
        day_index,
        activity: "Piano",
        student: { id: 1, full_name: "Camille Martin" },
        date_iso: "2025-09-15",
        date: "15/09/2025",
        justified: false,
        remarks: null,
        ...overrides,
    });

    it("sorts day groups Monday -> Sunday using day_index, in French", () => {
        const rows = [row("Dimanche", 0), row("Mercredi", 3), row("Lundi", 1)];

        const [teacher] = buildGroups(rows);
        expect(teacher.days.map((d) => d.name)).toEqual([
            "Lundi",
            "Mercredi",
            "Dimanche",
        ]);
    });

    it("sorts day groups Monday -> Sunday using day_index, in English (proves it no longer string-matches a French name list)", () => {
        const rows = [row("Sunday", 0), row("Wednesday", 3), row("Monday", 1)];

        const [teacher] = buildGroups(rows);
        expect(teacher.days.map((d) => d.name)).toEqual([
            "Monday",
            "Wednesday",
            "Sunday",
        ]);
    });

    it("falls back to the end of the ordering when day_index is missing", () => {
        const rows = [
            row("—", undefined, { day: undefined, day_index: undefined }),
            row("Lundi", 1),
        ];

        const [teacher] = buildGroups(rows);
        expect(teacher.days.map((d) => d.name)).toEqual(["Lundi", "—"]);
    });
});
