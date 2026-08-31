// i18n extraction test — i18n-06 "activities" domain, lot 3b (`activityApplications` namespace).
//
// TimeIntervalPreferencesEditor's default export is `PreferencesEditor` (function component,
// `useTranslation("activityApplications")`). It renders two column headers, the second of which
// switches on `maxIntervals` (1 -> "chosen slot", else -> "preference order"), and a
// "no slot suitable" line when `selectedIntervals` is empty. The nested `Availability` class
// (which uses `i18n.t` directly for `timeIntervalPreferences.with` / `.teacherPhotoAlt`) is only
// reachable via `IntervalsGroup` with real `intervals` data, so those two keys are covered at the
// i18n layer only. `./ItemPreferences` is stubbed.

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../../i18n";
import PreferencesEditor from "./TimeIntervalPreferencesEditor";

vi.mock("./ItemPreferences", () => ({default: () => null}));

const baseProps = {
    intervals: {},
    selectedIntervals: [],
    groupNameAccessor: g => g,
    intervalHeader: () => "",
    handleSelectInterval() {},
    handleUp() {},
    handleDown() {},
};

afterEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("fr");
});

describe("PreferencesEditor — column headers + empty state", () => {
    test.each([
        ["fr", "Créneaux disponibles", "Ordre de préférences", "Aucun créneau ne me convient."],
        ["en", "Available slots", "Preference order", "None of the slots suit me."],
    ])(
        "%s: availableSlots + preferenceOrder (maxIntervals default) + noSlotSuitable",
        async (lng, available, order, none) => {
            await i18n.changeLanguage(lng);
            render(<PreferencesEditor {...baseProps} />);

            expect(screen.getByText(available)).toBeInTheDocument();
            expect(screen.getByText(order)).toBeInTheDocument();
            expect(screen.getByText(none)).toBeInTheDocument();
        }
    );

    test.each([
        ["fr", "Créneau choisi"],
        ["en", "Chosen slot"],
    ])("%s: maxIntervals=1 swaps the second header to chosenSlot", async (lng, chosen) => {
        await i18n.changeLanguage(lng);
        render(<PreferencesEditor {...baseProps} maxIntervals={1} />);

        expect(screen.getByText(chosen)).toBeInTheDocument();
    });
});

describe("PreferencesEditor — i18n layer (Availability class keys)", () => {
    test.each(["fr", "en"])("timeIntervalPreferences.with / .teacherPhotoAlt resolve in %s", lng => {
        const t = i18n.getFixedT(lng, "activityApplications");
        for (const key of [
            "timeIntervalPreferences.with",
            "timeIntervalPreferences.teacherPhotoAlt",
        ]) {
            const v = t(key);
            expect(typeof v).toBe("string");
            expect(v.length).toBeGreaterThan(0);
            expect(v).not.toBe(key);
        }
    });
});
