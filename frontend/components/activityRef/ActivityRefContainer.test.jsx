// i18n extraction tests for ActivityRefContainer (i18n-06 "activities" domain, lot 2a).
//
// ActivityRefContainer is a class component wrapped in `withTranslation("activities")`. Its
// render threads `t` into a `TabbedComponent`: the four tab headers come from
// `activityRef.container.tabs.*` and the two footer buttons from the `common` namespace
// (`common:actions.cancel` / `common:actions.validate`). This file mounts the real container
// (all four heavy tab bodies stubbed out, sweetalert2 stubbed) and asserts the translated tab
// headers + button labels in fr and en, so a regression in the extracted keys fails here.
//
// TabbedComponent renders every tab *header* but only the active tab's *body*, so the assertions
// target the headers (rendered as the text node inside each `<a>`; DOM Testing Library's
// getNodeText only joins direct text children, so the trailing status <i> icon does not
// interfere with an exact getByText match).
//
// Language switching follows the established pattern: drive the frontend/i18n singleton with
// i18n.changeLanguage(...), no <I18nextProvider> needed for a withTranslation() class.

import React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import i18n from "../../i18n";
import ActivityRefContainer from "./ActivityRefContainer";

// Mock ALL FOUR tab bodies — they each pull in react-final-form fields, selects, upload widgets
// and mount-time fetches that are irrelevant to the header/button copy under test.
vi.mock("./ActivityRefBasics", () => ({default: () => null}));
vi.mock("./ActivityRefApplication", () => ({default: () => null}));
vi.mock("./WorkGroupTemplateEditor", () => ({default: () => null}));
vi.mock("sweetalert2", () => ({default: vi.fn()}));

// ActivityRefTeachers itself is mocked (it pulls in its own selects/fields, irrelevant to what's
// under test), but its props are stashed so a test can reach `mutators` -- react-final-form's
// `form.mutators`, threaded here straight from the <Form> render prop -- and drive a real
// `values.teachers` change through the actual form, the same way a user adding/removing a teacher
// via ActivityRefTeachers would. It only mounts once the Teachers tab (not the default-active one)
// is selected -- TabbedComponent renders only the active tab's body -- so a test needs to click
// its header first.
let lastTeachersProps = null;
vi.mock("./ActivityRefTeachers", () => ({
    default: props => {
        lastTeachersProps = props;
        return null;
    },
}));

const props = {
    activityRef: {
        id: 1,
        substitutable: false,
        allows_timeslot_selection: null,
        color_code: "#fff",
        has_additional_student: false,
        is_lesson: false,
        is_visible_to_admin: false,
        is_unpopular: false,
        is_evaluable: false,
    },
    teachers: [],
    activityInstruments: [],
    nextCycles: [],
    activityTypes: [],
    activityRefKinds: [],
    activityRefImage: null,
    seasons: [],
    activityRefs: [],
    instruments: [],
    postTo: "update",
};

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("ActivityRefContainer", () => {
    test("it is wrapped in withTranslation()", () => {
        expect(ActivityRefContainer.WrappedComponent).toBeDefined();
    });

    test("renders the four French tab headers and footer buttons by default", async () => {
        await i18n.changeLanguage("fr");
        render(<ActivityRefContainer {...props} />);

        expect(screen.getByText("Activité")).toBeInTheDocument();
        expect(screen.getByText("Inscription")).toBeInTheDocument();
        expect(screen.getByText("Atelier")).toBeInTheDocument();
        expect(screen.getByText("Professeurs")).toBeInTheDocument();

        expect(screen.getByRole("button", {name: "Annuler"})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Valider"})).toBeInTheDocument();
    });

    test("renders the four English tab headers and footer buttons when language is en", async () => {
        await i18n.changeLanguage("en");
        render(<ActivityRefContainer {...props} />);

        expect(screen.getByText("Activity")).toBeInTheDocument();
        expect(screen.getByText("Registration")).toBeInTheDocument();
        expect(screen.getByText("Workshop")).toBeInTheDocument();
        expect(screen.getByText("Teachers")).toBeInTheDocument();

        expect(screen.getByRole("button", {name: "Cancel"})).toBeInTheDocument();
        // The real en value of common:actions.validate in frontend/locales/en/common.json.
        expect(screen.getByRole("button", {name: "Submit"})).toBeInTheDocument();
    });
});

// i18n-layer resolution check (no component): the three onValidate error fragments threaded
// through `t(...)` in ActivityRefContainer#onValidate. Assert each resolves in fr + en to a
// non-empty string that is not the key itself and carries no leftover interpolation braces.
describe("activities:activityRef.container.errors.* resolution", () => {
    const keys = [
        "activityRef.container.errors.hardLimitTooLow",
        "activityRef.container.errors.toAgeTooLow",
        "activityRef.container.errors.required",
    ];

    for (const lng of ["fr", "en"]) {
        for (const key of keys) {
            test(`${lng}: ${key} resolves`, async () => {
                await i18n.changeLanguage(lng);
                const value = i18n.t(`activities:${key}`);
                expect(value).toBeTruthy();
                expect(value).not.toBe(key);
                expect(value).not.toBe(`activities:${key}`);
                expect(value).not.toMatch(/\{\{/);
            });
        }
    }
});

// Regression for the "one-way side-channel" bug: the Teachers tab's error indicator used to be
// this.teachersError, a plain instance field set by onValidate() when the teachers list was empty
// but never cleared once it wasn't -- so the tab's error icon/tooltip stayed tripped for the
// component's life even after a teacher was added. Fixed by deriving isInError directly from
// `values.teachers` in render() (the data react-final-form's <Form> render prop already provides),
// rather than tracking it as separate state: onValidate() can run inside React's render phase
// (final-form validates synchronously while constructing the form, before mount), so setState()
// there would be an update to a *different* component mid-render.
describe("ActivityRefContainer — Teachers tab isInError follows values.teachers", () => {
    // Real <Form>/<TabbedComponent>, real mutators -- the same path a user adding/removing a
    // teacher via ActivityRefTeachers takes, not a manually-invoked onValidate(). ActivityRefTeachers
    // only mounts once its tab is made active (TabbedComponent renders only the active tab's
    // body), so each test clicks the "Professeurs" header first.
    const activateTeachersTab = () => fireEvent.click(screen.getByText("Professeurs"));
    const teachersTabItem = () => screen.getByText("Professeurs").closest("li");

    test("tab starts in error when the fixture has no teachers, and clears once one is added", async () => {
        await i18n.changeLanguage("fr");
        render(<ActivityRefContainer {...props} />);

        expect(teachersTabItem()).toHaveAttribute("title", "Cet onglet n'est pas complètement rempli");

        act(() => activateTeachersTab());
        expect(lastTeachersProps).not.toBeNull();

        act(() => {
            lastTeachersProps.mutators.push("teachers", 42);
        });
        expect(teachersTabItem()).not.toHaveAttribute("title");

        // And removing it again re-trips the error -- not just a one-time clear, the actual bug.
        act(() => {
            lastTeachersProps.mutators.remove("teachers", 0);
        });
        expect(teachersTabItem()).toHaveAttribute("title", "Cet onglet n'est pas complètement rempli");
    });
});
