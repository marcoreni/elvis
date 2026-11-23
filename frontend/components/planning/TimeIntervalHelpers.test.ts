// i18n extraction test — i18n-06 "planning" domain, lot 3c (the last i18n-06 lot). Covers the
// pure-helper module `TimeIntervalHelpers.ts`, which has no React and reads the `i18n`
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

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ScheduleInterval } from "./TimeIntervalHelpers";
import {
    LEVEL_NOT_INDICATED,
    LEVEL_TO_SPECIFY,
    averageAgeDisplay,
    computeInterval,
    computeValidatedInterval,
    fetchInterval,
    fetchIntervals,
    formatIntervalsForSchedule,
    levelDisplay,
    levelDisplayLabel,
} from "./TimeIntervalHelpers";
import type { User } from "../utils/entities";
import { fullname } from "../../tools/format";
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
])(
    "locale = %s",
    (
        lng: string,
        expected: {
            age12: string;
            notIndicated: string;
            toSpecify: string;
            evaluation: string;
            availabilityEvaluation: string;
            availability: string;
        }
    ) => {
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
                    {
                        id: 2,
                        levels: [
                            {
                                season_id: 99,
                                activity_ref_id: 7,
                                evaluation_level_ref_id: 5,
                            },
                        ],
                    },
                ];
                expect(levelDisplay(users, activityRef, seasonId)).toBe(
                    LEVEL_NOT_INDICATED
                );
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
                                evaluation_level_ref: {
                                    id: 100,
                                    label: "Débutant",
                                },
                            },
                            {
                                season_id: 1,
                                activity_ref_id: 7,
                                evaluation_level_ref_id: 200,
                                evaluation_level_ref: {
                                    id: 200,
                                    label: "Avancé",
                                },
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
                                evaluation_level_ref: {
                                    id: 100,
                                    label: "Débutant",
                                },
                            },
                        ],
                    },
                ];
                expect(levelDisplay(users, activityRef, seasonId)).toBe(
                    "Débutant"
                );
            });
        });

        // --- levelDisplayLabel: maps the two sentinels, passes everything else through ------------

        describe("levelDisplayLabel", () => {
            test("maps LEVEL_NOT_INDICATED to the localized copy", () => {
                expect(levelDisplayLabel(LEVEL_NOT_INDICATED)).toBe(
                    expected.notIndicated
                );
            });

            test("maps LEVEL_TO_SPECIFY to the localized copy", () => {
                expect(levelDisplayLabel(LEVEL_TO_SPECIFY)).toBe(
                    expected.toSpecify
                );
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
                {
                    id: "v-e",
                    kind: "e",
                    is_validated: true,
                    start: "2026-09-01T10:00:00",
                    end: "2026-09-01T11:00:00",
                },
                {
                    id: "u-e",
                    kind: "e",
                    is_validated: false,
                    start: "2026-09-01T11:00:00",
                    end: "2026-09-01T12:00:00",
                },
                {
                    id: "bare",
                    kind: "x",
                    start: "2026-09-01T12:00:00",
                    end: "2026-09-01T13:00:00",
                },
                {
                    id: "act",
                    kind: "x",
                    start: "2026-09-01T13:00:00",
                    end: "2026-09-01T14:00:00",
                    activity: { activity_ref: { label: "Guitare" } },
                },
            ];

            const format = () =>
                formatIntervalsForSchedule(
                    rawIntervals,
                    null,
                    { id: 1 },
                    "teacher",
                    1,
                    {}
                );

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
    }
);

const keyById = (
    intervals: ScheduleInterval[]
): Record<string, ScheduleInterval> =>
    intervals.reduce((acc: Record<string, ScheduleInterval>, i) => {
        acc[String(i.id)] = i;
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
            {
                id: "u-e",
                kind: "e",
                is_validated: false,
                start: "2026-09-01T11:00:00",
                end: "2026-09-01T12:00:00",
            },
            {
                id: "bare",
                kind: "x",
                start: "2026-09-01T12:00:00",
                end: "2026-09-01T13:00:00",
            },
        ];
        const run = () =>
            keyById(
                formatIntervalsForSchedule(
                    raw,
                    null,
                    { id: 1 },
                    "teacher",
                    1,
                    {}
                )
            );

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
        expect(i18n.getFixedT("fr", "planning")("ageYears", { age: 12 })).toBe(
            "12 ans"
        );
        expect(i18n.getFixedT("en", "planning")("ageYears", { age: 12 })).toBe(
            "12 years old"
        );
    });

    test("the new scheduleTitles.evaluation key is distinct from availabilityEvaluation (fr)", () => {
        const t = i18n.getFixedT("fr", "planning");
        expect(t("scheduleTitles.evaluation")).toBe("Évaluation");
        expect(t("scheduleTitles.availabilityEvaluation")).toBe(
            "Dispo. Évaluation"
        );
        expect(t("scheduleTitles.evaluation")).not.toBe(
            t("scheduleTitles.availabilityEvaluation")
        );
    });
});

// ------------------------------------------------------------------------------------------------
// fetchIntervals / fetchInterval -- GET, not a no-op `type: "GET"` typo
// ------------------------------------------------------------------------------------------------

describe("fetchIntervals / fetchInterval", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    test("fetchIntervals sends a real GET request (method, not the old no-op `type` key)", async () => {
        const fetchSpy = vi
            .fn()
            .mockResolvedValue({ json: () => Promise.resolve({}) });
        vi.stubGlobal("fetch", fetchSpy);

        await fetchIntervals(
            "csrf-token",
            5,
            "activities",
            "2026-01-01",
            "week"
        );

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe("/activities/5/intervals/week/2026-01-01");
        expect(init).toMatchObject({
            method: "GET",
            headers: { "X-Csrf-Token": "csrf-token" },
        });
    });

    test("fetchInterval sends a real GET request", async () => {
        const fetchSpy = vi
            .fn()
            .mockResolvedValue({ json: () => Promise.resolve({}) });
        vi.stubGlobal("fetch", fetchSpy);

        await fetchInterval("csrf-token", 42);

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const [url, init] = fetchSpy.mock.calls[0];
        expect(url).toBe("/time_interval/42");
        expect(init).toMatchObject({
            method: "GET",
            headers: { "X-Csrf-Token": "csrf-token" },
        });
    });
});

// ------------------------------------------------------------------------------------------------
// computeValidatedInterval -- regression for the old `this.computeInterval` dead reference
// ------------------------------------------------------------------------------------------------

describe("computeValidatedInterval", () => {
    test("does not throw, and sums only the validated intervals' durations", () => {
        const intervals = [
            {
                start: "2026-01-01T10:00:00",
                end: "2026-01-01T11:00:00",
                is_validated: true,
            },
            {
                start: "2026-01-01T12:00:00",
                end: "2026-01-01T14:00:00",
                is_validated: false,
            },
        ];

        let result;
        expect(() => {
            result = computeValidatedInterval(intervals);
        }).not.toThrow();
        expect(result!.asHours()).toBe(1);
        // Sanity check against the shared computeInterval it delegates to directly (the old
        // `.jsx` called `this.computeInterval(...)`, which was always `undefined` -- a plain
        // module-level export has no `this` -- so this function could never have run at all).
        expect(result!.asMilliseconds()).toBe(
            computeInterval(intervals, (i) => i.is_validated).asMilliseconds()
        );
    });
});

// ------------------------------------------------------------------------------------------------
// formatIntervalsForSchedule -- regression for the `teacher: ... || undefined` crash (finding #1)
// ------------------------------------------------------------------------------------------------

describe("formatIntervalsForSchedule teacher fallback", () => {
    test("falls back to {} (not undefined) when no main teacher is assigned", () => {
        const raw = [
            {
                id: "no-teacher",
                kind: "x",
                start: "2026-09-01T10:00:00",
                end: "2026-09-01T11:00:00",
                // No `teacher` on the activity, and no activity_instance at all --
                // a real, reachable "no main teacher assigned" state.
                activity: { activity_ref: { label: "Guitare" } },
            },
        ];
        const byId = keyById(
            formatIntervalsForSchedule(raw, null, { id: 1 }, "teacher", 1, {})
        );

        expect(byId["no-teacher"].teacher).toEqual({});

        // MultiViewModal.jsx's TeacherItem calls fullname(schedule.teacher) unguarded whenever
        // there's no cover teacher -- this must not throw (it used to, via
        // `schedule.teacher.last_name`, when `teacher` was `undefined`).
        expect(() =>
            fullname(byId["no-teacher"].teacher as User)
        ).not.toThrow();
    });
});

// ------------------------------------------------------------------------------------------------
// levelDisplay -- regression for the NULL activity_ref_id loose-match bug (finding #2)
// ------------------------------------------------------------------------------------------------

describe("levelDisplay NULL activity_ref_id regression", () => {
    const usersWithNullRefLevel = [
        {
            id: 1,
            levels: [
                {
                    season_id: 1,
                    activity_ref_id: null,
                    evaluation_level_ref_id: 100,
                    evaluation_level_ref: { id: 100, label: "Débutant" },
                },
            ],
        },
    ];

    test("a level with a NULL activity_ref_id does not match a missing activityRef", () => {
        expect(levelDisplay(usersWithNullRefLevel, undefined, 1)).toBe(
            LEVEL_NOT_INDICATED
        );
        expect(levelDisplay(usersWithNullRefLevel, null, 1)).toBe(
            LEVEL_NOT_INDICATED
        );
    });

    test("a level with a NULL activity_ref_id still does not match a real numeric activityRef", () => {
        expect(levelDisplay(usersWithNullRefLevel, { id: 7 }, 1)).toBe(
            LEVEL_NOT_INDICATED
        );
    });

    test("a real numeric activityRef still matches its corresponding level normally", () => {
        const users = [
            {
                id: 1,
                levels: [
                    {
                        season_id: 1,
                        activity_ref_id: 7,
                        evaluation_level_ref_id: 100,
                        evaluation_level_ref: { id: 100, label: "Débutant" },
                    },
                ],
            },
        ];
        expect(levelDisplay(users, { id: 7 }, 1)).toBe("Débutant");
    });
});

// ------------------------------------------------------------------------------------------------
// formatIntervalsForSchedule -- regression for the bgColor null-resourceId fix (finding #3)
// ------------------------------------------------------------------------------------------------

describe("formatIntervalsForSchedule bgColor multi-resource null guard regression", () => {
    test("room view with no activity_instance yields undefined bgColor/dragBgColor", () => {
        const raw = [
            {
                id: "no-room",
                kind: "x",
                start: "2026-09-01T10:00:00",
                end: "2026-09-01T11:00:00",
                // No activity_instance -> getRoomId returns null -> colors[null] is undefined.
            },
        ];
        const colors = {
            1: "hsl(0deg, 68%, 60%)",
            2: "hsl(180deg, 68%, 60%)",
        };
        const byId = keyById(
            formatIntervalsForSchedule(raw, null, { id: 1 }, "room", 2, colors)
        );

        expect(byId["no-room"].bgColor).toBeUndefined();
        expect(byId["no-room"].dragBgColor).toBeUndefined();
    });
});
