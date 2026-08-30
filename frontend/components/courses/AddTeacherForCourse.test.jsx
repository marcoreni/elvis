// Component test for the i18n extraction on the "courses" domain lot 2 — AddTeacherForCourse.
//
// Plain class component (NOT withTranslation-wrapped — it's a StepZilla step and the HOC would
// break StepZilla's isValidated() wiring); `t` is passed in as a prop, mirroring how AddCourse
// threads it down. On mount it fires `api.get("/teachers/index?activityId=...")` through
// tools/api; global.fetch is stubbed so it resolves. The heavy `AddCourseSummary` child is
// mocked out so this file only asserts on AddTeacherForCourse's own translated copy.
//
// Two shapes are covered:
//  - the request resolves with one teacher -> the teacher <InputSelect> label renders
//    ("Professeur" / "Teacher"), step name always shows.
//  - the request resolves with [] -> the "no teacher teaches this activity" alert renders
//    instead ("Aucun professeur n'enseigne l'activité choisie." / "No teacher teaches the
//    selected activity."), step name always shows.

import React from "react";
import {render, screen, waitFor} from "@testing-library/react";
import i18n from "../../i18n";
import AddTeacherForCourse from "./AddTeacherForCourse";

vi.mock("./AddCourseSummary", () => ({
    default: () => <div data-testid="add-course-summary-stub" />,
}));

const jsonResponse = body => ({
    ok: true,
    headers: {get: h => (h === "Content-type" ? "application/json" : null)},
    json: () => Promise.resolve(body),
});

afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
});

// `t` is a prop now — bind it to the courses namespace, tracking whatever language the test set.
// Build it *after* changeLanguage(). The constructor reads several this.props.initialValues.*
// keys, so initialValues must carry them (an empty {} would blow up).
const makeProps = () => ({
    t: i18n.getFixedT(i18n.language, "courses"),
    href_path: "",
    summary: {},
    onChange: () => {},
    initialValues: {
        teacherId: undefined,
        firstDayStartTime: "",
        firstDayEndTime: "",
        fromDate: "",
        toDate: "",
        activityRefId: "",
    },
});

// Regression guard: StepZilla only wires a step's isValidated() hook when the step element is
// `instanceof Component` (react-stepzilla main.js). Wrapping this export in withTranslation()
// (a function component) makes that check fail and silently disables the step's "choose a
// teacher before continuing" validation. Keep it an unwrapped class.
test("is exported as a plain class extending React.Component (StepZilla ref gate)", () => {
    expect(AddTeacherForCourse.prototype instanceof React.Component).toBe(true);
    expect(AddTeacherForCourse.WrappedComponent).toBeUndefined();
    expect(AddTeacherForCourse.prototype.isValidated).toBeTypeOf("function");
});

describe("AddTeacherForCourse — a teacher is available", () => {
    beforeEach(() => {
        // /teachers/index returns one teacher; the follow-up /with_overlap call returns [].
        global.fetch = vi.fn().mockImplementation(url =>
            Promise.resolve(
                jsonResponse(
                    String(url).includes("with_overlap")
                        ? []
                        : [{id: 1, first_name: "A", last_name: "B"}]
                )
            )
        );
    });

    test("renders the French step name and teacher label", async () => {
        await i18n.changeLanguage("fr");
        render(<AddTeacherForCourse {...makeProps()} />);

        expect(await screen.findByText("Professeur")).toBeInTheDocument();
        expect(screen.getByText("Choix du professeur")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    test("renders the English step name and teacher label", async () => {
        await i18n.changeLanguage("en");
        render(<AddTeacherForCourse {...makeProps()} />);

        expect(await screen.findByText("Teacher")).toBeInTheDocument();
        expect(screen.getByText("Choose the teacher")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });
});

describe("AddTeacherForCourse — no teacher teaches the activity", () => {
    beforeEach(() => {
        global.fetch = vi.fn().mockResolvedValue(jsonResponse([]));
    });

    test("renders the French empty-state alert", async () => {
        await i18n.changeLanguage("fr");
        render(<AddTeacherForCourse {...makeProps()} />);

        expect(
            await screen.findByText("Aucun professeur n'enseigne l'activité choisie.")
        ).toBeInTheDocument();
        expect(screen.getByText("Choix du professeur")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    test("renders the English empty-state alert", async () => {
        await i18n.changeLanguage("en");
        render(<AddTeacherForCourse {...makeProps()} />);

        expect(
            await screen.findByText("No teacher teaches the selected activity.")
        ).toBeInTheDocument();
        expect(screen.getByText("Choose the teacher")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });
});

// The two interpolated keys (slotBusy: 4 placeholders, availableInstead: 2) sit in render
// branches driven by hard-to-fixture date math, but a placeholder rename in the JSON fails
// silently (i18next substitutes "" for an unknown name, no throw). Guard them at the i18n layer
// against the exact args the component passes at AddTeacherForCourse.jsx render().
describe("interpolated keys resolve with the component's call-site args", () => {
    const cases = [
        ["addTeacher.slotBusy", {activity: "Piano", start: "10h00", end: "11h00", room: "Salle 1"}],
        ["addTeacher.availableInstead", {start: "14h00", end: "16h00"}],
    ];

    for (const lng of ["fr", "en"]) {
        for (const [key, args] of cases) {
            test(`${lng} · ${key}`, async () => {
                await i18n.changeLanguage(lng);
                const t = i18n.getFixedT(lng, "courses");
                const out = t(key, args);

                expect(out).not.toMatch(/\{\{|\}\}/); // no unfilled placeholder
                expect(out).not.toBe(key); // key actually resolved
                for (const v of Object.values(args)) {
                    expect(out).toContain(v); // every supplied value landed
                }
            });
        }
    }
});
