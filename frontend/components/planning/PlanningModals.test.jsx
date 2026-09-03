// Component tests for the i18n extraction on the planning "leaf" components (branch
// feature/i18n-06-extract-planning-modals — lot 2a of the planning domain, which creates the
// `planning` i18next namespace). Mocking-free language switching via the frontend/i18n/index.js
// singleton + useTranslation() / withTranslation("planning").
//
// Each component is rendered with the minimum props needed to reach the extracted strings;
// assertions cover only strings owned by the component under test. YearlyCalendar is not
// exercised here — it mounts react-yearly-calendar, which does not render cleanly in jsdom.

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../../i18n";

import PauseDetailModal from "./PauseDetailModal";
import RoomActivitiesListModal from "./RoomActivitiesListModal";
import StudentModal from "./StudentModal";
import SelectTeachers from "./SelectTeachers";
import RawPlanning from "./RawPlanning";
import SelectActivity from "./SelectActivity";
import YearlyCalendar from "./YearlyCalendar";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("PauseDetailModal", () => {
    const pauseInterval = {start: "2026-09-01T10:00:00", end: "2026-09-01T10:15:00", id: 7};

    test("French by default", async () => {
        await i18n.changeLanguage("fr");
        render(<PauseDetailModal pauseInterval={pauseInterval} closeModal={() => {}} onDelete={() => {}} />);
        expect(screen.getByRole("heading", {name: "Détail de la pause"})).toBeInTheDocument();
        expect(screen.getByText("Fermer")).toBeInTheDocument();
        expect(screen.getByText("Supprimer la pause")).toBeInTheDocument();
    });

    test("English when active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<PauseDetailModal pauseInterval={pauseInterval} closeModal={() => {}} onDelete={() => {}} />);
        expect(screen.getByRole("heading", {name: "Break details"})).toBeInTheDocument();
        expect(screen.getByText("Close")).toBeInTheDocument();
        expect(screen.getByText("Delete the break")).toBeInTheDocument();
    });
});

describe("RoomActivitiesListModal", () => {
    test("interpolates the room label, both locales", async () => {
        await i18n.changeLanguage("fr");
        const {rerender} = render(<RoomActivitiesListModal room={{label: "Salle A"}} refs={[]} />);
        expect(screen.getByText("Activités de la salle Salle A")).toBeInTheDocument();

        await i18n.changeLanguage("en");
        rerender(<RoomActivitiesListModal room={{label: "Salle A"}} refs={[]} />);
        expect(screen.getByText("Activities for room Salle A")).toBeInTheDocument();
    });
});

describe("StudentModal", () => {
    test("French by default", async () => {
        await i18n.changeLanguage("fr");
        render(<StudentModal onSave={() => {}} onRemove={() => {}} />);
        expect(screen.getByRole("heading", {name: "Sélection"})).toBeInTheDocument();
        expect(screen.getByText("Cours")).toBeInTheDocument();
        expect(screen.getByText("Option")).toBeInTheDocument();
        expect(screen.getByText("Enregistrer")).toBeInTheDocument();
    });

    test("English when active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<StudentModal onSave={() => {}} onRemove={() => {}} />);
        expect(screen.getByText("Course")).toBeInTheDocument();
        expect(screen.getByText("Save")).toBeInTheDocument();
    });
});

describe("SelectTeachers", () => {
    test("renders the dropdown label in both locales", async () => {
        const props = {
            listTeacher: [],
            selectedName: {first_name: "Ada", last_name: "Lovelace"},
            currentUser: 1,
            date: "2026-09-01",
        };
        await i18n.changeLanguage("fr");
        const {rerender} = render(<SelectTeachers {...props} />);
        expect(screen.getByText("Planning de")).toBeInTheDocument();

        await i18n.changeLanguage("en");
        rerender(<SelectTeachers {...props} />);
        expect(screen.getByText("Planning of")).toBeInTheDocument();
    });
});

describe("RawPlanning", () => {
    test("renders the empty-week message in both locales", async () => {
        await i18n.changeLanguage("fr");
        const {rerender} = render(<RawPlanning data={{}} seasons={[]} isTeacher={false} />);
        expect(screen.getByText("Aucune activité cette semaine.")).toBeInTheDocument();

        await i18n.changeLanguage("en");
        rerender(<RawPlanning data={{}} seasons={[]} isTeacher={false} />);
        expect(screen.getByText("No activity this week.")).toBeInTheDocument();
    });
});

describe("YearlyCalendar", () => {
    // Regression guard: YearlyCalendar is a withTranslation("planning")-wrapped class; a missing
    // wrapper would surface here as "t is not a function" rather than a silent prod crash.
    const props = {
        label: "Cours de guitare",
        season: {start: "2026-09-01", end: "2027-06-30", holidays: []},
        activityInstances: [],
        handlePickDate: () => {},
    };

    test("renders its translated headings in both locales", async () => {
        await i18n.changeLanguage("fr");
        const {rerender} = render(<YearlyCalendar {...props} />);
        expect(screen.getByText("0 cours prévus sur la saison")).toBeInTheDocument();
        expect(screen.getByText("Cours")).toBeInTheDocument();
        expect(screen.getByText("Existant")).toBeInTheDocument();

        await i18n.changeLanguage("en");
        rerender(<YearlyCalendar {...props} />);
        expect(screen.getByText("0 courses scheduled this season")).toBeInTheDocument();
        expect(screen.getByText("Existing")).toBeInTheDocument();
    });
});

describe("SelectActivity", () => {
    test("renders the title and placeholders in both locales", async () => {
        const props = {mode: "teacher", teachers: [], rooms: [], activities: [], locations: [], onChange: () => {}};
        await i18n.changeLanguage("fr");
        const {rerender} = render(<SelectActivity {...props} />);
        expect(screen.getByRole("heading", {name: "Autres Activités à afficher"})).toBeInTheDocument();
        expect(screen.getByText("Sélectionner d'autres activités")).toBeInTheDocument();

        await i18n.changeLanguage("en");
        rerender(<SelectActivity {...props} />);
        expect(screen.getByRole("heading", {name: "Other activities to display"})).toBeInTheDocument();
        expect(screen.getByText("Select other activities")).toBeInTheDocument();
    });
});
