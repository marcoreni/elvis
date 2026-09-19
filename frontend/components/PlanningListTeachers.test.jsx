// Component tests for PlanningListTeachers's migration off react-table v6 onto TanStackGrid's
// client-side (manual=false) mode (docs/Modernization-Roadmap.md item 13 batch 4a). No prior test
// file existed for this component.
//
// `withTranslation("planning")` wraps the class; render() reads `t` from props via the HOC.

import React from "react";
import { render, screen } from "@testing-library/react";
import i18n from "../i18n";
import PlanningListTeachers from "./PlanningListTeachers";

beforeEach(async () => {
    await i18n.changeLanguage("fr");
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

const plannings = () => [
    {
        id: 1,
        updated_at: "2026-01-05T10:00:00",
        user: { id: 10, first_name: "Zoe", last_name: "Zephyr" },
    },
    {
        id: 2,
        updated_at: "2026-01-06T10:00:00",
        user: { id: 11, first_name: "Amy", last_name: "Alpha" },
    },
];

test("renders teacher planning rows with the expected columns and profile/simulation links", () => {
    render(<PlanningListTeachers plannings={plannings()} />);

    // "Nom" (lastname) is the initially-sorted column (defaultSorted), so its header carries a sort
    // arrow -- scope to the columnheader role to avoid matching on it exactly.
    expect(
        screen.getByRole("columnheader", { name: /^Nom/ })
    ).toBeInTheDocument();
    expect(screen.getByText("Prénom")).toBeInTheDocument();
    expect(screen.getByText("Zephyr")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Profil/ })).toHaveLength(2);
});

// Regression: v6's `defaultSorted` item was `{ id: "lastname", asc: true }` -- v6's own
// defaultSorted handling only ever reads `desc` (an `asc` key is a silent no-op there), so the
// ascending order actually came from v6's own untouched default, not a deliberate `asc: true`.
// The migration made this explicit as `desc: false`; this proves the intended order is real,
// not coincidental default behavior that a future refactor could flip.
test("initial sort is ascending by last name", () => {
    const { container } = render(
        <PlanningListTeachers plannings={plannings()} />
    );

    const bodyRows = container.querySelectorAll("tbody > tr");
    // Column order: id(0), date(1), lastname(2), firstname(3), actions(4).
    const lastNames = Array.from(bodyRows).map(
        (r) => r.children[2].textContent
    );
    expect(lastNames).toEqual(["Alpha", "Zephyr"]);
});
