// Unit test for the constants-i18n follow-up extracting STOP_REASONS labels (docs/KnownIssues.md
// "Constant-module label dictionaries NOT extracted in P5"). `id` is data — compared against
// `d.comment` in StopList.jsx and the `stopReasonValue` state in CurrentActivityItem.jsx — and
// must stay exactly as-is across a locale switch. Only `label` is display text, localized via
// `activityApplications:stopReasons.*` with the same `export let` + `languageChanged` live-binding
// pattern as tools/constants.ts's WEEKDAYS/KINDS_LABEL/etc.

import { afterEach, describe, expect, test } from "vitest";
import i18n from "../../i18n";
import * as StopReasons from "./StopReasons";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("STOP_REASONS follows the active UI language", () => {
    test("default language (fr) exposes the French labels, ids unchanged", async () => {
        await i18n.changeLanguage("fr");

        expect(StopReasons.STOP_REASONS).toEqual([
            {
                id: StopReasons.NOT_SUITABLE_ID,
                label: "Les méthodes d'apprentissage ne me conviennent pas",
            },
            {
                id: StopReasons.UNSUITABLE_LEVEL_ID,
                label: "Le niveau du cours est inadapté",
            },
            {
                id: StopReasons.POOR_COHESION_ID,
                label: "Mauvaise cohésion du groupe",
            },
            {
                id: StopReasons.WRONG_INSTRUMENT_ID,
                label: "Erreur de choix d'instrument",
            },
            {
                id: StopReasons.POOR_REPERTOIRE_ID,
                label: "Problème de répertoire",
            },
            {
                id: StopReasons.SCHEDULE_CHANGE_ID,
                label: "Changement de planning",
            },
            { id: StopReasons.MOVING_ID, label: "Déménagement" },
            {
                id: StopReasons.LEVEL_NOT_SUITABLE_ID,
                label: "Le niveau du cours est inadapté",
            },
            { id: StopReasons.OTHER_ID, label: "Autre..." },
        ]);
    });

    test("after changeLanguage('en') labels are re-read as English, ids still unchanged", async () => {
        await i18n.changeLanguage("en");

        expect(StopReasons.STOP_REASONS.map((r) => r.id)).toEqual([
            StopReasons.NOT_SUITABLE_ID,
            StopReasons.UNSUITABLE_LEVEL_ID,
            StopReasons.POOR_COHESION_ID,
            StopReasons.WRONG_INSTRUMENT_ID,
            StopReasons.POOR_REPERTOIRE_ID,
            StopReasons.SCHEDULE_CHANGE_ID,
            StopReasons.MOVING_ID,
            StopReasons.LEVEL_NOT_SUITABLE_ID,
            StopReasons.OTHER_ID,
        ]);
        expect(
            StopReasons.STOP_REASONS.find((r) => r.id === StopReasons.OTHER_ID)
                ?.label
        ).toBe("Other...");
        expect(
            StopReasons.STOP_REASONS.find(
                (r) => r.id === StopReasons.WRONG_INSTRUMENT_ID
            )?.label
        ).toBe("Wrong instrument choice");
    });

    test("switching back to fr restores the French labels", async () => {
        await i18n.changeLanguage("en");
        await i18n.changeLanguage("fr");

        expect(
            StopReasons.STOP_REASONS.find((r) => r.id === StopReasons.OTHER_ID)
                ?.label
        ).toBe("Autre...");
    });

    test("id values are stable strings usable for backend-keyed comparisons, unaffected by locale", async () => {
        await i18n.changeLanguage("fr");
        expect(StopReasons.NOT_SUITABLE_ID).toBe("1");
        expect(StopReasons.OTHER_ID).toBe("11");

        await i18n.changeLanguage("en");
        expect(StopReasons.NOT_SUITABLE_ID).toBe("1");
        expect(StopReasons.OTHER_ID).toBe("11");
    });
});
