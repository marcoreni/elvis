// Component test for SeasonsList's migration off react-table v6 onto TanStackGrid's client-side
// (manual=false) mode (docs/Modernization-Roadmap.md item 13 batch 4a). No prior test file existed
// for this component. No bug was found migrating this file beyond the general filterable-gating
// change common to every batch 4a file (spot-checked directly in PlanningListRooms.test.jsx).
//
// `withTranslation("planning")` wraps the class; render() reads `t` from props via the HOC.
// SeasonActivationModal is mounted but stays closed (never triggered here) -- harmless to leave
// unmocked.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../i18n";
import SeasonsList from "./SeasonsList";

// SeasonsList's `onActivationSuccess` is only ever invoked as SeasonActivationModal's `onSuccess`
// prop, deep inside that modal's own multi-step activation flow -- mocked out here (as a plain
// button forwarding a fabricated payload) so the regression below can call it directly without
// driving that whole flow. `forwardRef` + `useImperativeHandle` avoids a "function components
// cannot be given refs" warning from SeasonsList's `ref={this.state.modalRef}`.
vi.mock("./SeasonActivationModal", () => ({
    default: React.forwardRef((props, ref) => {
        React.useImperativeHandle(ref, () => ({ openModal: () => {} }));
        return (
            <button
                onClick={() =>
                    props.onSuccess({
                        id: 1,
                        new_next_season: true,
                        next: {
                            id: 3,
                            label: "2027-2028",
                            start: "2027-09-01",
                            end: "2028-06-30",
                            start_formatted: "01/09/2027",
                            end_formatted: "30/06/2028",
                            is_current: false,
                            next_season_id: null,
                            next_season: null,
                        },
                    })
                }
            >
                trigger-activation-success
            </button>
        );
    }),
}));

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

test("activating a season that creates a new next season shows the new row immediately, without a reload (regression: `onActivationSuccess` mutated the previous `seasons` array in place, so TanStack's row-model memoization -- keyed on that array's reference -- never picked up the new row)", async () => {
    // The activated season's own row also gains a "Suivante" cell showing the new season's label,
    // so "2027-2028" legitimately appears twice once activation succeeds (the new row's own label
    // cell, plus the activated row's "next" column) -- assert on the new row specifically via its
    // edit link's href (unique to that row) rather than on the label text alone.
    const { container } = render(<SeasonsList seasons={seasons()} />);
    const newSeasonEditLink = () =>
        container.querySelector('a[href="/seasons/3/edit"]');

    expect(newSeasonEditLink()).not.toBeInTheDocument();

    await userEvent.click(screen.getByText("trigger-activation-success"));

    await waitFor(() => expect(newSeasonEditLink()).toBeInTheDocument());
    expect(screen.getAllByText("2027-2028").length).toBeGreaterThan(0);
});
