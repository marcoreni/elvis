// Regression test for the PracticePlanning FullCalendar toolbar labels.
//
// This lives in its own file (rather than in PracticePlanning.test.jsx) because that file mocks
// @fullcalendar/react wholesale to assert on props. A props-level assertion can't tell whether
// FullCalendar actually *honours* a label, and that is exactly where this component went wrong:
//
//   - `locale="fr"` was hardcoded AND inert, because no locale table was ever imported, so
//     FullCalendar silently fell back to its built-in English chrome ("day" instead of "Jour").
//   - The `resourceTimelineWeek` button rendered the literal view type "resourceTimelineWeek" in
//     *both* languages: the view overrides `duration` to `{days: 7}` rather than `{weeks: 1}`,
//     which leaves FullCalendar's `singleUnit` empty, so it can't resolve `buttonText.week` from
//     any locale table and falls back to the view name.
//
// So this file renders the real calendar and asserts on the real rendered button text.

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../../../i18n";

// datesSet fires during mount and calls fetchSessions() -> tools/api. Stub the fluent chain.
vi.mock("../../../tools/api", () => {
    const chain = {
        success: () => chain,
        error: () => chain,
        get: () => chain,
        post: () => chain,
        put: () => chain,
    };
    return {set: () => chain};
});

import PracticePlanning from "./PracticePlanning";

const containerProps = {bands: [], practice_sessions: [], rooms: []};

const buttonText = selector => document.querySelector(selector).textContent;

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("PracticePlanning — FullCalendar toolbar renders in the active UI language", () => {
    test("fr: the day button comes from the imported fr locale table, the week button from planning:practice.weekButton", async () => {
        await i18n.changeLanguage("fr");
        render(<PracticePlanning {...containerProps} />);

        // Proves the fr locale table is actually registered and resolved: "Jour" only exists in
        // @fullcalendar/core/locales/fr, never in FullCalendar's built-in English fallback.
        expect(buttonText(".fc-resourceTimelineDay-button")).toBe("Jour");
        expect(buttonText(".fc-resourceTimelineWeek-button")).toBe(
            i18n.getFixedT("fr", "planning")("practice.weekButton"),
        );
        expect(buttonText(".fc-resourceTimelineWeek-button")).not.toBe("resourceTimelineWeek");
        expect(buttonText(".fc-today-button")).toBe(
            i18n.getFixedT("fr", "planning")("practice.today"),
        );
    });

    test("en: the day button falls back to FullCalendar's built-in English table, the week button to the en key", async () => {
        await i18n.changeLanguage("en");
        render(<PracticePlanning {...containerProps} />);

        expect(buttonText(".fc-resourceTimelineDay-button")).toBe("day");
        expect(buttonText(".fc-resourceTimelineWeek-button")).toBe(
            i18n.getFixedT("en", "planning")("practice.weekButton"),
        );
        expect(buttonText(".fc-resourceTimelineWeek-button")).not.toBe("resourceTimelineWeek");
        expect(buttonText(".fc-today-button")).toBe(
            i18n.getFixedT("en", "planning")("practice.today"),
        );
    });

    test("the resource-area header follows the language too", async () => {
        await i18n.changeLanguage("en");
        render(<PracticePlanning {...containerProps} />);

        expect(screen.getAllByText(i18n.getFixedT("en", "planning")("practice.rooms")).length).toBeGreaterThan(0);
    });
});
