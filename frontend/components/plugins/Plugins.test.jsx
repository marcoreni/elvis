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
import PluginActivationModal from "./PluginActivationModal";

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

describe("PluginActivationModal — confirmToggle resolves the right verb in both locales", () => {
    // Pins the nested t() call (confirmToggle interpolating a separate activate/deactivate key) --
    // the one place this extraction went wrong once already (a caught-before-ship inverted
    // ternary). Asserts the full sentence, not just the verb: "activer" is a substring of
    // "désactiver" (same for activate/deactivate), so a regex/substring match on the verb alone
    // would pass even if the wrong branch rendered. Note the "1" plugin id below plays the role of
    // Object.keys(plugins)[0], the actual (pre-existing, tracked in docs/KnownIssues.md) source of
    // which plugin the modal describes -- not something this test is meant to cover.
    test.each([
        ["fr", true, "Êtes-vous sûr(e) de vouloir activer ce plugin ?"],
        ["fr", false, "Êtes-vous sûr(e) de vouloir désactiver ce plugin ?"],
        ["en", true, "Are you sure you want to activate this plugin?"],
        ["en", false, "Are you sure you want to deactivate this plugin?"],
    ])(
        "%s: isActivated=%s renders '%s'",
        async (lng, isActivated, expectedSentence) => {
            await i18n.changeLanguage(lng);
            render(
                <PluginActivationModal
                    isOpen={true}
                    plugins={{ 1: true }}
                    activatedPlugins={{ 1: isActivated }}
                    onCancel={() => {}}
                    onClose={() => {}}
                    handleSaveAndRestart={() => {}}
                />
            );

            expect(screen.getByText(expectedSentence)).toBeInTheDocument();
        }
    );
});
