// i18n extraction test — i18n-06 "activities" domain, lot 3a (`activityApplications` namespace).
//
// IntervalPreferencesEditor is a PureComponent wrapped in `withTranslation("activityApplications")`.
// On mount it fires one `api.get("/time_interval_preferences/<seasonId>/<refId>")` per activityRef
// and only renders the <h3> (intervalPreferencesEditor.title, {label} interpolation) for a ref
// once `state.intervals[ref.id]` is set. tools/api and the TimeIntervalPreferencesEditor child
// are mocked; the test waits for the mount fetch to resolve before asserting the title.

import React from "react";
import {render, screen, waitFor} from "@testing-library/react";
import i18n from "../../i18n";
import * as api from "../../tools/api";
import IntervalPreferencesEditor from "./IntervalPreferencesEditor";

vi.mock("../../tools/api", () => ({
    get: vi.fn(() => Promise.resolve({data: [], error: null})),
}));

vi.mock("./TimeIntervalPreferencesEditor", () => ({default: () => null}));

const props = {
    preferences: {},
    activityRefs: [{id: 1, label: "Piano"}],
    season: {id: 1},
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
            expect(api.get).toHaveBeenCalledWith("/time_interval_preferences/1/1")
        );
        expect(
            await screen.findByText("Préférences horaires pour l'activité (Piano)")
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
