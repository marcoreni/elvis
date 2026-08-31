// i18n extraction test — i18n-06 "activities" domain, lot 3a (`activityApplications` namespace).
//
// TimePreferences is a function component using `useTranslation("activityApplications")`. Its
// only extracted string is the <h3> title; the heavy `<Planning>` child it renders is mocked out
// so this file only exercises the title. Note the two typos in the French source
// ("Préferences", "Eveil") are intentional / verbatim-preserved.

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../../i18n";
import TimePreferences from "./TimePreferences";

vi.mock("../planning/Planning", () => ({default: () => null}));

const props = {
    intervals: [],
    handleUpdateIntervalsSelection: () => {},
    season: {},
    seasons: [],
};

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("TimePreferences", () => {
    test("renders the French title by default", async () => {
        await i18n.changeLanguage("fr");
        render(<TimePreferences {...props} />);

        expect(
            screen.getByText("Préferences horaires des activités (hors Eveil)")
        ).toBeInTheDocument();
    });

    test("renders the English title after switching to en", async () => {
        await i18n.changeLanguage("en");
        render(<TimePreferences {...props} />);

        expect(
            screen.getByText("Activity time preferences (excluding Éveil)")
        ).toBeInTheDocument();
    });
});
