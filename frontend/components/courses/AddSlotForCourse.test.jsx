// Component test for the i18n extraction on the "courses" domain lot 3 — AddSlotForCourse.
//
// Plain class component (NOT withTranslation-wrapped — it's a StepZilla wizard step and the HOC
// would break StepZilla's isValidated() wiring); `t` is passed in as a prop, mirroring how
// AddCourse threads it down. On mount it fires `api.get("/seasons")` through tools/api;
// global.fetch is stubbed so it resolves with an empty array. render() reads
// `this.state.startTime.format(...)` / `.endTime.format(...)` and the constructor copies several
// `this.props.initialValues.*` keys, so initialValues must carry real moment objects and the
// date strings. `dayOfWeek` is left undefined so the componentDidMount radio-button DOM poke is
// skipped. The heavy `AddCourseSummary` child is mocked out so this file only asserts on
// AddSlotForCourse's own translated copy.

import React from "react";
import {render, screen, waitFor} from "@testing-library/react";
import moment from "moment";
import i18n from "../../i18n";
import AddSlotForCourse from "./AddSlotForCourse";

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
    // /seasons resolves with [] — enough for componentDidMount to run without error; the season
    // <InputSelect> renders against an empty option list.
    global.fetch = okJson([]);
});

afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
});

// `t` is a prop now — bind it to the courses namespace, tracking whatever language the test set.
// Build it *after* changeLanguage(). initialValues must carry real moment objects: render() and
// processFirstDay() both call moment methods on startTime / endTime, and an empty {} would throw.
const makeProps = () => ({
    t: i18n.getFixedT(i18n.language, "courses"),
    href_path: "",
    summary: {},
    onChange: () => {},
    initialValues: {
        seasonId: undefined,
        startTime: moment("2025-09-01T08:00"),
        endTime: moment("2025-09-01T09:00"),
        dayOfWeek: undefined,
        fromDate: "2025-09-01",
        toDate: "2026-06-30",
    },
});

// Regression guard: StepZilla only wires a step's isValidated() hook when the step element is
// `instanceof Component` (react-stepzilla main.js). Wrapping this export in withTranslation()
// (a function component) makes that check fail and silently disables the step's "choose a slot
// before continuing" validation. Keep it an unwrapped class.
test("is exported as a plain class extending React.Component (StepZilla ref gate)", () => {
    expect(AddSlotForCourse.prototype instanceof React.Component).toBe(true);
    expect(AddSlotForCourse.WrappedComponent).toBeUndefined();
    expect(AddSlotForCourse.prototype.isValidated).toBeTypeOf("function");
});

describe("AddSlotForCourse — i18n", () => {
    test("renders the French title, field labels, a weekday and the recurrence info", async () => {
        await i18n.changeLanguage("fr");
        render(<AddSlotForCourse {...makeProps()} />);

        expect(screen.getByText("Choix d'un créneau")).toBeInTheDocument();
        expect(screen.getByText("Jour")).toBeInTheDocument();
        expect(screen.getByText("Horaire")).toBeInTheDocument();
        expect(screen.getByText("Lundi")).toBeInTheDocument();
        expect(
            screen.getByText(
                "Votre cours va être créé avec une récurrence hebdomadaire (hors vacances scolaires)"
            )
        ).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    test("renders the English title, field labels, a weekday and the recurrence info", async () => {
        await i18n.changeLanguage("en");
        render(<AddSlotForCourse {...makeProps()} />);

        expect(screen.getByText("Choose a slot")).toBeInTheDocument();
        expect(screen.getByText("Day")).toBeInTheDocument();
        expect(screen.getByText("Schedule")).toBeInTheDocument();
        expect(screen.getByText("Monday")).toBeInTheDocument();
        expect(
            screen.getByText(
                "Your course will be created with a weekly recurrence (excluding school holidays)"
            )
        ).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });
});
