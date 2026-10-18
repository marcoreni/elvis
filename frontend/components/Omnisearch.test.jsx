// Locks the ref-attach/focus mechanic of Omnisearch's search field: openSearch() and render()
// both call `this.searchInput.focus()`, which throws if the `ref` callback on the
// `.search__input` ever stops storing the node. No prior test file existed for this component.
//
// The field carries `autoFocus`, which React applies on mount in jsdom too -- so the test blurs
// it first and asserts it is NOT focused, otherwise the final assertion would pass even with a
// dead ref.

import React from "react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../i18n";

import Omnisearch from "./Omnisearch";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("Omnisearch", () => {
    test("focuses the search field when the navbar search box is clicked", async () => {
        await i18n.changeLanguage("fr");
        const { container } = render(<Omnisearch />);

        // Queried by class, not placeholder text -- `omnisearch.search`/`omnisearch.searchNoun`
        // are identical strings ("Search") in English, so a placeholder-text query would break
        // (or worse, silently match the wrong field) outside the forced "fr" locale above.
        const searchField = container.querySelector(".search__input");
        searchField.blur();
        expect(searchField).not.toHaveFocus();

        await userEvent.click(container.querySelector(".school-omnisearch"));

        expect(searchField).toHaveFocus();
        expect(document.activeElement).toBe(searchField);
    });
});
