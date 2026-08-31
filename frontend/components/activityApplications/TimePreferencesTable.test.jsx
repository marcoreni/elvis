// i18n extraction test — i18n-06 "activities" domain, lot 3a (`activityApplications` namespace).
//
// TimePreferencesTable is a function component using `useTranslation("activityApplications")`
// *and* a module-level `createTimeRow` helper that calls the i18n singleton directly
// (`i18n.t("activityApplications:choices.choiceN", ...)`). The <th> (timePreferencesTable.
// myChoicesFor, {label} interpolation) only renders when `preferences.length > 0`, so the
// fixture must carry at least one preference — that same row exercises the createTimeRow path.

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../../i18n";
import TimePreferencesTable from "./TimePreferencesTable";

const props = {
    preferences: [{start: "2025-09-01T10:00:00", end: "2025-09-01T11:00:00"}],
    intervals: [],
    activityRef: {label: "Piano"},
};

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("TimePreferencesTable", () => {
    test("renders the French header + choice badge by default", async () => {
        await i18n.changeLanguage("fr");
        render(<TimePreferencesTable {...props} />);

        expect(screen.getByText("Mes choix de créneaux pour Piano")).toBeInTheDocument();
        expect(screen.getByText("Choix n°1")).toBeInTheDocument();
    });

    test("renders the English header + choice badge after switching to en", async () => {
        await i18n.changeLanguage("en");
        render(<TimePreferencesTable {...props} />);

        expect(screen.getByText("My slot choices for Piano")).toBeInTheDocument();
        expect(screen.getByText("Choice no. 1")).toBeInTheDocument();
    });

    test("omits the header entirely when there are no preferences", async () => {
        await i18n.changeLanguage("fr");
        render(<TimePreferencesTable preferences={[]} intervals={[]} activityRef={{label: "Piano"}} />);

        expect(screen.queryByText("Mes choix de créneaux pour Piano")).not.toBeInTheDocument();
    });
});
