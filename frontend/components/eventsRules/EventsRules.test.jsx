// Smoke test for EventsRules' migration off react-table v6 onto TanStackGrid
// (docs/Modernization-Roadmap.md item 13 batch 4b). No prior test file existed for this
// component. `react-modal` is stubbed to `null` -- both rule modals start closed
// (`isRuleModalOpen`/`isModifyRuleModalOpen` default `false`) and their react-final-form/
// react-select content is out of scope for this smoke test, which targets the migrated
// TanStackGrid table itself. TanStackGrid's mount-time `onFetchData` fires a real `fetch`
// (uncontrolled mode, no `pagination` prop passed), so `global.fetch` is mocked per test.

import React from "react";
import { render, screen } from "@testing-library/react";
import i18n from "../../i18n";

vi.mock("react-modal", () => ({ default: () => null }));
vi.mock("sweetalert2", () => ({
    default: { fire: vi.fn(() => Promise.resolve({})) },
}));

import EventsRules from "./EventsRules";

const TEMPLATE_NAMES = [];

beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
            Promise.resolve({
                rules: [
                    {
                        id: 1,
                        name: "Bienvenue",
                        event: JSON.stringify({
                            value: "user_created",
                            label: "un utilisateur est créé",
                        }),
                        sendMail: true,
                        sendSMS: false,
                        templateName: null,
                        carbon_copy: null,
                    },
                ],
                pages: 1,
                total: 1,
            }),
    });
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
    vi.clearAllMocks();
});

describe("EventsRules", () => {
    test("renders the translated column headers and one real row in fr", async () => {
        await i18n.changeLanguage("fr");
        render(<EventsRules templateNames={TEMPLATE_NAMES} />);

        expect(await screen.findByText("Bienvenue")).toBeInTheDocument();
        expect(screen.getByText("un utilisateur est créé")).toBeInTheDocument();
        expect(screen.getByText("Nom de la règle")).toBeInTheDocument();
        expect(screen.getByText("Lors de l'évènement")).toBeInTheDocument();
        expect(screen.getByText("Actions")).toBeInTheDocument();
        expect(screen.getByText("Ajouter une règle")).toBeInTheDocument();
    });

    test("renders the translated column headers in en", async () => {
        await i18n.changeLanguage("en");
        render(<EventsRules templateNames={TEMPLATE_NAMES} />);

        expect(await screen.findByText("Bienvenue")).toBeInTheDocument();
        expect(screen.getByText("Rule name")).toBeInTheDocument();
        expect(screen.getByText("On the event")).toBeInTheDocument();
        expect(screen.getByText("Add a rule")).toBeInTheDocument();
    });
});
