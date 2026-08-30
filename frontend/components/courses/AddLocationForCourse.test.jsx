// Component test for the i18n extraction on the "courses" domain lot 2 — AddLocationForCourse.
//
// Plain class component (NOT withTranslation-wrapped — it's a StepZilla step and the HOC would
// break StepZilla's isValidated() wiring); `t` is passed in as a prop, mirroring how AddCourse
// threads it down. On mount it fires two requests through tools/api
// (`api.get("/locations")` and `api.get("/rooms/index_with_overlap?...")`); global.fetch is
// stubbed so both resolve with a non-empty array — the two <InputSelect>s only mount once
// `locationOptions` / `roomsOptions` are set. The heavy `AddCourseSummary` child is mocked out
// so this file only asserts on AddLocationForCourse's own translated copy.

import React from "react";
import {render, screen, waitFor} from "@testing-library/react";
import i18n from "../../i18n";
import AddLocationForCourse from "./AddLocationForCourse";

vi.mock("./AddCourseSummary", () => ({
    default: () => <div data-testid="add-course-summary-stub" />,
}));

const okJson = body =>
    vi.fn().mockResolvedValue({
        ok: true,
        headers: {get: h => (h === "Content-type" ? "application/json" : null)},
        json: () => Promise.resolve(body),
    });

beforeEach(() => {
    // Non-empty arrays so both InputSelects (location + room) actually render.
    global.fetch = okJson([{id: 1, label: "X"}]);
});

afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
});

// `t` is a prop now — bind it to the courses namespace, tracking whatever language the test set.
// Build it *after* changeLanguage(). The constructor reads this.props.initialValues.roomId /
// .locationId, so initialValues must carry those keys (an empty {} would blow up).
const makeProps = () => ({
    t: i18n.getFixedT(i18n.language, "courses"),
    href_path: "",
    summary: {},
    onChange: () => {},
    initialValues: {
        roomId: undefined,
        locationId: undefined,
        fromDate: "",
        toDate: "",
        firstDayStartTime: "",
        firstDayEndTime: "",
        activityRefId: "",
    },
});

// Regression guard: StepZilla only wires a step's isValidated() hook when the step element is
// `instanceof Component` (react-stepzilla main.js). Wrapping this export in withTranslation()
// (a function component) makes that check fail and silently disables the step's "choose a room
// before continuing" validation. Keep it an unwrapped class.
test("is exported as a plain class extending React.Component (StepZilla ref gate)", () => {
    expect(AddLocationForCourse.prototype instanceof React.Component).toBe(true);
    expect(AddLocationForCourse.WrappedComponent).toBeUndefined();
    expect(AddLocationForCourse.prototype.isValidated).toBeTypeOf("function");
});

describe("AddLocationForCourse — i18n", () => {
    test("renders the French step name, field labels and validate button", async () => {
        await i18n.changeLanguage("fr");
        render(<AddLocationForCourse {...makeProps()} />);

        expect(await screen.findByText("Filtrer par site")).toBeInTheDocument();
        expect(screen.getByText("Choix du lieu")).toBeInTheDocument();
        expect(screen.getByText("Salle")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Valider"})).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    test("renders the English step name, field labels and validate button", async () => {
        await i18n.changeLanguage("en");
        render(<AddLocationForCourse {...makeProps()} />);

        expect(await screen.findByText("Filter by location")).toBeInTheDocument();
        expect(screen.getByText("Choose the location")).toBeInTheDocument();
        expect(screen.getByText("Room")).toBeInTheDocument();
        // common:actions.validate — EN copy is "Submit" (not "Validate"); assert the real string.
        expect(screen.getByRole("button", {name: "Submit"})).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });
});
