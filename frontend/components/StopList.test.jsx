// Component test for StopList's migration off react-table v6 onto TanStackGrid's client-side
// (manual=false) mode (docs/Modernization-Roadmap.md item 13 batch 4a). No prior test file existed
// for this component. No bug was found migrating this file beyond the general filterable-gating
// change common to every batch 4a file (spot-checked directly in PlanningListRooms.test.jsx).
//
// StopList fetches its full dataset via tools/api only once its modal is opened (the toggle
// button's onClick). The api module is mocked so `.get()` synchronously delivers a fixture
// straight to the registered `.success()` callback, matching this repo's chainable-stub
// convention (see courses/LessonList.test.jsx's api mock) but resolving eagerly instead of being
// driven by a captured callback, since this component has no debounce to work around.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../i18n";
import * as api from "../tools/api";
import StopList from "./StopList";

vi.mock("../tools/api", () => {
    const chain = {};
    let successCb = null;
    chain.set = () => chain;
    chain.success = (cb) => {
        successCb = cb;
        return chain;
    };
    chain.error = () => chain;
    chain.get = () => {
        if (successCb) successCb(queuedDataRef.current);
        return chain;
    };
    const queuedDataRef = { current: [] };
    return {
        set: () => chain,
        __setData: (data) => {
            queuedDataRef.current = data;
        },
    };
});

beforeEach(async () => {
    await i18n.changeLanguage("fr");
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

const STOP_ROWS = [
    {
        id: 1,
        comment: "not_a_known_reason_code",
        pre_application: {
            id: 11,
            season_id: 1,
            user: { first_name: "Jean", last_name: "Dupont" },
            season: { label: "2025-2026" },
        },
        activity: {
            activity_ref: { label: "Piano" },
            teacher: { first_name: "Alice", last_name: "Martin" },
        },
    },
];

test("opening the modal fetches and renders stop rows in the table (client-side/manual=false mode)", async () => {
    api.__setData(STOP_ROWS);
    render(<StopList seasons={[]} />);

    await userEvent.click(screen.getByRole("button"));

    expect(await screen.findByText("Jean Dupont")).toBeInTheDocument();
    expect(screen.getByText("2025-2026")).toBeInTheDocument();
});
