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
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
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
// `instanceof Component` (see StepZilla.tsx). Wrapping this export in withTranslation()
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

// Regression: the "add location" / "add room" + buttons used to be built as
// `${href_path}/locations/new` / `${href_path}/rooms/new`, where href_path is a server-computed
// absolute URL that can point at the wrong host/port for the current environment (observed as a
// stale "http://127.0.0.1:3000" in dev). A deliberately hostile href_path proves both links are
// now always plain relative paths, matching the window.open("/inscriptions/...") convention used
// elsewhere in the app.
test("the 'add location' / 'add room' + buttons are relative links, not the server-supplied href_path", async () => {
    const {container} = render(
        <AddLocationForCourse
            {...makeProps()}
            href_path="http://127.0.0.1:3000"
        />
    );
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await screen.findByText("Filtrer par site");

    const plusLinks = container.querySelectorAll("a.fa-plus-circle");
    expect(Array.from(plusLinks).map(a => a.getAttribute("href"))).toEqual([
        "/locations/new",
        "/rooms/new",
    ]);
});
// Regression: componentDidMount fires /locations and /rooms/index_with_overlap in parallel.
// The /rooms callback used to read `this.state.locationId` to feed back into handleChange --
// stale under React 18 automatic batching if both fetches resolve in the same tick, since the
// /locations callback's own setState (which computes and sets locationId) hasn't committed yet.
// That stale (undefined) locationId then got written straight back into state via handleChange's
// setState, leaving the location <select> unselected and summary.location undefined even though
// /locations resolved successfully. Reproduced here by queuing both fetches' resolvers and firing
// them back-to-back (no await in between), so their .then() callbacks run as consecutive
// microtasks in the same tick -- exactly the batching window the reviewer found.
describe("AddLocationForCourse — /locations and /rooms resolving in the same tick (React 18 batching)", () => {
    test("the location ends up correctly selected and populated, not empty", async () => {
        let resolvers = [];
        global.fetch = vi.fn((url) => {
            const isRooms = String(url).includes("/rooms/index_with_overlap");
            const body = isRooms
                ? [{ id: 10, label: "Room A" }]
                : [{ id: 20, label: "Location A" }];
            return new Promise((resolve) => {
                resolvers.push(() =>
                    resolve({
                        ok: true,
                        headers: {
                            get: (h) =>
                                h === "Content-type"
                                    ? "application/json"
                                    : null,
                        },
                        json: () => Promise.resolve(body),
                    })
                );
            });
        });

        const onChange = vi.fn();
        const { container } = render(
            <AddLocationForCourse {...makeProps()} onChange={onChange} />
        );

        await waitFor(() => expect(resolvers).toHaveLength(2));

        // Resolve both back-to-back so their .then() callbacks run as consecutive microtasks in
        // the same tick -- React 18 batches the two resulting setState calls together.
        resolvers.forEach((resolve) => resolve());

        await screen.findByText("Filtrer par site");

        await waitFor(() => {
            const select = container.querySelector('select[name="location"]');
            expect(select.value).toBe("20");
        });

        await waitFor(() => {
            const lastCall = onChange.mock.calls.at(-1)[0];
            expect(lastCall.summary.location).toBe("Location A");
            expect(lastCall.summary.room).toBe("Room A");
        });
    });
});

// Regression: computeStateSlice's `locationOptions.find(location => location.value ===
// update.locationId)` compares a numeric `value` (location.id from the API) against
// `update.locationId`. Manually picking an option in the <select> feeds a string
// (e.target.value) straight into that comparison, so the strict `===` never matched and
// summary.location stayed undefined for a manual pick (auto-selection on mount worked fine,
// since it never goes through the DOM). Fixed by parseInt-ing the select's onChange value,
// mirroring the sibling room select's already-correct pattern.
describe("AddLocationForCourse — manually selecting a location", () => {
    test("sets summary.location, not undefined", async () => {
        global.fetch = vi.fn((url) => {
            const isRooms = String(url).includes("/rooms/index_with_overlap");
            const body = isRooms
                ? [
                      { id: 10, label: "Room A", location_id: 1 },
                      { id: 11, label: "Room B", location_id: 2 },
                  ]
                : [
                      { id: 1, label: "Location A" },
                      { id: 2, label: "Location B" },
                  ];
            return Promise.resolve({
                ok: true,
                headers: {
                    get: (h) =>
                        h === "Content-type" ? "application/json" : null,
                },
                json: () => Promise.resolve(body),
            });
        });

        const onChange = vi.fn();
        const { container } = render(
            <AddLocationForCourse {...makeProps()} onChange={onChange} />
        );

        const select = await waitFor(() => {
            const el = container.querySelector('select[name="location"]');
            expect(el).not.toBeNull();
            return el;
        });

        fireEvent.change(select, { target: { value: "2" } });

        await waitFor(() => {
            const lastCall = onChange.mock.calls.at(-1)[0];
            expect(lastCall.summary.location).toBe("Location B");
        });
    });
});
