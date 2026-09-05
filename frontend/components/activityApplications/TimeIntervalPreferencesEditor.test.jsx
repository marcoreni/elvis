// i18n extraction test — i18n-06 "activities" domain, lot 3b (`activityApplications` namespace).
//
// TimeIntervalPreferencesEditor's default export is `PreferencesEditor` (function component,
// `useTranslation("activityApplications")`). It renders two column headers, the second of which
// switches on `maxIntervals` (1 -> "chosen slot", else -> "preference order"), and a
// "no slot suitable" line when `selectedIntervals` is empty. The nested `Availability` class
// (which uses `i18n.t` directly for `timeIntervalPreferences.with` / `.teacherPhotoAlt`) is not
// exported, but it IS reachable from the default export by passing a non-empty `intervals` map —
// the third describe block below mounts it that way, so those two keys are covered at the render
// layer too, not only at the i18n layer. `./ItemPreferences` is stubbed.

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

// Regression test for the undeclared-lodash-global fix (fix/undeclared-lodash-global): before that
// fix, `Availability.render` called `_.get(data, "activity.location.label")` and
// `_.get(data, "activity.teacher")` with no `import _ from "lodash"` in this file, relying on a
// global `_` the webpack config never actually provides. `Availability` is not exported, but it is
// reachable from the default export: any non-empty `intervals` map mounts one per availability, so
// under jsdom (and in the real bundle) the whole editor threw `ReferenceError: _ is not defined`
// as soon as the `/time_interval_preferences/:season/:ref` fetch returned any slot at all.
//
// The fixture mirrors that endpoint's payload — `ActivityRefs::FindActivityIntervals` serializes
// `time_interval.as_json(include: {activity: {include: {location: {}, teacher: {}}}})`.
describe("PreferencesEditor — Availability rows (_.get on activity.location / activity.teacher)", () => {
    const intervalsWithOneSlot = {
        1: [
            {
                id: 10,
                start: "2025-09-01T10:00:00",
                end: "2025-09-01T11:00:00",
                activity: {
                    location: {label: "Salle 2"},
                    teacher: {first_name: "Jean", last_name: "Dupont"},
                },
            },
        ],
    };

    test("renders the slot's location badge and teacher, resolved through _.get", async () => {
        await i18n.changeLanguage("fr");

        render(<PreferencesEditor {...baseProps} intervals={intervalsWithOneSlot} />);

        expect(screen.getByText("Salle 2")).toBeInTheDocument();
        expect(screen.getByText("Avec")).toBeInTheDocument();
        expect(screen.getByText(/Jean\s*Dupont/)).toBeInTheDocument();
        // No avatar_url on the fixture, so the placeholder <svg> is used and the alt-text key is
        // not rendered — the checkbox proves the Availability row itself mounted.
        expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    test("renders the teacher photo alt text when the slot has an avatar_url", async () => {
        await i18n.changeLanguage("en");

        const withAvatar = {
            1: [{...intervalsWithOneSlot[1][0], avatar_url: "/uploads/teacher.png"}],
        };

        render(<PreferencesEditor {...baseProps} intervals={withAvatar} />);

        expect(screen.getByAltText("teacher photo")).toBeInTheDocument();
        expect(screen.getByText("With")).toBeInTheDocument();
    });

    test("omits the location badge when the slot has no location, without throwing", async () => {
        await i18n.changeLanguage("fr");

        const noLocation = {
            1: [
                {
                    id: 11,
                    start: "2025-09-01T10:00:00",
                    end: "2025-09-01T11:00:00",
                    activity: {location: null, teacher: {first_name: "Marie", last_name: "Martin"}},
                },
            ],
        };

        render(<PreferencesEditor {...baseProps} intervals={noLocation} />);

        expect(screen.queryByText("Salle 2")).not.toBeInTheDocument();
        expect(screen.getByText(/Marie\s*Martin/)).toBeInTheDocument();
    });

    // Regression: Activity#teacher (app/models/activity.rb) returns nil for an activity with no
    // main teacher, so `as_json` emits `"teacher": null`. Availability.render read `teacher` via a
    // guarded `_.get`, but then dereferenced `teacher.first_name` unconditionally -- a
    // TypeError that unmounted the whole slot editor for that student. The "with <teacher>" block
    // is now guarded like the location badge above it.
    test("omits the 'with <teacher>' block when the slot has no teacher, without throwing", async () => {
        await i18n.changeLanguage("fr");

        const noTeacher = {
            1: [
                {
                    id: 12,
                    start: "2025-09-01T10:00:00",
                    end: "2025-09-01T11:00:00",
                    activity: {location: {label: "Salle 2"}, teacher: null},
                },
            ],
        };

        render(<PreferencesEditor {...baseProps} intervals={noTeacher} />);

        expect(screen.getByText("Salle 2")).toBeInTheDocument();
        expect(screen.queryByText("Avec")).not.toBeInTheDocument();
        // The Availability row still mounted (the checkbox proves it) instead of crashing.
        expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });
});
