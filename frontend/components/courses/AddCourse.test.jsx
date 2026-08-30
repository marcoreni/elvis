// Component test for the i18n extraction on the "courses" domain lot 1 — AddCourse.
//
// AddCourse is a class component wrapped in `withTranslation("courses")`. It is the wizard
// container: it fetches `/seasons` in its constructor (through tools/api), and once a current
// season is in state it mounts a react-final-form <Form> around a <StepZilla> whose four steps
// are the AddActivityForCourse / AddSlotForCourse / AddTeacherForCourse / AddLocationForCourse
// components.
//
// The four step children are mocked (they each do their own fetches / heavy rendering); StepZilla
// and react-final-form are kept real so the wizard chrome renders. global.fetch is stubbed to
// return one current season, which flips `this.state.season` from undefined and takes the render
// past its "loading" short-circuit. We then assert the translated wizard title
// ("Ajouter un cours" / "Add a course") and the StepZilla next/prev button labels.

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../../i18n";
import AddCourse from "./AddCourse";

vi.mock("./AddActivityForCourse", () => ({default: () => <div data-testid="step-activity" />}));
vi.mock("./AddSlotForCourse", () => ({default: () => <div data-testid="step-slot" />}));
vi.mock("./AddTeacherForCourse", () => ({default: () => <div data-testid="step-teacher" />}));
vi.mock("./AddLocationForCourse", () => ({default: () => <div data-testid="step-location" />}));

const currentSeason = {
    id: 7,
    label: "2025-2026",
    is_current: true,
    start: "2025-09-01",
    end: "2026-06-30",
    // non-empty so the component's holidays alert branch (which pulls planning:* keys) stays off
    holidays: [{date: "2025-12-25"}],
};

beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {get: h => (h === "Content-type" ? "application/json" : null)},
        json: () => Promise.resolve([currentSeason]),
    });
});

afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
});

describe("AddCourse", () => {
    test("the default export is the withTranslation-wrapped AddCourse", () => {
        // Smoke check that the HOC wiring is intact even if the wizard fails to mount below.
        expect(AddCourse.WrappedComponent).toBeDefined();
        expect(AddCourse.WrappedComponent.name).toBe("AddCourse");
    });

    test("renders the French wizard title and step navigation labels", async () => {
        await i18n.changeLanguage("fr");
        render(<AddCourse href_path="" />);

        expect(await screen.findByText("Ajouter un cours")).toBeInTheDocument();
        expect(screen.getByText("Étape suivante")).toBeInTheDocument();
        expect(screen.getByText("Étape précédente")).toBeInTheDocument();
    });

    test("renders the English wizard title and step navigation labels", async () => {
        await i18n.changeLanguage("en");
        render(<AddCourse href_path="" />);

        expect(await screen.findByText("Add a course")).toBeInTheDocument();
        expect(screen.getByText("Next step")).toBeInTheDocument();
        expect(screen.getByText("Previous step")).toBeInTheDocument();
    });
});
