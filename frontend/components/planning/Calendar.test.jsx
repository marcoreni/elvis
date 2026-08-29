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

describe("getTimeTemplate — month view, non-validated schedule", () => {
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

    test("private schedule uses the (now translated) private label", async () => {
        await i18n.changeLanguage("fr");
        const html = getTimeTemplate({ ...schedule, isPrivate: true }, false, false, { isMonthView: true, t: planningT() });
        expect(html).toContain("Privé");
        expect(html).not.toContain("Private");
    });
});

// tui-calendar hands getTimeTemplate a TZDate (has both toDate() and toUTCString()); the
// non-month branch calls schedule.start.toDate() while the shared prelude calls toUTCString().
const tzDate = iso => {
    const d = new Date(iso);
    return { toDate: () => d, toUTCString: () => d.toUTCString() };
};

describe("getTimeTemplate — week/day view (non-month branch)", () => {
    const base = {
        start: tzDate("2026-09-01T10:00:00Z"),
        end: tzDate("2026-09-01T11:00:00Z"),
        kind: "e",
        isPrivate: false,
        isValidated: false,
        isReadOnly: false,
        recurrenceRule: null,
        attendees: [],
        location: "Salle 1",
        teacher: { first_name: "Ada", last_name: "Lovelace" },
        raw: {},
        activity: null,
        activityInstance: null,
    };

    test("availability title in French / English", async () => {
        await i18n.changeLanguage("fr");
        expect(getTimeTemplate(base, false, false, { t: planningT() })).toContain("Dispo. Evaluation");

        await i18n.changeLanguage("en");
        expect(getTimeTemplate(base, false, false, { t: planningT() })).toContain("Avail. Evaluation");
    });

    test("cover-teacher line uses the reused replacedBy key", async () => {
        const covered = {
            ...base,
            activity: {
                teacher: { id: 1 },
                users: [],
                activity_ref: { id: 7, occupation_limit: 4 },
            },
            activityInstance: { inactive_students: [] },
            raw: { activity_instance: { cover_teacher: { id: 2, first_name: "Grace", last_name: "Hopper" } } },
        };

        await i18n.changeLanguage("fr");
        expect(getTimeTemplate(covered, false, false, { t: planningT(), user: { id: 1 } })).toContain("Remplacé par");

        await i18n.changeLanguage("en");
        expect(getTimeTemplate(covered, false, false, { t: planningT(), user: { id: 1 } })).toContain("Replaced by");
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
