// Component test for RemoveComponent -- no prior test file existed despite this being the
// standard UI entry point for destroying records with dependencies (see CLAUDE.md's "Object
// deletion" section). Covers the contract with the `generic_destroy` route
// (app/controllers/remove_controller.rb#destroy): a DELETE to `/destroy/${classname}/${id}`,
// gated behind a confirmation popup, dispatching to onSuccess/onFailed based on the JSON
// response's `success` flag.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import i18n from "../i18n";

const fireMock = vi.fn((..._args: unknown[]) =>
    Promise.resolve({ isConfirmed: true })
);
vi.mock("sweetalert2", () => ({
    default: { fire: (...args: unknown[]) => fireMock(...args) },
}));

import RemoveComponent from "./RemoveComponent";

beforeEach(async () => {
    await i18n.changeLanguage("fr");
    fireMock.mockClear();
    fireMock.mockImplementation(() => Promise.resolve({ isConfirmed: true }));
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
    vi.restoreAllMocks();
});

describe("RemoveComponent", () => {
    test("renders the default trash icon + delete label and a danger button class when nothing is overridden", () => {
        render(<RemoveComponent classname="User" id={1} />);

        const button = screen.getByRole("button");
        expect(button).toHaveClass("btn btn-danger");
        expect(button.querySelector("i.fa-trash")).toBeInTheDocument();
        expect(button).toHaveTextContent("Supprimer");
    });

    test("renders custom text/btnProps/children when provided", () => {
        render(
            <RemoveComponent
                classname="season"
                id={2}
                text="Enlever"
                btnProps={{ className: "btn btn-xs btn-warning" }}
            >
                <span>Custom child</span>
            </RemoveComponent>
        );

        const button = screen.getByRole("button");
        expect(button).toHaveClass("btn btn-xs btn-warning");
        expect(button).toHaveTextContent("Custom child");
    });

    test("on confirm, DELETEs /destroy/:classname/:id and calls onSuccess with the JSON response when the backend reports success", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ success: true, message: "Supprimé" }),
        });
        const onSuccess = vi.fn();

        render(
            <RemoveComponent classname="User" id={42} onSuccess={onSuccess} />
        );
        await userEvent.click(screen.getByRole("button"));

        expect(fireMock).toHaveBeenCalledTimes(1);
        await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
        expect(onSuccess).toHaveBeenCalledWith({
            success: true,
            message: "Supprimé",
        });

        expect(globalThis.fetch).toHaveBeenCalledTimes(1);
        const [url, options] = (globalThis.fetch as any).mock.calls[0];
        expect(url).toBe("/destroy/User/42");
        expect(options.method).toBe("DELETE");
    });

    test("on confirm, calls onFailed (not onSuccess) when the backend reports success: false", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            headers: { get: () => "application/json" },
            json: () =>
                Promise.resolve({
                    success: false,
                    message: "Des réservations existent encore",
                }),
        });
        const onSuccess = vi.fn();
        const onFailed = vi.fn();

        render(
            <RemoveComponent
                classname="activity_ref"
                id={7}
                onSuccess={onSuccess}
                onFailed={onFailed}
            />
        );
        await userEvent.click(screen.getByRole("button"));

        await vi.waitFor(() => expect(onFailed).toHaveBeenCalledTimes(1));
        expect(onFailed).toHaveBeenCalledWith({
            success: false,
            message: "Des réservations existent encore",
        });
        expect(onSuccess).not.toHaveBeenCalled();
    });

    test("does not call the destroy endpoint when the confirmation popup is dismissed", async () => {
        fireMock.mockImplementation(() =>
            Promise.resolve({ isConfirmed: false })
        );
        globalThis.fetch = vi.fn();

        render(<RemoveComponent classname="User" id={1} />);
        await userEvent.click(screen.getByRole("button"));

        await vi.waitFor(() => expect(fireMock).toHaveBeenCalledTimes(1));
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    test("without onSuccess, redirects past the trailing numeric id after a successful delete", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ success: true, message: "Supprimé" }),
        });

        // `window.location` isn't configurable enough in jsdom to just set `.href` on the real
        // object here (it logs/throws on an attempted real navigation) -- swap it for a plain
        // writable stub for the duration of this test only, restored in `finally` so no other
        // test sees it.
        const originalLocation = window.location;
        Object.defineProperty(window, "location", {
            writable: true,
            value: { href: "http://localhost/users/42" },
        });

        try {
            render(<RemoveComponent classname="User" id={42} />);
            await userEvent.click(screen.getByRole("button"));

            // Confirm dialog, then (no onSuccess) the default success notice -- both resolve via
            // the shared fireMock -- then the redirect runs in that notice's `.then()`.
            await vi.waitFor(() =>
                expect(window.location.href).toBe("http://localhost/users")
            );
        } finally {
            Object.defineProperty(window, "location", {
                writable: true,
                value: originalLocation,
            });
        }
    });

    test("confirmation popup uses validationText/additionalMessage when provided", async () => {
        // Default beforeEach mock resolves isConfirmed: true, so onSubmit does go on to call
        // fetch -- give it a resolved value so that call doesn't reject unhandled.
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ success: true }),
        });

        render(
            <RemoveComponent
                classname="User"
                id={1}
                validationText="Vraiment supprimer ?"
                additionalMessage="Cette action est irréversible."
            />
        );
        await userEvent.click(screen.getByRole("button"));

        expect(fireMock).toHaveBeenCalledWith(
            expect.objectContaining({
                title: "Vraiment supprimer ?",
                text: "Cette action est irréversible.",
            })
        );
    });
});
