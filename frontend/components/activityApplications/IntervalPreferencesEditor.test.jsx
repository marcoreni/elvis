// i18n extraction test — i18n-06 "activities" domain, lot 3a (`activityApplications` namespace).
//
// IntervalPreferencesEditor is a PureComponent wrapped in `withTranslation("activityApplications")`.
// On mount it fires one `api.get("/time_interval_preferences/<seasonId>/<refId>")` per activityRef
// and only renders the <h3> (intervalPreferencesEditor.title, {label} interpolation) for a ref
// once `state.intervals[ref.id]` is set. tools/api and the TimeIntervalPreferencesEditor child
// are mocked; the test waits for the mount fetch to resolve before asserting the title.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import * as api from "../../tools/api";
import IntervalPreferencesEditor from "./IntervalPreferencesEditor";

vi.mock("../../tools/api", () => ({
    get: vi.fn(() => Promise.resolve({ data: [], error: null })),
}));

vi.mock("./TimeIntervalPreferencesEditor", () => ({ default: () => null }));

const props = {
    preferences: {},
    activityRefs: [{ id: 1, label: "Piano" }],
    season: { id: 1 },
    onUpdate: () => {},
};

afterEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("fr");
});

describe("IntervalPreferencesEditor", () => {
    test("is wrapped in withTranslation() (StepZilla-safe HOC)", () => {
        expect(IntervalPreferencesEditor.WrappedComponent).toBeDefined();
    });

    test("renders the French per-activity title once the mount fetch resolves", async () => {
        await i18n.changeLanguage("fr");
        render(<IntervalPreferencesEditor {...props} />);

        await waitFor(() =>
            expect(api.get).toHaveBeenCalledWith(
                "/time_interval_preferences/1/1"
            )
        );
        expect(
            await screen.findByText(
                "Préférences horaires pour l'activité (Piano)"
            )
        ).toBeInTheDocument();
    });

    test("renders the English per-activity title after switching to en", async () => {
        await i18n.changeLanguage("en");
        render(<IntervalPreferencesEditor {...props} />);

        expect(
            await screen.findByText("Time preferences for the activity (Piano)")
        ).toBeInTheDocument();
    });
});

// React 18 batching regression: componentDidMount fires one api.get() per activityRef in
// parallel, and each resolved callback merged its result into state via
// `this.setState({ intervals: { ...this.state.intervals, [ref.id]: data } })`. If two of those
// callbacks resolve within the same batch, the second's `...this.state.intervals` spread doesn't
// yet include the first's update, silently dropping it. Two refs whose api.get() promises
// resolve in the same microtask (both queued before either resolves) reproduce that batch.
describe("IntervalPreferencesEditor — parallel activityRefs both keep their data (React 18 batching)", () => {
    test("neither ref's fetched intervals are dropped when both requests resolve together", async () => {
        const refs = [
            { id: 1, label: "Piano" },
            { id: 2, label: "Guitare" },
        ];
        let resolvers = [];
        api.get.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolvers.push(() => resolve({ data: [], error: null }));
                })
        );

        render(<IntervalPreferencesEditor {...props} activityRefs={refs} />);

        await waitFor(() => expect(resolvers).toHaveLength(2));

        // Resolve both back-to-back (no await in between), so their .then() callbacks run as
        // consecutive microtasks in the same tick -- React 18 batches the two resulting setState
        // calls together.
        resolvers.forEach((resolve) => resolve());

        await screen.findByText("Préférences horaires pour l'activité (Piano)");
        await screen.findByText(
            "Préférences horaires pour l'activité (Guitare)"
        );
    });
});

// Regression: the error branch's sibling to the fix above. componentDidMount's error branch did
// a plain `this.setState({ errors: error })`, overwriting rather than accumulating -- with 2+
// simultaneous rejected requests, only the last one's error survived in state. Fixed with the same
// functional-updater pattern as the success branch, keyed by `ref.id` (matching how `intervals`
// itself is keyed) so each ref's own error is kept independently. Rendered via
// `IntervalPreferencesEditor.WrappedComponent` (the raw class react-i18next's `withTranslation`
// HOC exposes under that static, same technique as `planning/Planning.test.jsx`'s remove-student
// regression tests) with a ref, so `state.errors` can be inspected directly.
describe("IntervalPreferencesEditor — parallel activityRefs both keep their error (regression)", () => {
    const RawEditor = IntervalPreferencesEditor.WrappedComponent;

    test("neither ref's error is dropped when both requests reject together", async () => {
        const refs = [
            { id: 1, label: "Piano" },
            { id: 2, label: "Guitare" },
        ];
        let resolvers = [];
        api.get.mockImplementation(
            (url) =>
                new Promise((resolve) => {
                    resolvers.push(() =>
                        resolve({ data: null, error: `boom for ${url}` })
                    );
                })
        );

        const ref = React.createRef();
        render(
            <RawEditor
                {...props}
                activityRefs={refs}
                t={i18n.getFixedT("fr", "activityApplications")}
                ref={ref}
            />
        );

        await waitFor(() => expect(resolvers).toHaveLength(2));

        // Resolve both back-to-back, same as the success-branch regression above, so their
        // .then() error callbacks run as consecutive microtasks in the same React 18 batch.
        resolvers.forEach((resolve) => resolve());

        await waitFor(() => {
            expect(Object.keys(ref.current.state.errors)).toHaveLength(2);
        });
        expect(ref.current.state.errors[1]).toBe(
            "boom for /time_interval_preferences/1/1"
        );
        expect(ref.current.state.errors[2]).toBe(
            "boom for /time_interval_preferences/1/2"
        );
    });
});
