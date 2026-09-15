// i18n-extraction checkpoint for the item-11 finding: the whole admin plugin-management UI
// (Plugins.jsx, PluginActivationModal.jsx, PluginsList.jsx, RestartingMessage.jsx, PluginCard.jsx)
// was never run through t() at all -- hardcoded French regardless of i18n.language. One smoke
// test per representative component, not exhaustive per-string coverage (matches this repo's
// established Phase 07 checkpoint-test convention).

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import RestartingMessage from "./RestartingMessage";
import PluginCard from "./PluginCard";
import PluginActivationModal from "./PluginActivationModal";
import Plugins from "./Plugins";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

// --- tools/api: generic api.set() chain stub for the Plugins integration test below. GET calls
//     (getPlugins/checkRestartStatus) resolve synchronously with a fixed plugin list; POST
//     (handleSaveAndRestart) captures the body so the test can assert what was actually sent. ---
const apiState = vi.hoisted(() => ({ lastPostUrl: null, lastPostBody: null }));

const MOCK_PLUGINS = [
    { id: 1, display_name: "Plugin A", price: false, activated_at: null },
    { id: 2, display_name: "Plugin B", price: false, activated_at: null },
];

vi.mock("../../tools/api", () => ({
    set: () => {
        const chain = {};
        let successCb = () => {};
        chain.success = (fn) => {
            successCb = fn;
            return chain;
        };
        chain.error = () => chain;
        chain.useLoading = () => chain;
        chain.get = () => {
            successCb({
                plugins: MOCK_PLUGINS,
                is_restarting: false,
                display_text: null,
            });
            return chain;
        };
        chain.post = (url, body) => {
            apiState.lastPostUrl = url;
            apiState.lastPostBody = body;
            successCb({ restart: false, message: "ok" });
            return chain;
        };
        return chain;
    },
}));

vi.mock("sweetalert2", () => ({
    default: { fire: vi.fn(() => Promise.resolve({})) },
}));

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

describe("Plugins — Cancel reverts the accumulated selectedPlugins entry (regression)", () => {
    // Regression for the bug fixed here: closeModal() only reverted activatedPlugins[pluginID]
    // (the toggle's visual state) but left the corresponding entry in selectedPlugins untouched.
    // handleSaveAndRestart POSTs the whole selectedPlugins map, so a cancelled toggle used to get
    // saved anyway once a *different* plugin was later confirmed. Scenario: toggle plugin A,
    // Cancel, toggle plugin B, Confirm -> only B's toggle should reach the server.
    beforeEach(() => {
        apiState.lastPostUrl = null;
        apiState.lastPostBody = null;
    });

    test("cancelling plugin A's toggle excludes it from the POST body when plugin B is later confirmed", async () => {
        await i18n.changeLanguage("fr");
        render(<Plugins />);

        const switches = await screen.findAllByRole("switch");
        expect(switches).toHaveLength(2);

        // Toggle plugin A on, then Cancel in the confirmation modal.
        fireEvent.click(switches[0]);
        await waitFor(() =>
            expect(screen.getByText("Confirmer")).toBeInTheDocument()
        );
        fireEvent.click(screen.getByText("Annuler"));
        await waitFor(() =>
            expect(screen.queryByText("Confirmer")).not.toBeInTheDocument()
        );

        // Toggle plugin B on, then Confirm.
        fireEvent.click(switches[1]);
        await waitFor(() =>
            expect(screen.getByText("Confirmer")).toBeInTheDocument()
        );
        fireEvent.click(screen.getByText("Confirmer"));

        await waitFor(() => expect(apiState.lastPostBody).not.toBeNull());
        expect(apiState.lastPostUrl).toBe("/plugins");
        expect(apiState.lastPostBody.data).toEqual({ 2: true });
        expect(apiState.lastPostBody.data).not.toHaveProperty("1");
    });
});
