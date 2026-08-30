// Component tests for the i18n extraction on the practice_planning/ components (planning lot 6).
//
// The container `PracticePlanning` mounts @fullcalendar/react, which performs DOM measurement
// that does not run cleanly in jsdom, so it is not exercised here. The two modal components own
// all of the extracted strings and are rendered directly, once per locale, asserting on the
// real translated copy from frontend/locales/{fr,en}/planning.json (+ common.json).
//
// Both modals are withTranslation("planning")-wrapped classes; the singleton wiring in
// frontend/i18n/index.js covers the `t` prop with no <I18nextProvider> needed.

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../../../i18n";

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
