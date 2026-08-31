// i18n extraction test — i18n-06 "activities" domain, lot 3a (new `activityApplications` namespace).
//
// SelectedActivitiesTable is a function component using `useTranslation("activityApplications")`.
// It is purely presentational; with empty inputs it still renders the table head + footer, which
// is where every extracted string lives. Language is driven through the frontend/i18n singleton
// (registered via initReactI18next, so no <I18nextProvider> is needed).

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../../i18n";
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
