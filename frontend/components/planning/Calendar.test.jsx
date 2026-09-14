// Tests for Calendar.tsx (tui-calendar -> FullCalendar v6 rewrite, roadmap item 6 step B).
//
// The pure `getTimeTemplate` HTML-string builder and the `CalendarControls` toolbar are exercised
// directly (unchanged from the original i18n-extraction tests below). The default export
// (CustomCalendar, the FullCalendar adapter itself) mounts a real FullCalendar, which performs DOM
// measurement that doesn't run cleanly in jsdom -- same reason practice_planning/PracticePlanning
// mocks it out (see that file's test for the established pattern this reuses). The stub here
// additionally exposes a fake imperative getApi() and captures the callback props FullCalendar
// receives, so the create/update/click adapters and toolbar navigation can be exercised by
// invoking those captured callbacks directly, as synthetic FullCalendar event objects.

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import i18n from "../../i18n";
import CustomCalendar, { getTimeTemplate, CalendarControls } from "./Calendar";

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
        expect(getTimeTemplate(base, false, false, { t: planningT() })).toContain("Dispo. Évaluation");

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

// componentDidMount immediately calls calendarRef.current.getApi(), so the stub must answer a ref
// the same way the real FullCalendar does (an imperative handle), not just render -- same
// constraint documented in practice_planning/PracticePlanning.test.jsx.
let lastFullCalendarProps = null;
const fakeApi = {
    changeView: vi.fn(),
    gotoDate: vi.fn(),
    prev: vi.fn(),
    next: vi.fn(),
    unselect: vi.fn(),
    getDate: vi.fn(() => new Date("2026-09-08")),
};
vi.mock("@fullcalendar/react", () => ({
    default: React.forwardRef((props, ref) => {
        lastFullCalendarProps = props;
        React.useImperativeHandle(ref, () => ({ getApi: () => fakeApi }));
        return <div data-testid="fullcalendar-stub" />;
    }),
}));
vi.mock("@fullcalendar/daygrid", () => ({ default: {} }));
vi.mock("@fullcalendar/timegrid", () => ({ default: {} }));
vi.mock("@fullcalendar/interaction", () => ({ default: {} }));

describe("CustomCalendar — FullCalendar adapter", () => {
    // withTranslation("planning") reads from the frontend/i18n singleton directly -- no
    // <I18nextProvider> needed, same pattern already established elsewhere in this repo.
    const baseProps = {
        intervals: [],
        selectedPlannings: [{ id: 1 }],
        day: new Date("2026-09-08"),
        view: "week",
        updateIntervals: vi.fn(),
        beforeCreateSchedule: vi.fn(),
        beforeUpdateSchedule: vi.fn(),
        clickSchedule: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        lastFullCalendarProps = null;
    });

    test("configures a 15-minute snap, replacing the tui-calendar fork's hardcoded getNearestHour behavior", () => {
        render(<CustomCalendar {...baseProps} />);
        expect(lastFullCalendarProps.snapDuration).toBe("00:15:00");
    });

    test("view switching calls FullCalendar's changeView and updateIntervals when the view changes", () => {
        render(<CustomCalendar {...baseProps} />);
        fireEvent.click(screen.getByText("Mois"));

        expect(fakeApi.changeView).toHaveBeenCalledWith("dayGridMonth");
        expect(baseProps.updateIntervals).toHaveBeenCalledWith(
            baseProps.day,
            "month"
        );
    });

    test("select (create) hands beforeCreateSchedule an interval-shaped object and clears the selection", () => {
        render(<CustomCalendar {...baseProps} />);

        lastFullCalendarProps.select({
            start: new Date("2026-09-08T10:00:00"),
            end: new Date("2026-09-08T11:00:00"),
            allDay: false,
        });

        expect(baseProps.beforeCreateSchedule).toHaveBeenCalledWith(
            expect.objectContaining({ isAllDay: false })
        );
        expect(fakeApi.unselect).toHaveBeenCalled();
    });

    // Regression for a bug caught in review: the events mapping needs a *string* id for
    // FullCalendar's own bookkeeping, but reconstructSchedule must not let that stringified id
    // leak back into the schedule handed to Planning.jsx -- Planning.jsx does strict-equality
    // lookups (`i.id === interval.id`) against the original, often-numeric id. Fixtures here
    // deliberately use a numeric schedule id (7), not a pre-stringified one, so this is actually
    // exercised -- FullCalendar's own event.id is always a string ("7"), mirroring the real API.
    test("eventClick reconstructs the full schedule (including .raw), preserving the original numeric id", () => {
        const schedule = {
            id: 7,
            title: "Cours",
            kind: "c",
            raw: { comment: "hi" },
            isAllDay: false,
        };
        render(<CustomCalendar {...baseProps} intervals={[schedule]} />);

        lastFullCalendarProps.eventClick({
            event: {
                id: "7",
                title: "Cours",
                start: new Date("2026-09-08T10:00:00"),
                end: new Date("2026-09-08T11:00:00"),
                allDay: false,
                extendedProps: lastFullCalendarProps.events[0].extendedProps,
            },
        });

        expect(baseProps.clickSchedule).toHaveBeenCalledWith({
            schedule: expect.objectContaining({
                id: 7,
                kind: "c",
                raw: { comment: "hi" },
            }),
        });
    });

    // eventDrop and eventResize share the same adapter (handleEventChange) -- one test exercises
    // the shared code path both drag-move and resize go through.
    test("eventDrop reconstructs the schedule plus the new start/end for beforeUpdateSchedule", () => {
        const schedule = {
            id: 9,
            title: "Dispo",
            kind: "o",
            isAllDay: false,
        };
        render(<CustomCalendar {...baseProps} intervals={[schedule]} />);

        const newStart = new Date("2026-09-08T14:00:00");
        const newEnd = new Date("2026-09-08T15:00:00");
        lastFullCalendarProps.eventDrop({
            event: {
                id: "9",
                title: "Dispo",
                start: newStart,
                end: newEnd,
                allDay: false,
                extendedProps: lastFullCalendarProps.events[0].extendedProps,
            },
            revert: vi.fn(),
        });

        expect(baseProps.beforeUpdateSchedule).toHaveBeenCalledWith(
            expect.objectContaining({
                schedule: expect.objectContaining({ id: 9, kind: "o" }),
            })
        );
    });

    // Planning.jsx's beforeUpdateSchedule returns literal `null` (not just a falsy value) when
    // the drag/resize isn't allowed -- e.g. a teacher without edit rights. Unlike tui-calendar
    // (which rebuilt every schedule from props.intervals on every render, self-correcting), this
    // FullCalendar adapter renders `events` reactively and must revert explicitly, or the drag
    // visually sticks with nothing persisted.
    test("a rejected update (beforeUpdateSchedule returning null) reverts the drag/resize", () => {
        const schedule = { id: 5, title: "Dispo", kind: "o", isAllDay: false };
        const revert = vi.fn();
        render(
            <CustomCalendar
                {...baseProps}
                intervals={[schedule]}
                beforeUpdateSchedule={() => null}
            />
        );

        lastFullCalendarProps.eventDrop({
            event: {
                id: "5",
                title: "Dispo",
                start: new Date("2026-09-08T14:00:00"),
                end: new Date("2026-09-08T15:00:00"),
                allDay: false,
                extendedProps: lastFullCalendarProps.events[0].extendedProps,
            },
            revert,
        });

        expect(revert).toHaveBeenCalled();
    });

    // Regression: formatIntervalsForSchedule sets activity_instance (snake_case) and
    // color/bgColor/borderColor per event -- the tui-calendar fork's Schedule model renamed
    // activity_instance -> activityInstance and rendered the colors inline; both need replicating
    // by hand since FullCalendar doesn't do either automatically.
    test("events carry FullCalendar's color fields and the activityInstance rename", () => {
        const schedule = {
            id: 3,
            title: "Cours",
            kind: "c",
            isAllDay: false,
            bgColor: "#123456",
            borderColor: "#abcdef",
            color: "#ffffff",
            activity_instance: { id: 42 },
        };
        render(<CustomCalendar {...baseProps} intervals={[schedule]} />);

        expect(lastFullCalendarProps.events[0]).toMatchObject({
            backgroundColor: "#123456",
            borderColor: "#abcdef",
            textColor: "#ffffff",
        });
        expect(
            lastFullCalendarProps.events[0].extendedProps.activityInstance
        ).toEqual({ id: 42 });
    });

    // Regression: dayGridMonth's header row has no real per-cell date (FullCalendar synthesizes
    // an arbitrary Jan-1970 date for it) -- the custom per-day content (date number, presence
    // link) must only apply in week/day views, or month headers show nonsense dates/links.
    test("dayHeaderContent falls back to FullCalendar's default rendering in month view", () => {
        render(<CustomCalendar {...baseProps} view="month" />);

        const result = lastFullCalendarProps.dayHeaderContent({
            date: new Date("1970-01-05"),
            view: { type: "dayGridMonth" },
        });

        expect(result).toBe(true);
    });

    test("multi-planning mode disables select/editable (matching tui-calendar's isReadOnly for that mode)", () => {
        render(
            <CustomCalendar
                {...baseProps}
                selectedPlannings={[{ id: 1 }, { id: 2 }]}
            />
        );

        expect(lastFullCalendarProps.selectable).toBe(false);
        expect(lastFullCalendarProps.editable).toBe(false);
    });
});
