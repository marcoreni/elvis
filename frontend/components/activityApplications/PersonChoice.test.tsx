// Component test for PersonChoice -- no prior test file existed. No real call site was found
// anywhere in app/views or frontend/ for this component (confirmed by grep across both trees);
// kept as-is per the batch's scope (convert, don't delete).

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import i18n from "../../i18n";
import PersonChoice from "./PersonChoice";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("PersonChoice", () => {
    test("renders the title and both choices, neither selected by default", async () => {
        await i18n.changeLanguage("fr");
        render(
            <PersonChoice personSelection={null} handleSelectPerson={vi.fn()} />
        );

        expect(screen.getByText("Première étape")).toBeInTheDocument();
        const myself = screen.getByText("Je m'inscris").closest("div");
        const other = screen
            .getByText("J'inscris une autre personne")
            .closest("div");
        expect(myself).not.toHaveClass("selected");
        expect(other).not.toHaveClass("selected");
    });

    test("marks the matching choice as selected", () => {
        render(
            <PersonChoice
                personSelection="other"
                handleSelectPerson={vi.fn()}
            />
        );

        expect(
            screen.getByText("J'inscris une autre personne").closest("div")
        ).toHaveClass("selected");
        expect(screen.getByText("Je m'inscris").closest("div")).not.toHaveClass(
            "selected"
        );
    });

    test("clicking a choice calls handleSelectPerson with that choice", async () => {
        const handleSelectPerson = vi.fn();
        render(
            <PersonChoice
                personSelection={null}
                handleSelectPerson={handleSelectPerson}
            />
        );

        await userEvent.click(screen.getByText("Je m'inscris"));
        expect(handleSelectPerson).toHaveBeenCalledWith("myself");

        await userEvent.click(screen.getByText("J'inscris une autre personne"));
        expect(handleSelectPerson).toHaveBeenCalledWith("other");
    });
});
