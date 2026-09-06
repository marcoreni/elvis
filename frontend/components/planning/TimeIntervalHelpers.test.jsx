// i18n extraction test — i18n-06 "planning" domain, lot 3c (the last i18n-06 lot). Covers the
// pure-helper module `TimeIntervalHelpers.jsx`, which has no React and reads the `i18n`
// singleton directly (`import i18n from "../../i18n"`). Mocking-free language switching via the
// frontend/i18n/index.js singleton, mirroring frontend/components/planning/SimplePlanning.test.jsx
// and frontend/i18n/index.test.js.
//
// Units under test:
//   - averageAgeDisplay(age)        -> "" for NaN, else planning:ageYears interpolated
//   - levelDisplay(users, ref, sid) -> RAW sentinels (LEVEL_NOT_INDICATED / LEVEL_TO_SPECIFY) or
//                                      a real level label — NOT localized (compared with === at
//                                      call sites)
//   - levelDisplayLabel(value)      -> maps the two sentinels to localized copy at display time,
//                                      passes everything else (real label, null, undefined, "")
//                                      through untouched
//   - formatIntervalsForSchedule(...) title branches for kind "e" (validated / not) and the bare
//                                      availability else branch; an interval carrying an activity
//                                      keeps `activity.activity_ref.label` and bypasses i18n

import {
    LEVEL_NOT_INDICATED,
    LEVEL_TO_SPECIFY,
    averageAgeDisplay,
    formatIntervalsForSchedule,
    levelDisplay,
    levelDisplayLabel,
} from "./TimeIntervalHelpers";
import i18n from "../../i18n";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

// ------------------------------------------------------------------------------------------------
// Exported sentinel constants — locale-independent raw French strings
// ------------------------------------------------------------------------------------------------

describe("level sentinel constants", () => {
    test("keep their historical raw values", () => {
        expect(LEVEL_NOT_INDICATED).toBe("NON INDIQUÉ");
        expect(LEVEL_TO_SPECIFY).toBe("À PRÉCISER");
    });
});

// ------------------------------------------------------------------------------------------------
// Per-locale behaviour
// ------------------------------------------------------------------------------------------------

describe.each([
    [
        "fr",
        {
            age12: "12 ans",
            notIndicated: "NON INDIQUÉ",
            toSpecify: "À PRÉCISER",
            evaluation: "Évaluation",
            availabilityEvaluation: "Dispo. Évaluation",
            availability: "Disponibilité",
        },
    ],
    [
        "en",
        {
            age12: "12 years old",
            notIndicated: "NOT SPECIFIED",
            toSpecify: "TO BE SPECIFIED",
            evaluation: "Evaluation",
            availabilityEvaluation: "Avail. Evaluation",
            availability: "Availability",
        },
    ],
])("locale = %s", (lng, expected) => {
    beforeEach(async () => {
        await i18n.changeLanguage(lng);
    });

    // --- averageAgeDisplay ---------------------------------------------------------------------

    describe("averageAgeDisplay", () => {
        test("returns an empty string for NaN", () => {
            expect(averageAgeDisplay(NaN)).toBe("");
            expect(averageAgeDisplay(undefined)).toBe("");
            expect(averageAgeDisplay("abc")).toBe("");
        });

        test("interpolates the age into the localized suffix", () => {
            expect(averageAgeDisplay(12)).toBe(expected.age12);
        });

        test("output contains no unresolved interpolation braces", () => {
            const v = averageAgeDisplay(12);
            expect(v).not.toContain("{{");
            expect(v).not.toContain("}}");
        });
    });

    // --- levelDisplay: returns RAW sentinels, never localized ---------------------------------

    describe("levelDisplay", () => {
        const activityRef = { id: 7 };
        const seasonId = 1;

        test("no users -> LEVEL_NOT_INDICATED raw string (not localized)", () => {
            const out = levelDisplay([], activityRef, seasonId);
            expect(out).toBe(LEVEL_NOT_INDICATED);
            expect(out).toBe("NON INDIQUÉ");
            // even under `en`, the return value is the raw French sentinel, not the localized copy
            if (lng === "en") expect(out).not.toBe(expected.notIndicated);
        });

        test("users without any matching level -> LEVEL_NOT_INDICATED", () => {
            const users = [
                { id: 1 },
                { id: 2, levels: [{ season_id: 99, activity_ref_id: 7, evaluation_level_ref_id: 5 }] },
            ];
            expect(levelDisplay(users, activityRef, seasonId)).toBe(LEVEL_NOT_INDICATED);
        });

        test("two distinct levels for the season+activityRef -> LEVEL_TO_SPECIFY raw string", () => {
            const users = [
                {
                    id: 1,
                    levels: [
                        {
                            season_id: 1,
                            activity_ref_id: 7,
                            evaluation_level_ref_id: 100,
                            evaluation_level_ref: { label: "Débutant" },
                        },
                        {
                            season_id: 1,
                            activity_ref_id: 7,
                            evaluation_level_ref_id: 200,
                            evaluation_level_ref: { label: "Avancé" },
                        },
                    ],
                },
            ];
            const out = levelDisplay(users, activityRef, seasonId);
            expect(out).toBe(LEVEL_TO_SPECIFY);
            expect(out).toBe("À PRÉCISER");
        });

        test("a single matching level -> its label, verbatim", () => {
            const users = [
                {
                    id: 1,
                    levels: [
                        {
                            season_id: 1,
                            activity_ref_id: 7,
                            evaluation_level_ref_id: 100,
                            evaluation_level_ref: { label: "Débutant" },
                        },
                    ],
                },
            ];
            expect(levelDisplay(users, activityRef, seasonId)).toBe("Débutant");
        });
    });

    // --- levelDisplayLabel: maps the two sentinels, passes everything else through ------------

    describe("levelDisplayLabel", () => {
        test("maps LEVEL_NOT_INDICATED to the localized copy", () => {
            expect(levelDisplayLabel(LEVEL_NOT_INDICATED)).toBe(expected.notIndicated);
        });

        test("maps LEVEL_TO_SPECIFY to the localized copy", () => {
            expect(levelDisplayLabel(LEVEL_TO_SPECIFY)).toBe(expected.toSpecify);
        });

        test("passes a real label through unchanged", () => {
            expect(levelDisplayLabel("Débutant")).toBe("Débutant");
        });

        test("passes null / undefined / empty string through unchanged", () => {
            expect(levelDisplayLabel(null)).toBeNull();
            expect(levelDisplayLabel(undefined)).toBeUndefined();
            expect(levelDisplayLabel("")).toBe("");
        });
    });

    // --- formatIntervalsForSchedule: title branches -----------------------------------------

    describe("formatIntervalsForSchedule titles", () => {
        const rawIntervals = [
            { id: "v-e", kind: "e", is_validated: true, start: "2026-09-01T10:00:00", end: "2026-09-01T11:00:00" },
            { id: "u-e", kind: "e", is_validated: false, start: "2026-09-01T11:00:00", end: "2026-09-01T12:00:00" },
            { id: "bare", kind: "x", start: "2026-09-01T12:00:00", end: "2026-09-01T13:00:00" },
            {
                id: "act",
                kind: "x",
                start: "2026-09-01T13:00:00",
                end: "2026-09-01T14:00:00",
                activity: { activity_ref: { label: "Guitare" } },
            },
        ];

        const format = () =>
            formatIntervalsForSchedule(rawIntervals, null, { id: 1 }, "teacher", 1, {});

        test("validated kind 'e' -> evaluation title", () => {
            const byId = keyById(format());
            expect(byId["v-e"].title).toBe(expected.evaluation);
        });

        test("unvalidated kind 'e' -> availability-evaluation title", () => {
            const byId = keyById(format());
            expect(byId["u-e"].title).toBe(expected.availabilityEvaluation);
        });

        test("bare interval (no activity, kind not 'e'/'p') -> availability title", () => {
            const byId = keyById(format());
            expect(byId["bare"].title).toBe(expected.availability);
        });

        test("interval carrying an activity keeps activity_ref.label and bypasses i18n", () => {
            const byId = keyById(format());
            expect(byId["act"].title).toBe("Guitare");
        });
    });
});

const keyById = intervals =>
    intervals.reduce((acc, i) => {
        acc[i.id] = i;
        return acc;
    }, {});

// ------------------------------------------------------------------------------------------------
// Cross-locale reactivity — the same helper call flips output after changeLanguage()
// ------------------------------------------------------------------------------------------------

describe("reactivity to i18n.changeLanguage", () => {
    test("averageAgeDisplay follows the active language", async () => {
        await i18n.changeLanguage("fr");
        expect(averageAgeDisplay(12)).toBe("12 ans");
        await i18n.changeLanguage("en");
        expect(averageAgeDisplay(12)).toBe("12 years old");
    });

    test("levelDisplayLabel follows the active language for the same sentinel", async () => {
        await i18n.changeLanguage("fr");
        expect(levelDisplayLabel(LEVEL_NOT_INDICATED)).toBe("NON INDIQUÉ");
        expect(levelDisplayLabel(LEVEL_TO_SPECIFY)).toBe("À PRÉCISER");
        await i18n.changeLanguage("en");
        expect(levelDisplayLabel(LEVEL_NOT_INDICATED)).toBe("NOT SPECIFIED");
        expect(levelDisplayLabel(LEVEL_TO_SPECIFY)).toBe("TO BE SPECIFIED");
    });

    test("formatIntervalsForSchedule titles follow the active language", async () => {
        const raw = [
            { id: "u-e", kind: "e", is_validated: false, start: "2026-09-01T11:00:00", end: "2026-09-01T12:00:00" },
            { id: "bare", kind: "x", start: "2026-09-01T12:00:00", end: "2026-09-01T13:00:00" },
        ];
        const run = () => keyById(formatIntervalsForSchedule(raw, null, { id: 1 }, "teacher", 1, {}));

        await i18n.changeLanguage("fr");
        let byId = run();
        expect(byId["u-e"].title).toBe("Dispo. Évaluation");
        expect(byId["bare"].title).toBe("Disponibilité");

        await i18n.changeLanguage("en");
        byId = run();
        expect(byId["u-e"].title).toBe("Avail. Evaluation");
        expect(byId["bare"].title).toBe("Availability");
    });
});

// ------------------------------------------------------------------------------------------------
// i18n layer — the new / reused planning keys resolve in fr AND en, with fr/en parity
// ------------------------------------------------------------------------------------------------

describe("planning.json i18n layer", () => {
    // Phase 07 P0 (docs/I18n-Roadmap.md §P0): the "every key resolves" loop and the
    // scheduleTitles/levelDisplay key-set parity check were pure pipeline coverage — redundant
    // with frontend/i18n/index.test.js's cross-namespace parity guard. Removed. Kept: the
    // {{age}} sub-lexical interpolation and the evaluation-vs-availabilityEvaluation
    // distinct-copy regression from the calendar lot.

    test("ageYears interpolates {{age}} brace-free in both locales", () => {
        expect(i18n.getFixedT("fr", "planning")("ageYears", { age: 12 })).toBe("12 ans");
        expect(i18n.getFixedT("en", "planning")("ageYears", { age: 12 })).toBe("12 years old");
    });

    test("the new scheduleTitles.evaluation key is distinct from availabilityEvaluation (fr)", () => {
        const t = i18n.getFixedT("fr", "planning");
        expect(t("scheduleTitles.evaluation")).toBe("Évaluation");
        expect(t("scheduleTitles.availabilityEvaluation")).toBe("Dispo. Évaluation");
        expect(t("scheduleTitles.evaluation")).not.toBe(t("scheduleTitles.availabilityEvaluation"));
    });
});
