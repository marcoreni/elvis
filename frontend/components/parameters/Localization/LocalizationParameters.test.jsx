// Regression tests for the PR #5 review fixes:
// - the default-language <select> must only offer the checked available languages, not every
//   supported locale (it used to let an admin pick a locale they'd just unchecked)
// - unchecking the currently-selected default must move the selection to a still-available one
// - a failed initial fetch must not leave the screen stuck on "Loading..." forever

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../../i18n";
import LocalizationParameters from "./LocalizationParameters";

// The loading placeholder is now `t("common:loading")` (i18n-06 parameters lot E — was a
// hardcoded English "Loading..."). Tests run in the default locale (fr) -> "Chargement...".
const LOADING = i18n.t("common:loading");

function mockFetchOnce(response) {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve(response),
    });
}

function mockFetchRejectOnce() {
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));
}

describe("LocalizationParameters", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("default-language select only lists the checked available languages", async () => {
        mockFetchOnce({
            supportedLocales: ["fr", "en"],
            defaultLanguage: "fr",
            availableLanguages: ["fr"],
        });

        render(<LocalizationParameters />);

        await waitFor(() => expect(screen.queryByText(LOADING)).not.toBeInTheDocument());

        const select = screen.getByRole("combobox");
        const options = Array.from(select.querySelectorAll("option")).map((o) => o.value);

        expect(options).toEqual(["fr"]);
    });

    test("unchecking the current default moves the selection to a still-available language", async () => {
        mockFetchOnce({
            supportedLocales: ["fr", "en"],
            defaultLanguage: "fr",
            availableLanguages: ["fr", "en"],
        });

        render(<LocalizationParameters />);
        await waitFor(() => expect(screen.queryByText(LOADING)).not.toBeInTheDocument());

        const select = screen.getByRole("combobox");
        expect(select).toHaveValue("fr");

        await userEvent.click(screen.getByLabelText("Français"));

        expect(select).toHaveValue("en");
        expect(
            Array.from(select.querySelectorAll("option")).map((o) => o.value)
        ).toEqual(["en"]);
    });

    test("a failed initial fetch does not leave the screen stuck on Loading", async () => {
        mockFetchRejectOnce();

        render(<LocalizationParameters />);

        expect(screen.getByText(LOADING)).toBeInTheDocument();

        await waitFor(() => expect(screen.queryByText(LOADING)).not.toBeInTheDocument());
    });
});
