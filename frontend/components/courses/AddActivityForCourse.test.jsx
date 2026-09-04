// Component test for the i18n extraction on the "courses" domain lot 1 — AddActivityForCourse.
//
// Plain class component (NOT withTranslation-wrapped — it's a StepZilla step and the HOC would
// break StepZilla's isValidated() wiring); `t` is passed in as a prop, mirroring how AddCourse
// threads it down. On mount it fires two requests through tools/api
// (`api.get("/activity_ref_kinds")` and `api.get("/activity_ref")`); global.fetch is stubbed so
// both resolve. The heavy `AddCourseSummary` child is mocked out so this file only asserts on
// AddActivityForCourse's own translated copy.
//
// Two shapes are covered:
//  - fetches resolve with empty arrays -> the two <InputSelect> labels render
//    ("Filtrer par famille d'activité" + "Activité"), step name always shows.
//  - fetches fail -> the "Pas encore d'activité renseignée ?" / "Créer une activité" fallback
//    branch renders instead.

import React from "react";
import {render, screen, waitFor} from "@testing-library/react";
import {toast} from "react-toastify";
import i18n from "../../i18n";
import AddActivityForCourse from "./AddActivityForCourse";

vi.mock("./AddCourseSummary", () => ({
    default: () => <div data-testid="add-course-summary-stub" />,
}));

vi.mock("react-toastify", () => ({
    toast: Object.assign(vi.fn(), {error: vi.fn()}),
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

// `t` is a prop now — bind it to the courses namespace, tracking whatever language the test set.
const makeProps = () => ({
    t: i18n.getFixedT(i18n.language, "courses"),
    href_path: "",
    summary: {},
    onChange: () => {},
});

// Regression guard for the review finding: StepZilla only wires a step's isValidated() hook when
// the step element is `instanceof Component` (react-stepzilla main.js). Wrapping this export in
// withTranslation() (a function component) makes that check fail and silently disables the
// step's "choose an activity before continuing" validation. Keep it an unwrapped class.
test("is exported as a plain class extending React.Component (StepZilla ref gate)", () => {
    expect(AddActivityForCourse.prototype instanceof React.Component).toBe(true);
    expect(AddActivityForCourse.WrappedComponent).toBeUndefined();
    expect(AddActivityForCourse.prototype.isValidated).toBeTypeOf("function");
});

describe("AddActivityForCourse — activities available", () => {
    beforeEach(() => {
        global.fetch = okJson([]);
    });

    test("renders the French step name and field labels", async () => {
        await i18n.changeLanguage("fr");
        render(<AddActivityForCourse {...makeProps()} />);

        expect(await screen.findByText("Filtrer par famille d'activité")).toBeInTheDocument();
        expect(screen.getByText("Choix de l'activité")).toBeInTheDocument();
        expect(screen.getByText("Activité")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    test("renders the English step name and field labels", async () => {
        await i18n.changeLanguage("en");
        render(<AddActivityForCourse {...makeProps()} />);

        expect(await screen.findByText("Filter by activity family")).toBeInTheDocument();
        expect(screen.getByText("Choose the activity")).toBeInTheDocument();
        expect(screen.getByText("Activity")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });
});

describe("AddActivityForCourse — isValidated() toasts the localized MESSAGES.err_must_choose_activity", () => {
    // Direct `MESSAGES.err_must_choose_activity` toast call (constants-i18n lot 2). fetch resolves
    // with an empty activity list, so `state.activityRefId` stays unset and isValidated() takes
    // its failing branch.
    beforeEach(() => {
        global.fetch = okJson([]);
    });

    test("French: toasts the French copy when no activity is chosen", async () => {
        await i18n.changeLanguage("fr");
        const ref = React.createRef();
        render(<AddActivityForCourse ref={ref} {...makeProps()} />);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        expect(ref.current.isValidated()).toBe(false);
        expect(toast.error).toHaveBeenCalledWith(
            "Veuillez choisir une activité avant de continuer.",
            {autoClose: 3000}
        );
    });

    test("English: toasts the English copy when no activity is chosen", async () => {
        await i18n.changeLanguage("en");
        const ref = React.createRef();
        render(<AddActivityForCourse ref={ref} {...makeProps()} />);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        expect(ref.current.isValidated()).toBe(false);
        expect(toast.error).toHaveBeenCalledWith(
            "Please choose an activity before continuing.",
            {autoClose: 3000}
        );
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
        render(<AddActivityForCourse {...makeProps()} />);

        expect(await screen.findByText("Pas encore d'activité renseignée ?")).toBeInTheDocument();
        expect(screen.getByText("Choix de l'activité")).toBeInTheDocument();
        expect(screen.getByText("Créer une activité")).toBeInTheDocument();
    });

    test("renders the English empty-state prompt and CTA", async () => {
        await i18n.changeLanguage("en");
        render(<AddActivityForCourse {...makeProps()} />);

        expect(await screen.findByText("No activity added yet?")).toBeInTheDocument();
        expect(screen.getByText("Choose the activity")).toBeInTheDocument();
        expect(screen.getByText("Create an activity")).toBeInTheDocument();
    });
});
