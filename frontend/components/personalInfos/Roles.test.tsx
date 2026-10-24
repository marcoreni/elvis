// Component test for Roles -- no prior test file existed.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import i18n from "../../i18n";

const fireMock = vi.fn((..._args: unknown[]) =>
    Promise.resolve({ isConfirmed: true })
);
vi.mock("sweetalert2", () => ({
    default: { fire: (...args: unknown[]) => fireMock(...args) },
}));

import Roles from "./Roles";
import type { User } from "../utils/entities";

// `Roles`'s `user` prop is the real `User` entity (see Roles.tsx) -- a full fixture, not the
// narrower `{id, is_teacher, is_admin}` shape this file used before that was corrected.
const user: User = {
    id: 1,
    first_name: "Jean",
    last_name: "Dupont",
    birthday: "1990-01-01",
    levels: [],
    is_teacher: true,
    is_admin: false,
};

beforeEach(async () => {
    await i18n.changeLanguage("fr");
    fireMock.mockClear();
    fireMock.mockImplementation(() => Promise.resolve({ isConfirmed: true }));
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
    vi.restoreAllMocks();
});

describe("Roles", () => {
    test("renders the teacher/admin checkboxes pre-checked from the user prop", () => {
        render(<Roles user={user} lessonsPlanned={0} onSubmit={vi.fn()} />);

        expect(
            screen.getByRole("checkbox", { name: "Professeur" })
        ).toBeChecked();
        expect(
            screen.getByRole("checkbox", { name: "Administrateur" })
        ).not.toBeChecked();
    });

    test("toggling admin has no confirmation step", async () => {
        render(<Roles user={user} lessonsPlanned={0} onSubmit={vi.fn()} />);

        await userEvent.click(
            screen.getByRole("checkbox", { name: "Administrateur" })
        );

        expect(
            screen.getByRole("checkbox", { name: "Administrateur" })
        ).toBeChecked();
        expect(fireMock).not.toHaveBeenCalled();
    });

    test("un-checking teacher with no upcoming lessons needs no confirmation", async () => {
        render(<Roles user={user} lessonsPlanned={0} onSubmit={vi.fn()} />);

        await userEvent.click(
            screen.getByRole("checkbox", { name: "Professeur" })
        );

        expect(
            screen.getByRole("checkbox", { name: "Professeur" })
        ).not.toBeChecked();
        expect(fireMock).not.toHaveBeenCalled();
    });

    test("un-checking teacher with upcoming lessons asks for confirmation first, and deleting them unchecks it", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({}),
        });

        render(<Roles user={user} lessonsPlanned={3} onSubmit={vi.fn()} />);

        await userEvent.click(
            screen.getByRole("checkbox", { name: "Professeur" })
        );

        expect(fireMock).toHaveBeenCalledWith(
            expect.objectContaining({ title: "Êtes-vous sûr ?" })
        );
        // Still checked -- removeLessons()'s own success swal flips it, not the click itself.
        expect(
            screen.getByRole("checkbox", { name: "Professeur" })
        ).toBeChecked();

        await vi.waitFor(() =>
            expect(globalThis.fetch).toHaveBeenCalledWith(
                "/teachers/1/activity_instances",
                expect.objectContaining({ method: "DELETE" })
            )
        );
        await vi.waitFor(() =>
            expect(
                screen.getByRole("checkbox", { name: "Professeur" })
            ).not.toBeChecked()
        );
    });

    test("declining the confirmation fetches the lessons list instead of deleting", async () => {
        fireMock.mockImplementation(() =>
            Promise.resolve({ isConfirmed: false })
        );
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve([]),
        });

        render(<Roles user={user} lessonsPlanned={3} onSubmit={vi.fn()} />);

        await userEvent.click(
            screen.getByRole("checkbox", { name: "Professeur" })
        );

        // The confirm dialog resolves with isConfirmed: false (see mock above) -> getActivitiesList().
        await vi.waitFor(() =>
            expect(globalThis.fetch).toHaveBeenCalledWith(
                "/teachers/1/activities/",
                expect.anything()
            )
        );
        expect(
            screen.getByRole("checkbox", { name: "Professeur" })
        ).toBeChecked();
    });

    test("clicking save calls onSubmit with the current (possibly toggled) role flags", async () => {
        const onSubmit = vi.fn();
        const startingUser: User = {
            ...user,
            is_teacher: false,
            is_admin: false,
        };
        render(
            <Roles user={startingUser} lessonsPlanned={0} onSubmit={onSubmit} />
        );

        await userEvent.click(
            screen.getByRole("checkbox", { name: "Administrateur" })
        );
        await userEvent.click(
            screen.getByRole("button", { name: "Enregistrer" })
        );

        // onSubmit spreads the ENTIRE user object back through (not just the 2 toggled flags) --
        // see Roles.tsx.
        expect(onSubmit).toHaveBeenCalledWith({
            ...startingUser,
            is_teacher: false,
            is_admin: true,
        });
    });
});
