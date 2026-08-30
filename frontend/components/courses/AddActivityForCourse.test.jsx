// Component test for the i18n extraction on the "courses" domain lot 1 — AddActivityForCourse.
//
// Class component wrapped in `withTranslation("courses")`. On mount it fires two requests through
// tools/api (`api.get("/activity_ref_kinds")` and `api.get("/activity_ref")`); global.fetch is
// stubbed so both resolve. The heavy `AddCourseSummary` child is mocked out so this file only
// asserts on AddActivityForCourse's own translated copy.
//
// Two shapes are covered:
//  - fetches resolve with empty arrays -> the two <InputSelect> labels render
//    ("Filtrer par famille d'activité" + "Activité"), step name always shows.
//  - fetches fail -> the "Pas encore d'activité renseignée ?" / "Créer une activité" fallback
//    branch renders instead.

import React from "react";
import {render, screen, waitFor} from "@testing-library/react";
import i18n from "../../i18n";
import AddActivityForCourse from "./AddActivityForCourse";

vi.mock("./AddCourseSummary", () => ({
    default: () => <div data-testid="add-course-summary-stub" />,
}));

const okJson = body =>
    vi.fn().mockResolvedValue({
        ok: true,
        headers: {get: h => (h === "Content-type" ? "application/json" : null)},
        json: () => Promise.resolve(body),
    });

afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
});

const props = {href_path: "", summary: {}, onChange: () => {}};

describe("AddActivityForCourse — activities available", () => {
    beforeEach(() => {
        global.fetch = okJson([]);
    });

    test("renders the French step name and field labels", async () => {
        await i18n.changeLanguage("fr");
        render(<AddActivityForCourse {...props} />);

        expect(await screen.findByText("Filtrer par famille d'activité")).toBeInTheDocument();
        expect(screen.getByText("Choix de l'activité")).toBeInTheDocument();
        expect(screen.getByText("Activité")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    test("renders the English step name and field labels", async () => {
        await i18n.changeLanguage("en");
        render(<AddActivityForCourse {...props} />);

        expect(await screen.findByText("Filter by activity family")).toBeInTheDocument();
        expect(screen.getByText("Choose the activity")).toBeInTheDocument();
        expect(screen.getByText("Activity")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });
});

describe("AddActivityForCourse — no activity yet (fetch fails)", () => {
    beforeEach(() => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            headers: {get: () => null},
            json: () => Promise.resolve({errors: ["boom"]}),
        });
    });

    test("renders the French empty-state prompt and CTA", async () => {
        await i18n.changeLanguage("fr");
        render(<AddActivityForCourse {...props} />);

        expect(await screen.findByText("Pas encore d'activité renseignée ?")).toBeInTheDocument();
        expect(screen.getByText("Choix de l'activité")).toBeInTheDocument();
        expect(screen.getByText("Créer une activité")).toBeInTheDocument();
    });

    test("renders the English empty-state prompt and CTA", async () => {
        await i18n.changeLanguage("en");
        render(<AddActivityForCourse {...props} />);

        expect(await screen.findByText("No activity added yet?")).toBeInTheDocument();
        expect(screen.getByText("Choose the activity")).toBeInTheDocument();
        expect(screen.getByText("Create an activity")).toBeInTheDocument();
    });
});
