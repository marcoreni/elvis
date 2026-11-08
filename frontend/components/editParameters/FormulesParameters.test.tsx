// FormulesParameters is a brand-new component (docs/KnownIssues.md: the view
// `app/views/parameters/formules_parameters_edit.html.erb` called `react_component(
// "editParameters/FormulesParameters", ...)` with no matching file at all). Built as the
// TeachersParameters.tsx-shaped editor its sibling CRUD screens already use: a single checkbox
// bound to `show_formules`, POSTed to `/parameters/formules` on save. Test shape mirrors
// TeachersParameters' own coverage in EditParameters.test.jsx (translated label/button, the
// three api outcomes: data.success / data.success === false / .error).

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import i18n from "../../i18n";

vi.mock("sweetalert2", () => ({
    default: { showLoading: vi.fn(), fire: vi.fn(() => Promise.resolve({})) },
}));

const apiState = vi.hoisted(() => ({
    lastSuccess: null as ((data: { success: boolean }) => void) | null,
    lastError: null as (() => void) | null,
    lastPost: null as { url: string; data: unknown } | null,
}));
vi.mock("../../tools/api", () => ({
    set: () => {
        const c: any = {};
        c.success = (fn: any) => {
            apiState.lastSuccess = fn;
            return c;
        };
        c.error = (fn: any) => {
            apiState.lastError = fn;
            return c;
        };
        c.before = () => c;
        c.get = () => c;
        c.post = (url: string, data: unknown) => {
            apiState.lastPost = { url, data };
            return c;
        };
        c.put = () => c;
        c.del = () => c;
        return c;
    },
}));

import swal from "sweetalert2";
import FormulesParameters from "./FormulesParameters";

const tP = (lng: string) => i18n.getFixedT(lng, "parameters");

// Success branch calls window.location.reload() -- jsdom would throw "Not implemented:
// navigation" otherwise (same stub as EditParameters.test.jsx for TeachersParameters).
const reload = vi.fn();
Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { reload, href: "http://localhost/", assign: vi.fn() },
});

beforeEach(() => {
    reload.mockClear();
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
    vi.clearAllMocks();
    apiState.lastSuccess = null;
    apiState.lastError = null;
    apiState.lastPost = null;
});

describe("FormulesParameters", () => {
    test.each(["fr", "en"])(
        "checkbox label + save button are translated in %s",
        async (lng: string) => {
            await i18n.changeLanguage(lng);
            render(<FormulesParameters show_formules={false} />);

            expect(
                screen.getByText(
                    tP(lng)("editParameters.formules.checkboxLabel")
                )
            ).toBeInTheDocument();
            expect(
                screen.getByRole("button", {
                    name: tP(lng)("shared.saveButton"),
                })
            ).toBeInTheDocument();
        }
    );

    test("the checkbox reflects the show_formules prop and toggles on click", async () => {
        await i18n.changeLanguage("fr");
        render(<FormulesParameters show_formules={false} />);

        const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
        expect(checkbox.checked).toBe(false);

        fireEvent.click(checkbox);
        expect(checkbox.checked).toBe(true);
    });

    test("save posts { show_formules } to /parameters/formules", async () => {
        await i18n.changeLanguage("fr");
        render(<FormulesParameters show_formules={false} />);

        fireEvent.click(screen.getByRole("checkbox"));
        fireEvent.click(
            screen.getByRole("button", { name: tP("fr")("shared.saveButton") })
        );

        expect(apiState.lastPost).toEqual({
            url: "/parameters/formules",
            data: { show_formules: true },
        });
    });

    test.each(["fr", "en"])(
        "api success (data.success) -> success swal + location.reload in %s",
        async (lng: string) => {
            await i18n.changeLanguage(lng);
            render(<FormulesParameters show_formules={false} />);

            fireEvent.click(
                screen.getByRole("button", {
                    name: tP(lng)("shared.saveButton"),
                })
            );
            expect(apiState.lastSuccess).toBeTypeOf("function");

            apiState.lastSuccess!({ success: true });

            expect(swal.fire).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    title: tP(lng)("shared.saveSuccessTitle"),
                    text: tP(lng)("editParameters.formules.saveSuccessText"),
                })
            );
            expect(reload).toHaveBeenCalled();
        }
    );

    test.each(["fr", "en"])(
        "api success with data.success=false -> error swal in %s",
        async (lng: string) => {
            await i18n.changeLanguage(lng);
            render(<FormulesParameters show_formules={false} />);

            fireEvent.click(
                screen.getByRole("button", {
                    name: tP(lng)("shared.saveButton"),
                })
            );
            apiState.lastSuccess!({ success: false });

            expect(swal.fire).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    title: tP(lng)("shared.errorTitle"),
                    text: tP(lng)("editParameters.formules.saveErrorText"),
                })
            );
            expect(reload).not.toHaveBeenCalled();
        }
    );

    test.each(["fr", "en"])(
        "api .error callback -> error swal in %s",
        async (lng: string) => {
            await i18n.changeLanguage(lng);
            render(<FormulesParameters show_formules={false} />);

            fireEvent.click(
                screen.getByRole("button", {
                    name: tP(lng)("shared.saveButton"),
                })
            );
            expect(apiState.lastError).toBeTypeOf("function");
            apiState.lastError!();

            expect(swal.fire).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    title: tP(lng)("shared.errorTitle"),
                    text: tP(lng)("editParameters.formules.saveErrorText"),
                })
            );
        }
    );
});
