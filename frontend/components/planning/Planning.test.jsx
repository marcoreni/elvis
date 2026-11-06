// Component test for the i18n extraction on Planning.jsx (branch
// feature/i18n-06-extract-planning-container — planning lot 4). Planning is a
// withTranslation("planning") container; all extracted copy lives in its own methods / render
// (toasts, the holidays alert, the filter bar, modal contentLabels), so no prop-threading.
//
// CustomCalendar (mounts FullCalendar — DOM measurement that doesn't run in jsdom) and the
// 2000-line ActivityDetailsModal (a later lot) are stubbed. `generic` is passed so
// componentDidMount skips its network fetch.

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import i18n from "../../i18n";

vi.mock("./Calendar", () => ({
    default: () => <div data-testid="calendar-stub" />,
}));
vi.mock("./ActivityDetailsModal", () => ({
    default: () => <div data-testid="adm-stub" />,
}));

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
    delete global.fetch;
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

describe.each(["fr", "en"])("planning area — bilingual smoke (%s)", (lng) => {
    test("renders Planning chrome with real translated copy, no missing-key markers", async () => {
        await i18n.changeLanguage(lng);
        render(<Planning {...props} />);

        expect(screen.getByText(REPRESENTATIVE[lng].alert)).toBeInTheDocument();
        expect(
            screen.getByText(REPRESENTATIVE[lng].manage)
        ).toBeInTheDocument();
        expect(
            document.querySelector(
                `[data-tippy-content="${REPRESENTATIVE[lng].tooltip}"]`
            )
        ).toBeTruthy();
        expect(
            screen.getByRole("heading", {
                name: REPRESENTATIVE[lng].otherRooms,
            })
        ).toBeInTheDocument();
        expect(document.body.textContent).not.toMatch(/translation missing/i);
    });
});

// Regression: handleRemoveStudent/handleRemoveOptionalStudent's DELETE response handler used to
// read an undeclared `int` (a leftover from a commented-out `TimeIntervalHelpers.momentify` call)
// instead of the `interval` it just computed, throwing `ReferenceError: int is not defined` on
// every call before the matching entry in `selectedIntervals` was ever updated.
//
// Code review caught that the first fix attempt (`interval.activity = activity`) just swapped one
// crash for another: the DELETE responses these handlers actually receive don't carry a usable
// `time_interval`.
// - `ActivityController#remove_student`'s response is
//   `{ activity: Utils.format_for_suggestion(...), status, status_updated_at, referent }` -- the
//   top-level body has no `time_interval` key at all (it's nested one level deeper, inside
//   `.activity.time_interval`, and even that doesn't carry `activity_instance`).
// - `ActivityController#remove_student_option`'s response is a serialized `DesiredActivity`
//   (`render json: desired_activity, include: { options: {...} }`) -- `desired_activities` has no
//   `time_interval` column at all (checked db/schema.rb).
// The real fix (mirroring handleOpenDetail/handleUpdateActivityInstance's own established pattern
// elsewhere in this file) is to re-fetch the real, current interval via
// `TimeIntervalHelpers.fetchInterval` after the DELETE settles, rather than trying to extract
// interval data from either response -- which means both handlers now need the interval's id,
// threaded through as a 3rd argument from ActivityDetailsModal (`this.props.interval.id` there,
// same prop verifyTimeOverlap() was fixed to read instead of the never-passed `this.props.id`,
// see docs/KnownIssues.md history and ActivityDetailsModal.test.jsx).
//
// Both handlers are normally invoked by ActivityDetailsModal, but that's only mounted once
// `isDetailModalOpen` is true (it lives inside a react-modal `<Modal>`, which doesn't render its
// children at all while closed) -- reaching it through the UI would mean also driving
// `handleOpenDetail`'s own fetch. Simpler and just as faithful to call the handlers directly on
// the real class instance, grabbed via `Planning.WrappedComponent` (react-i18next's
// `withTranslation` HOC exposes the wrapped, un-decorated class under that static, same as the
// `withTranslation()` HOC check elsewhere in this repo's tests) rendered with a ref and a real `t`.
describe("Planning — remove-student handlers don't throw ReferenceError (regression)", () => {
    const RawPlanningComponent = Planning.WrappedComponent;

    function renderRaw(extraProps) {
        const ref = React.createRef();
        render(
            <RawPlanningComponent
                {...props}
                {...extraProps}
                t={i18n.getFixedT("fr", "planning")}
                ref={ref}
            />
        );
        return ref;
    }

    // Shape TimeIntervalController#details/`TimeIntervalHelpers.fetchInterval`'s `GET
    // /time_interval/:id` actually returns (see app/controllers/time_interval_controller.rb) --
    // the same shape handleOpenDetail already splices into selectedIntervals elsewhere in this
    // file, so it's known-safe for every selectedIntervals consumer (formatIntervalsForSchedule,
    // RawPlanning, Calendar.tsx).
    function makeFetchedInterval(id) {
        return {
            id,
            start: "2024-01-01T10:00:00.000Z",
            end: "2024-01-01T11:00:00.000Z",
            kind: "c",
            is_validated: true,
            comment: null,
            activity_instance: null,
        };
    }

    test("handleRemoveStudent re-fetches and replaces the matching interval instead of crashing", async () => {
        const interval = {
            id: 42,
            start: "2024-01-01T10:00:00.000Z",
            end: "2024-01-01T11:00:00.000Z",
        };

        // Realistic ActivityController#remove_student response -- a `format_for_suggestion`
        // result wrapped in a `{ activity, status, status_updated_at, referent }` envelope, no
        // usable `time_interval` anywhere the old code looked for one.
        const removeStudentResponse = {
            activity: { id: 7, label: "Piano" },
            status: "En attente de traitement",
            status_updated_at: "2024-01-01T09:00:00.000Z",
            referent: null,
        };
        const fetchedInterval = makeFetchedInterval(42);

        global.fetch = vi.fn((url) => {
            const u = String(url);
            if (u === "/activity/7/desired/501") {
                return Promise.resolve({
                    json: () => Promise.resolve(removeStudentResponse),
                });
            }
            if (u === "/time_interval/42") {
                return Promise.resolve({
                    json: () => Promise.resolve(fetchedInterval),
                });
            }
            return Promise.reject(new Error(`unexpected fetch: ${u}`));
        });

        const ref = renderRaw({ intervals: [interval] });

        const student = {
            activity_application: {
                desired_activities: [{ id: 501, activity_id: 7 }],
            },
        };

        // Before either fix, the fetch's `.then()` callback threw synchronously here (first
        // `ReferenceError: int is not defined`, then, after the first fix attempt,
        // `TypeError: Cannot set properties of undefined` reading `activity.time_interval`), so
        // `selectedIntervals` was never updated.
        act(() => {
            ref.current.handleRemoveStudent({ id: 7 }, student, 42);
        });

        await waitFor(() =>
            expect(global.fetch).toHaveBeenCalledWith(
                "/activity/7/desired/501",
                expect.objectContaining({ method: "DELETE" })
            )
        );
        await waitFor(() =>
            expect(global.fetch).toHaveBeenCalledWith(
                "/time_interval/42",
                expect.anything()
            )
        );

        await waitFor(() => {
            const updated = ref.current.state.selectedIntervals.find(
                (i) => i.id === 42
            );
            expect(updated).toEqual(fetchedInterval);
        });

        // Regression: intervalStore (what ActivityDetailsModal's `interval` prop actually reads,
        // via state.intervalStore[state.intervalDetail]) must be rebuilt alongside
        // selectedIntervals, not left stale from before the fetch.
        expect(ref.current.state.intervalStore[42]).toEqual(
            ref.current.state.selectedIntervals.find((i) => i.id === 42)
        );
        expect(ref.current.state.intervalStore[42]).toEqual(fetchedInterval);
    });

    test("handleRemoveOptionalStudent re-fetches and replaces the matching interval the same way", async () => {
        const interval = {
            id: 43,
            start: "2024-01-01T10:00:00.000Z",
            end: "2024-01-01T11:00:00.000Z",
        };

        // Realistic ActivityController#remove_student_option response -- a serialized
        // `DesiredActivity`, which has no `time_interval` column at all.
        const removeStudentOptionResponse = {
            id: 501,
            activity_ref_id: 12,
            activity_id: 8,
            options: [],
        };
        const fetchedInterval = makeFetchedInterval(43);

        global.fetch = vi.fn((url) => {
            const u = String(url);
            if (u === "/activity/8/desired_option/777") {
                return Promise.resolve({
                    json: () => Promise.resolve(removeStudentOptionResponse),
                });
            }
            if (u === "/time_interval/43") {
                return Promise.resolve({
                    json: () => Promise.resolve(fetchedInterval),
                });
            }
            return Promise.reject(new Error(`unexpected fetch: ${u}`));
        });

        const ref = renderRaw({ intervals: [interval] });

        const optionalStudent = { desired_activity_id: 777 };

        act(() => {
            ref.current.handleRemoveOptionalStudent(
                { id: 8 },
                optionalStudent,
                43
            );
        });

        await waitFor(() =>
            expect(global.fetch).toHaveBeenCalledWith(
                "/activity/8/desired_option/777",
                expect.objectContaining({ method: "DELETE" })
            )
        );
        await waitFor(() =>
            expect(global.fetch).toHaveBeenCalledWith(
                "/time_interval/43",
                expect.anything()
            )
        );

        await waitFor(() => {
            const updated = ref.current.state.selectedIntervals.find(
                (i) => i.id === 43
            );
            expect(updated).toEqual(fetchedInterval);
        });

        // Regression: same intervalStore/selectedIntervals sync check as above, for the optional-
        // student removal path.
        expect(ref.current.state.intervalStore[43]).toEqual(
            ref.current.state.selectedIntervals.find((i) => i.id === 43)
        );
        expect(ref.current.state.intervalStore[43]).toEqual(fetchedInterval);
    });
});
