// Component tests for the i18n extraction on CreateActivityModal / EvaluationModal /
// MultiViewModal (branch feature/i18n-06-extract-planning-modals-2 — lot 2b of the planning
// domain). These three carry most of their copy in module-level sub-components, so `t` is
// threaded down as a prop. Mocking-free language switching via the frontend/i18n/index.js
// singleton + withTranslation("planning").

import React from "react";
import moment from "moment";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../i18n";

import CreateIntervalModal from "./CreateActivityModal";
import EvaluationModal from "./EvaluationModal";
import MultiViewModal from "./MultiViewModal";

beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {get: () => null},
        json: () => Promise.resolve([]),
    });
});

afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
});

describe("CreateActivityModal (CreateIntervalModal)", () => {
    const props = () => ({
        newInterval: {start: moment("2026-09-01T10:00:00"), end: moment("2026-09-01T11:00:00")},
        seasons: [],
        closeModal: () => {},
        onSave: () => {},
        currentUserIsAdmin: false,
        recurrenceActivated: false,
    });

    test("French by default", async () => {
        await i18n.changeLanguage("fr");
        render(<CreateIntervalModal {...props()} />);
        expect(screen.getByRole("heading", {name: "Création d'un créneau de disponibilité"})).toBeInTheDocument();
        expect(screen.getByText("Créer la disponibilité :")).toBeInTheDocument();
        expect(screen.getByText("La disponibilité sera ajoutée au créneau sélectionné.")).toBeInTheDocument();
        expect(screen.getByText("Cours")).toBeInTheDocument();
        expect(screen.getByText("Évaluation")).toBeInTheDocument();
        expect(screen.getByText("Pause")).toBeInTheDocument();
        expect(screen.getByText("Annuler")).toBeInTheDocument();
        expect(screen.getByText("Enregistrer")).toBeInTheDocument();
    });

    test("English when active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<CreateIntervalModal {...props()} />);
        expect(screen.getByRole("heading", {name: "Creating an availability slot"})).toBeInTheDocument();
        expect(screen.getByText("The availability will be added to the selected slot.")).toBeInTheDocument();
        expect(screen.getByText("Cancel")).toBeInTheDocument();
        expect(screen.getByText("Save")).toBeInTheDocument();
    });

    test("admin recurrence view: choice buttons, then the slot-summary with from/to connectors", async () => {
        await i18n.changeLanguage("en");
        render(<CreateIntervalModal {...props()} currentUserIsAdmin recurrenceActivated />);

        // First screen: the three "add ..." choices.
        expect(screen.getByText("Add a course")).toBeInTheDocument();
        expect(screen.getByText("Add an availability")).toBeInTheDocument();
        expect(screen.getByText("Add a break")).toBeInTheDocument();

        // Picking one reveals the slot summary, whose "de"/"à" connectors were previously
        // hardcoded French (lot-2b review finding).
        await userEvent.click(screen.getByText("Add an availability"));
        expect(screen.getByRole("heading", {name: "Creating an availability"})).toBeInTheDocument();
        const summary = screen.getByText("This slot will be added for:", {exact: false});
        expect(summary).toHaveTextContent(/\bfrom\b/);
        expect(summary).toHaveTextContent(/\bto\b/);
        expect(summary).not.toHaveTextContent(/ de | à /);
    });
});

describe("EvaluationModal", () => {
    const schedule = {is_validated: false};

    test("renders the guidance message and delete button, both locales", async () => {
        await i18n.changeLanguage("fr");
        const {rerender} = render(<EvaluationModal schedule={schedule} newStudentLevelQuestions={[]} />);
        expect(screen.getByText(/Veuillez aller sur la page/)).toBeInTheDocument();
        expect(screen.getByText("Gestion des évaluations")).toBeInTheDocument();
        expect(screen.getByText("Supprimer")).toBeInTheDocument();

        await i18n.changeLanguage("en");
        rerender(<EvaluationModal schedule={schedule} newStudentLevelQuestions={[]} />);
        expect(screen.getByText("Evaluation management")).toBeInTheDocument();
        expect(screen.getByText("Delete")).toBeInTheDocument();
    });
});

describe("MultiViewModal", () => {
    const availabilitySchedule = {
        start: {_date: new Date("2026-09-01T10:00:00")},
        end: {_date: new Date("2026-09-01T11:00:00")},
        raw: {},
    };
    const validatedSchedule = {
        activityInstance: {},
        activity: null,
        title: "Guitare",
        location: "Salle 1",
        teacher: {first_name: "Ada", last_name: "Lovelace"},
        start: {_date: new Date("2026-09-01T10:00:00")},
        end: {_date: new Date("2026-09-01T11:00:00")},
        raw: {},
        attendees: [],
    };

    test("availability view, both locales", async () => {
        await i18n.changeLanguage("fr");
        const {rerender} = render(<MultiViewModal schedule={availabilitySchedule} teachers={[]} onClose={() => {}} />);
        expect(screen.getByRole("heading", {name: "Détails de la disponibilité"})).toBeInTheDocument();
        expect(screen.getByText("Horaires")).toBeInTheDocument();

        await i18n.changeLanguage("en");
        rerender(<MultiViewModal schedule={availabilitySchedule} teachers={[]} onClose={() => {}} />);
        expect(screen.getByRole("heading", {name: "Availability details"})).toBeInTheDocument();
    });

    test("validated slot view, both locales", async () => {
        await i18n.changeLanguage("fr");
        const {rerender} = render(<MultiViewModal schedule={validatedSchedule} teachers={[]} onClose={() => {}} />);
        expect(screen.getByRole("heading", {name: "Détails du créneau"})).toBeInTheDocument();
        expect(screen.getByText("Salle")).toBeInTheDocument();
        expect(screen.getByText("Enseignant")).toBeInTheDocument();
        expect(screen.getByText("Fermer")).toBeInTheDocument();

        await i18n.changeLanguage("en");
        rerender(<MultiViewModal schedule={validatedSchedule} teachers={[]} onClose={() => {}} />);
        expect(screen.getByRole("heading", {name: "Slot details"})).toBeInTheDocument();
        expect(screen.getByText("Room")).toBeInTheDocument();
        expect(screen.getByText("Close")).toBeInTheDocument();
    });
});
