// Component tests for the i18n extraction on the "activities" domain lot 1: the
// activity_ref_kind and instruments admin CRUD tables. Both ActivityRefKind and Instruments are
// class components extending parameters/BaseDataTable and wrapped in
// `withTranslation("activities")`. They build `this.state.columns` in the constructor with
// `this.props.t(...)` Headers, so the translated column headers are what this file asserts on.
//
// Same language-switching pattern as the earlier i18n branches: drive the
// frontend/i18n/index.js singleton with i18n.changeLanguage(...), no <I18nextProvider> needed.
//
// BaseDataTable fetches its table rows on mount (react-table `manual` mode -> onFetchData ->
// fetch(urlListData, ...)). global.fetch is stubbed so that resolves harmlessly; react-table
// renders the column headers synchronously, so they are asserted without waiting, then a final
// waitFor drains the pending state update.

import React from "react";
import {render, screen, waitFor} from "@testing-library/react";
import i18n from "../../i18n";
import ActivityRefKind from "./ActivityRefKind";
import Instruments from "./Instruments";

beforeEach(() => {
    // BaseDataTable#fetchData does `response.json().then(data => ({ data: data.status, ... }))`,
    // so the success handler expects a `status` array and a `pages` count.
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {get: () => null},
        json: () => Promise.resolve({status: [], pages: 1, total: 0}),
    });
});

afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
});

describe("ActivityRefKind", () => {
    const props = {urlListData: "/activity_ref_kind/list", urlNew: "/activity_ref_kind/new"};

    test("renders the French column headers by default", async () => {
        await i18n.changeLanguage("fr");
        render(<ActivityRefKind {...props} />);

        expect(screen.getByText("Nom")).toBeInTheDocument();
        expect(screen.getByText("Activité par défaut")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled(), {timeout: 2000});
    });

    test("renders the English column headers when the active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<ActivityRefKind {...props} />);

        expect(screen.getByText("Name")).toBeInTheDocument();
        expect(screen.getByText("Default activity")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled(), {timeout: 2000});
    });
});

describe("Instruments", () => {
    const props = {urlListData: "/instruments/list", urlNew: "/instruments/new"};

    test("renders the French column headers by default", async () => {
        await i18n.changeLanguage("fr");
        render(<Instruments {...props} />);

        expect(screen.getByText("Label")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled(), {timeout: 2000});
    });

    test("renders the English column headers when the active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<Instruments {...props} />);

        // instruments.columns.label / columns.actions happen to be identical in fr and en, so
        // this en case only proves the component renders — fr/en key parity for the whole
        // `activities` namespace is covered by the parity test in frontend/i18n/index.test.js.
        expect(screen.getByText("Label")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();

        await waitFor(() => expect(global.fetch).toHaveBeenCalled(), {timeout: 2000});
    });
});
