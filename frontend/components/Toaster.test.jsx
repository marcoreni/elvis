import React, { act } from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { toast } from "react-toastify";
import Toaster from "./Toaster";

// Regression coverage for the react-toastify 4 -> 11 bump: v8 introduced a "light" default theme
// (previously toasts were always colored by type) and per-type icons, v10 flipped closeOnClick's
// default to false. Toaster.jsx now sets closeOnClick/theme="colored"/icon={false} explicitly to
// preserve the pre-bump look/behavior -- this pins that configuration against the real library.
describe("Toaster", () => {
    afterEach(() => {
        act(() => toast.dismiss());
    });

    it("renders toasts colored, iconless, click-dismissible, and under the app's `.toast-container` class (the pre-bump defaults)", async () => {
        render(<Toaster />);

        act(() => {
            toast.success("Regression test toast");
        });

        const toastEl = await screen.findByText("Regression test toast");
        expect(toastEl).toHaveClass("Toastify__toast-theme--colored");
        expect(toastEl).toHaveClass("Toastify__toast--close-on-click");
        expect(
            toastEl.querySelector(".Toastify__toast-icon")
        ).not.toBeInTheDocument();
        expect(toastEl.closest(".toast-container")).toBeInTheDocument();
    });
});
