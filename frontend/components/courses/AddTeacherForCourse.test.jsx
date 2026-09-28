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
// `instanceof Component` (see StepZilla.tsx). Wrapping this export in withTranslation()
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

    // Regression: the "add teacher" + button used to be built as `${href_path}/users/new`, where
    // href_path is a server-computed absolute URL that can point at the wrong host/port for the
    // current environment (observed as a stale "http://127.0.0.1:3000" in dev). A deliberately
    // hostile href_path proves the link is now always a plain relative path, matching the
    // window.open("/inscriptions/...") convention used elsewhere in the app.
    test("the 'add teacher' + button is a relative link, not the server-supplied href_path", async () => {
        const {container} = render(
            <AddTeacherForCourse
                {...makeProps()}
                href_path="http://127.0.0.1:3000"
            />
        );
        await screen.findByText("Professeur");

        const plusLink = container.querySelector("a.fa-plus-circle");
        expect(plusLink).not.toBeNull();
        expect(plusLink.getAttribute("href")).toBe("/users/new");
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

// Regression coverage for the /teachers/:id/with_overlap success branch: the backend
// (TeachersController#show_with_overlap) always returns a single teacher object, never an array,
// so `data.id`/`data.last_name`/`data.first_name` must land in state/summary unconditionally.
// (The handler used to gate this on `if (data.length != 0)`, a dead check against a single
// object's always-undefined `.length` -- removing it doesn't change behavior, since that guard was
// always truthy, but this exercises the branch none of the other tests here reach.)
describe("AddTeacherForCourse — /with_overlap resolves with overlap data for the auto-selected teacher", () => {
    test("applies the overlap response's teacher onto state and summary", async () => {
        const onChange = vi.fn();
        global.fetch = vi.fn().mockImplementation((url) =>
            Promise.resolve(
                jsonResponse(
                    String(url).includes("with_overlap")
                        ? {
                              id: 1,
                              first_name: "Over",
                              last_name: "Lap",
                              has_overlap: true,
                          }
                        : [{ id: 1, first_name: "A", last_name: "B" }]
                )
            )
        );

        render(<AddTeacherForCourse {...makeProps()} onChange={onChange} />);

        await waitFor(() => {
            const lastCall = onChange.mock.calls.at(-1);
            expect(lastCall).toBeDefined();
            expect(lastCall[0].teacher.last_name).toBe("Lap");
            expect(lastCall[0].teacher.first_name).toBe("Over");
            expect(lastCall[0].summary.teacher.last_name).toBe("Lap");
        });
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
