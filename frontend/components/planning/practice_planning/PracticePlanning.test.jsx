// Component tests for the i18n extraction on the practice_planning/ components (planning lot 6).
//
// The container `PracticePlanning` mounts @fullcalendar/react, which performs DOM measurement
// that does not run cleanly in jsdom, so the two modal components own most of the coverage here:
// they're rendered directly, once per locale, asserting on the real translated copy from
// frontend/locales/{fr,en}/planning.json (+ common.json).
//
// Both modals are withTranslation("planning")-wrapped classes; the singleton wiring in
// frontend/i18n/index.js covers the `t` prop with no <I18nextProvider> needed.
//
// The container itself IS reachable for one narrow regression: FullCalendar's `locale` prop used
// to be hardcoded to "fr" (KnownIssues.md) regardless of the active UI language. `@fullcalendar/
// react` is mocked to stash its own props (same pattern used elsewhere in this repo for react-table)
// so the `locale`/`locales` props can be asserted without needing the real DOM-measuring calendar.

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../../../i18n";

// componentDidMount immediately calls `this.calendarRef.current.getApi()`, so the stub must
// answer a ref the same way the real FullCalendar does (an imperative handle), not just render.
let lastFullCalendarProps = null;
vi.mock("@fullcalendar/react", () => ({
    default: React.forwardRef((props, ref) => {
        lastFullCalendarProps = props;
        React.useImperativeHandle(ref, () => ({
            getApi: () => ({getDate: () => new Date("2026-09-01")}),
        }));
        return <div data-testid="fullcalendar-stub" />;
    }),
}));
// The plugin packages import @fullcalendar/common directly at module scope, which throws
// ("Please import the top-level fullcalendar lib before attempting to import a plugin") unless
// something has already registered the real @fullcalendar/core -- mocking @fullcalendar/react
// above skips that registration entirely, so the plugins need mocking too.
vi.mock("@fullcalendar/interaction", () => ({default: {}}));
vi.mock("@fullcalendar/resource-timeline", () => ({default: {}}));

import PracticeHandleSessions from "./PracticeHandleSessions";
import PracticeMultiViewModal from "./PracticeMultiViewModel";
import PracticePlanning from "./PracticePlanning";

// The container can't be rendered (FullCalendar), but this guards the historical
// "import withTranslation but forget to wrap the export" regression: react-i18next sets
// WrappedComponent on the HOC, so a bare `export default class` makes this undefined.
test("PracticePlanning default export is the withTranslation HOC, not a bare class", () => {
    expect(PracticePlanning.WrappedComponent).toBeDefined();
    expect(PracticePlanning.WrappedComponent.name).toBe("PracticePlanning");
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("PracticeHandleSessions", () => {
    // constructor reads props.session.start / .end (via new Date) and .id / .resourceId /
    // .bandId; render() maps over props.rooms and props.bands, so both must be arrays.
    const props = {
        session: {
            start: "2026-09-01T10:00:00",
            end: "2026-09-01T11:00:00",
            room: {},
            band: {},
        },
        rooms: [],
        bands: [],
        onClose: () => {},
        onSave: () => {},
        onDelete: () => {},
    };

    test("renders the extracted copy in French by default", async () => {
        await i18n.changeLanguage("fr");
        render(<PracticeHandleSessions {...props} />);

        expect(screen.getByRole("heading", {name: "Édition de réservation"})).toBeInTheDocument();

        expect(screen.getByText("Salle")).toBeInTheDocument();
        expect(screen.getByText("Groupe")).toBeInTheDocument();
        expect(screen.getByText("Créneau")).toBeInTheDocument();
        expect(screen.getByText("Date:")).toBeInTheDocument();
        expect(screen.getByText("début:")).toBeInTheDocument();
        expect(screen.getByText("fin:")).toBeInTheDocument();

        expect(screen.getByText("Annuler")).toBeInTheDocument();
        expect(screen.getByText("Supprimer")).toBeInTheDocument();
        expect(screen.getByText("Enregistrer")).toBeInTheDocument();

        expect(document.querySelector('[title="non implémenté"]')).not.toBeNull();
    });

    test("renders the extracted copy in English when the active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<PracticeHandleSessions {...props} />);

        expect(screen.getByRole("heading", {name: "Editing a booking"})).toBeInTheDocument();

        expect(screen.getByText("Room")).toBeInTheDocument();
        expect(screen.getByText("Group")).toBeInTheDocument();
        expect(screen.getByText("Slot")).toBeInTheDocument();
        expect(screen.getByText("Date:")).toBeInTheDocument();
        expect(screen.getByText("start:")).toBeInTheDocument();
        expect(screen.getByText("end:")).toBeInTheDocument();

        expect(screen.getByText("Cancel")).toBeInTheDocument();
        expect(screen.getByText("Delete")).toBeInTheDocument();
        expect(screen.getByText("Save")).toBeInTheDocument();

        expect(document.querySelector('[title="not implemented"]')).not.toBeNull();
    });
});

describe("PracticeMultiViewModal", () => {
    // constructor reads props.band.id, props.schedule.{start,end,startStr,endStr} and
    // props.schedule.resource.id — so `schedule` needs a `resource` object to not throw.
    // render() maps over props.bands and returns null when `schedule` is falsy.
    const props = {
        schedule: {resource: {}},
        bands: [],
        band: {},
        onClose: () => {},
        onSave: () => {},
    };

    test("renders the extracted copy in French by default", async () => {
        await i18n.changeLanguage("fr");
        render(<PracticeMultiViewModal {...props} />);

        expect(screen.getByRole("heading", {name: "Création d'une réservation"})).toBeInTheDocument();

        expect(screen.getByText("Groupe")).toBeInTheDocument();
        expect(screen.getByText("Début")).toBeInTheDocument();
        expect(screen.getByText("Fin")).toBeInTheDocument();

        expect(screen.getByText("Annuler")).toBeInTheDocument();
        expect(screen.getByText("Enregistrer")).toBeInTheDocument();
    });

    test("renders the extracted copy in English when the active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<PracticeMultiViewModal {...props} />);

        expect(screen.getByRole("heading", {name: "Creating a booking"})).toBeInTheDocument();

        expect(screen.getByText("Group")).toBeInTheDocument();
        expect(screen.getByText("Start")).toBeInTheDocument();
        expect(screen.getByText("End")).toBeInTheDocument();

        expect(screen.getByText("Cancel")).toBeInTheDocument();
        expect(screen.getByText("Save")).toBeInTheDocument();
    });
});

// Regression: <FullCalendar locale="fr"> used to be hardcoded regardless of the active UI
// language -- and since no @fullcalendar/core/locales/fr import existed anywhere either, that
// hardcoded "fr" was actually inert too (FullCalendar silently falls back to its built-in English
// locale table for chrome it can't resolve). Now `locale` follows i18n.language and the fr locale
// table is imported and registered via `locales`.
describe("PracticePlanning — FullCalendar locale follows the active UI language", () => {
    const containerProps = {bands: [], practice_sessions: [], rooms: []};

    test("fr: locale prop is \"fr\", and the fr locale table is registered", async () => {
        await i18n.changeLanguage("fr");
        render(<PracticePlanning {...containerProps} />);

        expect(lastFullCalendarProps).not.toBeNull();
        expect(lastFullCalendarProps.locale).toBe("fr");
        expect(lastFullCalendarProps.locales).toHaveLength(1);
        expect(lastFullCalendarProps.locales[0].code).toBe("fr");
    });

    test("en: locale prop is \"en\"", async () => {
        await i18n.changeLanguage("en");
        render(<PracticePlanning {...containerProps} />);

        expect(lastFullCalendarProps).not.toBeNull();
        expect(lastFullCalendarProps.locale).toBe("en");
    });
});
