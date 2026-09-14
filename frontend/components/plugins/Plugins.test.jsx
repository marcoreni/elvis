// i18n-extraction checkpoint for the item-11 finding: the whole admin plugin-management UI
// (Plugins.jsx, PluginActivationModal.jsx, PluginsList.jsx, RestartingMessage.jsx, PluginCard.jsx)
// was never run through t() at all -- hardcoded French regardless of i18n.language. One smoke
// test per representative component, not exhaustive per-string coverage (matches this repo's
// established Phase 07 checkpoint-test convention).

import React from "react";
import { render, screen } from "@testing-library/react";
import i18n from "../../i18n";
import RestartingMessage from "./RestartingMessage";
import PluginCard from "./PluginCard";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("RestartingMessage — new plugins.json namespace resolves in both locales", () => {
    test.each(["fr", "en"])(
        "renders the restarting copy in %s, not the raw i18n key",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(<RestartingMessage />);

            const expected =
                lng === "fr" ? "Redémarrage en cours..." : "Restarting...";
            expect(
                screen.getByText(expected, { exact: false })
            ).toBeInTheDocument();
            expect(
                screen.queryByText(/restarting\.title/)
            ).not.toBeInTheDocument();
        }
    );
});

describe("PluginCard — card.* strings resolve in both locales", () => {
    const plugin = { id: 1, display_name: "Test Plugin", price: false };

    test.each(["fr", "en"])(
        "renders the free/learnMore/configure copy in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(
                <PluginCard
                    plugin={plugin}
                    pluginActivated={true}
                    initialyActivated={true}
                    handleToggleActivation={() => {}}
                />
            );

            expect(
                screen.getByText(lng === "fr" ? "GRATUIT" : "FREE")
            ).toBeInTheDocument();
            expect(
                screen.getByText(lng === "fr" ? "En savoir plus" : "Learn more")
            ).toBeInTheDocument();
            expect(
                screen.getByText(lng === "fr" ? "Configurer" : "Configure")
            ).toBeInTheDocument();
        }
    );
});
