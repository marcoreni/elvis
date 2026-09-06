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

// Domain bilingual smoke test for the `planning` area (Phase 07 P0 checkpoint strategy —
// docs/I18n-Roadmap.md §P0). The per-leaf-component "renders the fr / renders the en" pairs that
// phases 05-06 accumulated across the planning modals have been collapsed; this container render
// (holidays alert + filter bar + a data-tippy-content tooltip) is the single locale checkpoint
// for the area's chrome.
const REPRESENTATIVE = {
    fr: {
        alert: /les vacances scolaires n'ont pas été importées/,
        manage: "Gérer dès maintenant les dates de vacances de votre école.",
        tooltip: "Réinitialiser les filtres",
        // RESTORED BY CODE REVIEW: the h3 is a multi-node run — {t("otherRooms")} then " à
        // afficher (…)" — so this regex is the only assertion that the adjacent nodes still
        // concatenate with the whitespace between them (load-bearing whitespace, which the
        // prune's own policy says to keep).
        otherRooms: /Autres salles\s+à afficher/,
    },
    en: {
        alert: /school holidays have not been imported/,
        manage: "Manage your school's holiday dates now.",
        tooltip: "Reset filters",
        otherRooms: /Other rooms\s+to display/,
    },
};

describe.each(["fr", "en"])("planning area — bilingual smoke (%s)", lng => {
    test("renders Planning chrome with real translated copy, no missing-key markers", async () => {
        await i18n.changeLanguage(lng);
        render(<Planning {...props} />);

        expect(screen.getByText(REPRESENTATIVE[lng].alert)).toBeInTheDocument();
        expect(screen.getByText(REPRESENTATIVE[lng].manage)).toBeInTheDocument();
        expect(
            document.querySelector(`[data-tippy-content="${REPRESENTATIVE[lng].tooltip}"]`)
        ).toBeTruthy();
        expect(
            screen.getByRole("heading", { name: REPRESENTATIVE[lng].otherRooms })
        ).toBeInTheDocument();
        expect(document.body.textContent).not.toMatch(/translation missing/i);
    });
});
