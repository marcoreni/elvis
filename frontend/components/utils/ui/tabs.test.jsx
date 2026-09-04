// Component test for TabbedComponent (frontend/components/utils/ui/tabs.jsx). Its "tab is in
// error" tooltip used to be a hardcoded French literal ("Cet onglet n'est pas complètement
// rempli") — see docs/KnownIssues.md's former "components/utils/ui/tabs.jsx" entry. Now sourced
// from `common:tabs.incomplete` via `useTranslation("common")`. TabbedComponent is a plain
// function component (not a StepZilla step, not extended by anything), so it can call the hook
// directly with no HOC-wrapping gate to worry about.
//
// Renaming note: the tab-object map/filter parameter used to be named `t`, shadowing
// useTranslation's `t` inside those callbacks — renamed to `tab` throughout so the translation
// function stays reachable everywhere it's used (see reference_i18n_extraction_patterns gotcha
// #5: ".map(t => …) shadows useTranslation's t").

import React from "react";
import { render, screen } from "@testing-library/react";
import i18n from "../../../i18n";
import TabbedComponent from "./tabs";

const makeTabs = (overrides = {}) => [
    {
        id: "tab_one",
        header: "Premier onglet",
        isInError: false,
        body: <div>Body one</div>,
        ...overrides,
    },
    {
        id: "tab_two",
        header: "Deuxième onglet",
        isInError: true,
        body: <div>Body two</div>,
    },
];

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("TabbedComponent", () => {
    test("renders headers and no title attribute when a tab is not in error", () => {
        render(<TabbedComponent tabs={makeTabs()} />);

        const firstTabItem = screen.getByText("Premier onglet").closest("li");
        expect(firstTabItem).not.toHaveAttribute("title");
    });

    test("renders the French tooltip on an in-error tab by default", () => {
        render(<TabbedComponent tabs={makeTabs()} />);

        const secondTabItem = screen.getByText("Deuxième onglet").closest("li");
        expect(secondTabItem).toHaveAttribute(
            "title",
            "Cet onglet n'est pas complètement rempli"
        );
    });

    test("renders the English tooltip on an in-error tab when the active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<TabbedComponent tabs={makeTabs()} />);

        const secondTabItem = screen.getByText("Deuxième onglet").closest("li");
        expect(secondTabItem).toHaveAttribute("title", "This tab is not fully filled in");
    });

    test("a tab tripped into error via setTabError (not just the isInError prop) also gets the localized tooltip", () => {
        // TabbedComponent tracks a second error source: the mounted tab body can call
        // `setTabError(true)` (threaded into `body.props` by TabbedComponent itself), independent
        // of the `isInError` prop. Both paths render the same `tabErrorState[tab.id] || tab.isInError`
        // condition, so this exercises the other half of that OR.
        function ErrorProneBody({ setTabError }) {
            // Mount-only: TabbedComponent recreates `setTabError`'s closure identity on every
            // render (it's built inline in the JSX spread passed to `tab.body`), so depending on
            // it here would re-fire this effect every render — an infinite render loop, since
            // calling it triggers the state update that causes the next render.
            React.useEffect(() => {
                setTabError(true);
                // eslint-disable-next-line react-hooks/exhaustive-deps
            }, []);
            return <div>Body</div>;
        }

        render(
            <TabbedComponent
                tabs={[
                    {
                        id: "tab_one",
                        header: "Premier onglet",
                        active: true,
                        body: <ErrorProneBody />,
                    },
                ]}
            />
        );

        const tabItem = screen.getByText("Premier onglet").closest("li");
        expect(tabItem).toHaveAttribute("title", "Cet onglet n'est pas complètement rempli");
    });
});
