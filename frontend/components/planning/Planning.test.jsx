// Component test for the i18n extraction on Planning.jsx (branch
// feature/i18n-06-extract-planning-container — planning lot 4). Planning is a
// withTranslation("planning") container; all extracted copy lives in its own methods / render
// (toasts, the holidays alert, the filter bar, modal contentLabels), so no prop-threading.
//
// CustomCalendar (mounts tui-calendar — DOM measurement that doesn't run in jsdom) and the
// 2000-line ActivityDetailsModal (a later lot) are stubbed. `generic` is passed so
// componentDidMount skips its network fetch.

import React from "react";
import { render, screen } from "@testing-library/react";
import i18n from "../../i18n";

vi.mock("./Calendar", () => ({ default: () => <div data-testid="calendar-stub" /> }));
vi.mock("./ActivityDetailsModal", () => ({ default: () => <div data-testid="adm-stub" /> }));

import Planning from "./Planning";

const props = {
    displayOnly: false,
    generic: true,
    room: { id: 1, label: "Salle A", activity_refs: [] },
    season: { id: 1, holidays: [] },
    intervals: [],
    teachers: [],
    rooms: [],
    room_refs: [],
    locations: [],
    activity_refs: [],
    seasons: [],
    evaluation_level_refs: [],
    new_student_level_questions: [],
    user: { id: 1, is_teacher: false },
};

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("Planning", () => {
    test("renders the holidays alert and filter-bar labels in French by default", async () => {
        await i18n.changeLanguage("fr");
        render(<Planning {...props} />);

        expect(screen.getByText(/les vacances scolaires n'ont pas été importées/)).toBeInTheDocument();
        expect(screen.getByText("Gérer dès maintenant les dates de vacances de votre école.")).toBeInTheDocument();
        // h3 text = "<Autres salles> à afficher (…)" — assert the whole run in one go
        expect(screen.getByRole("heading", { name: /Autres salles\s+à afficher/ })).toBeInTheDocument();
        expect(document.querySelector('[data-tippy-content="Réinitialiser les filtres"]')).toBeTruthy();
        expect(document.querySelector('[data-tippy-content="Activités de cette salle"]')).toBeTruthy();
    });

    test("renders in English when the active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<Planning {...props} />);

        expect(screen.getByText(/school holidays have not been imported/)).toBeInTheDocument();
        expect(screen.getByText("Manage your school's holiday dates now.")).toBeInTheDocument();
        expect(screen.getByText(/Other rooms/)).toBeInTheDocument();
        expect(document.querySelector('[data-tippy-content="Reset filters"]')).toBeTruthy();
    });
});
