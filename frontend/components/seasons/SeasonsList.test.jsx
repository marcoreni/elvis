// Component test for SeasonsList's migration off react-table v6 onto TanStackGrid's client-side
// (manual=false) mode (docs/Modernization-Roadmap.md item 13 batch 4a). No prior test file existed
// for this component. No bug was found migrating this file beyond the general filterable-gating
// change common to every batch 4a file (spot-checked directly in PlanningListRooms.test.jsx).
//
// `withTranslation("planning")` wraps the class; render() reads `t` from props via the HOC.
// SeasonActivationModal is mounted but stays closed (never triggered here) -- harmless to leave
// unmocked.

import React from "react";
import { render, screen } from "@testing-library/react";
import i18n from "../../i18n";
import SeasonsList from "./SeasonsList";

beforeEach(async () => {
    await i18n.changeLanguage("fr");
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

const seasons = () => [
    {
        id: 1,
        label: "2025-2026",
        start: "2025-09-01",
        end: "2026-06-30",
        start_formatted: "01/09/2025",
        end_formatted: "30/06/2026",
        is_current: true,
        next_season_id: null,
        next_season: null,
    },
    {
        id: 2,
        label: "2026-2027",
        start: "2026-09-01",
        end: "2027-06-30",
        start_formatted: "01/09/2026",
        end_formatted: "30/06/2027",
        is_current: false,
        next_season_id: null,
        next_season: null,
    },
];

test("renders season rows with formatted dates and status controls", () => {
    render(<SeasonsList seasons={seasons()} />);

    expect(screen.getByText("2025-2026")).toBeInTheDocument();
    expect(screen.getByText("01/09/2025")).toBeInTheDocument();
    expect(screen.getByText("30/06/2026")).toBeInTheDocument();
    expect(screen.getByText("2026-2027")).toBeInTheDocument();
    // Row 1 is the current season -> the "Active" badge, not the "Activer" button.
    expect(screen.getByText("Active")).toBeInTheDocument();
    // Row 2 is not current -> shows the activation button instead.
    expect(screen.getByText("Activer")).toBeInTheDocument();
});
