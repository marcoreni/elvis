// Component test for BaseParameters.tsx -- new coverage for the class -> functional conversion
// (the only class component in jsx-to-tsx batch 1). ParametersChrome.test.jsx already exercises
// BaseParameters indirectly through its real callers (translated tab labels, click-to-activate),
// but not the location.hash-driven initial tab / hash-sync-on-click behavior that used to live in
// componentDidMount/componentDidUpdate, or the divObjects prop-sync -- covered here directly.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test } from "vitest";
import BaseParameters from "./BaseParameters";

afterEach(() => {
    window.location.hash = "";
});

describe("BaseParameters", () => {
    test("defaults to the first tab, and syncs the URL hash to it", () => {
        render(
            <BaseParameters
                tabsNames={["Un", "Deux"]}
                divObjects={[
                    <div key="a">Contenu un</div>,
                    <div key="b">Contenu deux</div>,
                ]}
            />
        );

        expect(screen.getByText("Un").closest("li")).toHaveClass("active");
        expect(screen.getByText("Contenu un")).toBeInTheDocument();
        expect(screen.queryByText("Contenu deux")).not.toBeInTheDocument();
        expect(window.location.hash).toBe("#tab-0");
    });

    test("activates the tab named in the initial location hash instead of the first one", () => {
        window.location.hash = "#tab-1";

        render(
            <BaseParameters
                tabsNames={["Un", "Deux"]}
                divObjects={[
                    <div key="a">Contenu un</div>,
                    <div key="b">Contenu deux</div>,
                ]}
            />
        );

        expect(screen.getByText("Deux").closest("li")).toHaveClass("active");
        expect(screen.getByText("Contenu deux")).toBeInTheDocument();
    });

    test("clicking a tab activates it, updates the hash, and keeps previously-shown tabs mounted", async () => {
        render(
            <BaseParameters
                tabsNames={["Un", "Deux"]}
                divObjects={[
                    <div key="a">Contenu un</div>,
                    <div key="b">Contenu deux</div>,
                ]}
            />
        );

        await userEvent.click(screen.getByText("Deux"));

        expect(window.location.hash).toBe("#tab-1");
        expect(screen.getByText("Contenu deux")).toBeInTheDocument();
        // Once-shown tabs stay rendered (hidden by CSS, not unmounted) even after switching away.
        expect(screen.getByText("Contenu un")).toBeInTheDocument();
    });

    test("re-renders with new divObjects when the prop changes", () => {
        const { rerender } = render(
            <BaseParameters
                tabsNames={["Un"]}
                divObjects={[<div key="a">Avant</div>]}
            />
        );
        expect(screen.getByText("Avant")).toBeInTheDocument();

        rerender(
            <BaseParameters
                tabsNames={["Un"]}
                divObjects={[<div key="a">Après</div>]}
            />
        );
        expect(screen.getByText("Après")).toBeInTheDocument();
        expect(screen.queryByText("Avant")).not.toBeInTheDocument();
    });
});
