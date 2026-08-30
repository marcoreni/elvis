// Component test for the i18n extraction on the "courses" domain lot 3 — DeleteCourseModal.
//
// Unlike the AddXForCourse StepZilla steps, this component IS withTranslation("courses")-wrapped:
// `render` gets `t` from the HOC, so no `t` prop is threaded — render it directly and drive
// language through the i18n singleton (no <I18nextProvider> needed, the initReactI18next wiring
// covers it). On mount it fires `api.get("/activity_time_intervals?activity_id=...")` through
// tools/api; global.fetch is stubbed to resolve with []. The constructor calls
// TimeIntervalHelpers.getSeasonFromDate(this.props.startTime.toDate(), this.props.seasons) when
// props.activity is truthy, so activity / startTime / seasons must be real. The YearlyCalendar
// child only mounts when state.selected == "select" (initially undefined), but it's mocked out
// to be safe.

import React from "react";
import {render, screen, waitFor, fireEvent} from "@testing-library/react";
import moment from "moment";
import i18n from "../../i18n";
import swal from "sweetalert2";
import DeleteCourseModal from "./DeleteCourseModal";

vi.mock("../planning/YearlyCalendar", () => ({
    default: () => <div data-testid="yearly-calendar-stub" />,
}));

vi.mock("sweetalert2", () => ({default: {fire: vi.fn()}}));

const okJson = body =>
    vi.fn().mockResolvedValue({
        ok: true,
        headers: {get: h => (h === "Content-type" ? "application/json" : null)},
        json: () => Promise.resolve(body),
    });

beforeEach(() => {
    global.fetch = okJson([]);
});

afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
});

const makeProps = () => ({
    activity: {id: 1},
    startTime: moment("2025-09-01T08:00"),
    seasons: [],
    onSubmit: () => {},
    onClose: () => {},
});

// Opposite of the StepZilla-step guard: this component IS wrapped, so react-i18next exposes the
// inner class as `.WrappedComponent`. If the HOC is ever dropped the render() call to `t` from
// props would break — keep it wrapped.
test("is exported as a withTranslation-wrapped component (.WrappedComponent is defined)", () => {
    expect(DeleteCourseModal.WrappedComponent).toBeDefined();
    expect(
        DeleteCourseModal.WrappedComponent.prototype instanceof React.Component
    ).toBe(true);
});

describe("DeleteCourseModal — i18n", () => {
    test("renders the French title, prompt, options and action buttons", async () => {
        await i18n.changeLanguage("fr");
        render(<DeleteCourseModal {...makeProps()} />);

        expect(
            screen.getByRole("heading", {name: "Supprimer un cours"})
        ).toBeInTheDocument();
        expect(screen.getByText("Souhaitez-vous:")).toBeInTheDocument();
        expect(
            screen.getByText("Supprimer toutes les récurrences de ce cours.")
        ).toBeInTheDocument();
        expect(
            screen.getByText("Sélectionner les récurrences à supprimer.")
        ).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Annuler"})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Valider"})).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    test("renders the English title, prompt, options and action buttons", async () => {
        await i18n.changeLanguage("en");
        render(<DeleteCourseModal {...makeProps()} />);

        expect(
            screen.getByRole("heading", {name: "Delete a course"})
        ).toBeInTheDocument();
        expect(screen.getByText("Would you like to:")).toBeInTheDocument();
        expect(
            screen.getByText("Delete all recurrences of this course.")
        ).toBeInTheDocument();
        expect(
            screen.getByText("Select the recurrences to delete.")
        ).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Cancel"})).toBeInTheDocument();
        // common:actions.validate — EN copy is "Submit" (not "Validate"); assert the real string.
        expect(screen.getByRole("button", {name: "Submit"})).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    // The onSubmit handler is a closure inside render(), and its three swal.fire branches are the
    // only place `t` is used outside plain JSX. Guard the "all recurrences, nothing deletable"
    // branch: with the mount fetch resolving [], activityInstances === [], so repetition:"all"
    // yields instanceIds.length === 0 and must swal the translated "noneDeletable" text — not
    // throw (which is what a future hoist of this closure to a class method would cause).
    test("submitting 'delete all' with nothing deletable swals the translated warning", async () => {
        await i18n.changeLanguage("fr");
        render(<DeleteCourseModal {...makeProps()} />);
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());

        fireEvent.click(
            screen.getByText("Supprimer toutes les récurrences de ce cours.")
        );
        fireEvent.click(screen.getByRole("button", {name: "Valider"}));

        await waitFor(() => expect(swal.fire).toHaveBeenCalled());
        expect(swal.fire).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "Attention",
                text: "Aucun cours ne peut être supprimé.",
            })
        );
    });
});
