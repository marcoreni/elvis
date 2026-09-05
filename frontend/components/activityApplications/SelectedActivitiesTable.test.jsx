// i18n extraction test — i18n-06 "activities" domain, lot 3a (new `activityApplications` namespace).
//
// SelectedActivitiesTable is a function component using `useTranslation("activityApplications")`.
// It is purely presentational; with empty inputs it still renders the table head + footer, which
// is where every extracted string lives. Language is driven through the frontend/i18n singleton
// (registered via initReactI18next, so no <I18nextProvider> is needed).

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../../i18n";
import enActivityApplications from "../../locales/en/activityApplications.json";
import SelectedActivitiesTable from "./SelectedActivitiesTable";

const props = {selectedActivities: [], packs: {}, selectedPacks: {}};

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("SelectedActivitiesTable", () => {
    test("renders the French column + total labels by default", async () => {
        await i18n.changeLanguage("fr");
        render(<SelectedActivitiesTable {...props} />);

        expect(screen.getByText("Activité")).toBeInTheDocument();
        expect(screen.getByText("Durée")).toBeInTheDocument();
        expect(screen.getByText("Tarif estimé")).toBeInTheDocument();
        expect(screen.getByText("Total estimé")).toBeInTheDocument();
    });

    test("renders the English column + total labels after switching to en", async () => {
        await i18n.changeLanguage("en");
        render(<SelectedActivitiesTable {...props} />);

        expect(screen.getByText("Activity")).toBeInTheDocument();
        expect(screen.getByText("Duration")).toBeInTheDocument();
        expect(screen.getByText("Estimated price")).toBeInTheDocument();
        expect(screen.getByText("Estimated total")).toBeInTheDocument();
    });
});

// Regression: displayDuration() used to build the "1h30" / "45min" cell with hardcoded, untranslated
// "h"/"min" unit tokens (activityApplications:units.*), not going through i18n at all -- so it
// couldn't have looked any different in en even though the current en value happens to match fr.
describe("SelectedActivitiesTable — duration cell goes through activityApplications:units.*", () => {
    const activitiesProps = {
        selectedActivities: [
            {display_name: "Piano", duration: 90, display_price: 10},
            {display_name: "Solfège", duration: 45, display_price: 5},
        ],
        packs: {},
        selectedPacks: {},
    };

    for (const lng of ["fr", "en"]) {
        test(`${lng}: hours+minutes and minutes-only durations render via activityApplications:units.*`, async () => {
            await i18n.changeLanguage(lng);
            render(<SelectedActivitiesTable {...activitiesProps} />);

            expect(screen.getByText("1h30")).toBeInTheDocument();
            expect(screen.getByText("45 min")).toBeInTheDocument();
        });
    }

    // The test above can't actually distinguish "wired through i18n" from "still hardcoded",
    // because the fr and en `units.*` values are byte-identical -- a regression back to a
    // hardcoded `${hours}h${minutes}` template would render exactly "1h30" and still pass it.
    // Prove the string genuinely comes from the en catalogue by giving it a distinguishable
    // value at runtime and asserting the render reflects it; a hardcoded literal could never
    // pick this up.
    test("en: renders whatever the en catalogue actually says, not a value baked into the component", async () => {
        await i18n.changeLanguage("en");
        i18n.addResourceBundle(
            "en",
            "activityApplications",
            {units: {hoursMinutes: "{{hours}}HR{{minutes}}", minutes: "{{minutes}}MIN"}},
            true,
            true,
        );

        try {
            render(<SelectedActivitiesTable {...activitiesProps} />);
            expect(screen.getByText("1HR30")).toBeInTheDocument();
            expect(screen.getByText("45MIN")).toBeInTheDocument();
        } finally {
            i18n.addResourceBundle("en", "activityApplications", enActivityApplications, true, true);
        }
    });
});
