// Tests for the i18n extraction on Calendar.jsx (branch
// feature/i18n-06-extract-planning-calendar — planning lot 3b).
//
// CustomCalendar mounts tui-calendar in componentDidMount (DOM measurement that doesn't run
// cleanly in jsdom), so the two pieces that carry the extracted copy are exported and exercised
// directly: the pure `getTimeTemplate` HTML-string builder and the `CalendarControls` toolbar.

import React from "react";
import { render, screen } from "@testing-library/react";
import i18n from "../../i18n";
import { getTimeTemplate, CalendarControls } from "./Calendar";

const planningT = () => i18n.getFixedT(null, "planning");

const noop = () => {};
const controlProps = {
    currentDate: null,
    view: "week",
    totalHours: { lesson: 3, option: 1 },
    conflicts: [],
    handleToggleView: noop,
    handleToggleTodayView: noop,
    handleToggleSeasonStartView: noop,
    handleToggleNextSeasonStartView: noop,
    handleTogglePrev: noop,
    handleToggleNext: noop,
    handleSetToConflictDate: noop,
};

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("getTimeTemplate (month view, non-validated schedule)", () => {
    const schedule = {
        start: new Date("2026-09-01T10:00:00Z"),
        end: new Date("2026-09-01T11:00:00Z"),
        kind: "c",
        isPrivate: false,
        isValidated: false,
        raw: {},
    };

    test("uses the French schedule title", async () => {
        await i18n.changeLanguage("fr");
        const html = getTimeTemplate(schedule, false, false, { isMonthView: true, t: planningT() });
        expect(html).toContain("Dispo. Cours");
    });

    test("uses the English schedule title", async () => {
        await i18n.changeLanguage("en");
        const html = getTimeTemplate(schedule, false, false, { isMonthView: true, t: planningT() });
        expect(html).toContain("Avail. Course");
    });
});

describe("CalendarControls", () => {
    test("renders view buttons, tooltips and the hours summary in French", async () => {
        await i18n.changeLanguage("fr");
        render(<CalendarControls {...controlProps} t={planningT()} />);

        expect(screen.getByText("Mois")).toBeInTheDocument();
        expect(screen.getByText("Semaine")).toBeInTheDocument();
        expect(screen.getByText("Jour")).toBeInTheDocument();
        expect(document.querySelector('[data-tippy-content="Aujourd\'hui"]')).toBeTruthy();
        expect(document.querySelector('[data-tippy-content="Début de saison"]')).toBeTruthy();
        expect(screen.getByText(/Nombre d'heures de cours/)).toBeInTheDocument();
    });

    test("renders in English", async () => {
        await i18n.changeLanguage("en");
        render(<CalendarControls {...controlProps} t={planningT()} />);

        expect(screen.getByText("Month")).toBeInTheDocument();
        expect(screen.getByText("Week")).toBeInTheDocument();
        expect(screen.getByText("Day")).toBeInTheDocument();
        expect(document.querySelector('[data-tippy-content="Today"]')).toBeTruthy();
        expect(screen.getByText(/Teaching hours/)).toBeInTheDocument();
    });
});
