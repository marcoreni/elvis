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

    // All 14 real call sites (Planning.jsx, PaymentsManagement.jsx) use position:
    // "bottom-center" specifically -- the variant the application.scss override
    // targets to keep the container from rendering off-screen (v11 centers it via
    // `transform: translateX(-50%)`, not v4's `margin-left` trick). jsdom can't
    // validate the resulting CSS transform/layout itself, but this at least pins
    // that the container the SCSS fix selects for still carries both classes.
    it("renders a bottom-center toast under a container that carries both the app's and react-toastify's own position class", async () => {
        render(<Toaster />);

        act(() => {
            toast.success("Bottom-center regression toast", {
                position: "bottom-center",
            });
        });

        const toastEl = await screen.findByText(
            "Bottom-center regression toast"
        );
        const container = toastEl.closest(".toast-container");
        expect(container).toBeInTheDocument();
        expect(container).toHaveClass(
            "Toastify__toast-container--bottom-center"
        );
    });
});
