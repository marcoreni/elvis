// Smoke test for AdhesionList's migration off react-table v6 onto TanStackGrid
// (docs/Modernization-Roadmap.md item 13 batch 4b). No prior test file existed for this
// component. Renders one real row through the real mounted table (not a stub) to cover the
// mechanic of the diff: the fixed `data: data.adhesions || []` fallback and the new
// `totalCount={this.state.total}` prop feeding the "N results" footer.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../i18n";

vi.mock("sweetalert2", () => ({
    default: { fire: vi.fn(() => Promise.resolve({})) },
}));

import AdhesionList from "./AdhesionList";

// The currently-sorted column (here, validity_end_date via defaultSorted) gets a trailing
// sort-arrow decoration as a sibling text node -- strip it, it's incidental to what this test
// actually checks (i18n of the header labels). Mirrors the same helper in
// Practice/PracticeTables.test.jsx.
function getRenderedHeaders(container) {
    return [...container.querySelectorAll("thead tr:first-child th")].map(
        (th) => th.textContent.replace(/ [▲▼]$/, "")
    );
}

beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
            Promise.resolve({
                adhesions: [
                    {
                        id: 1,
                        user: {
                            id: 7,
                            adherent_number: "A007",
                            last_name: "Blin",
                            first_name: "Ana",
                        },
                        validity_start_date: null,
                        validity_end_date: null,
                        last_reminder: null,
                        adhesion_price: { price: 42 },
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

describe("AdhesionList", () => {
    test("renders the translated column headers and one real row, plus the totalCount footer", async () => {
        await i18n.changeLanguage("fr");
        const { container } = render(<AdhesionList />);

        const got = getRenderedHeaders(container);
        for (const header of [
            "Nom",
            "Prénom",
            "Date de début",
            "Date de fin",
            "Prix de l'adhésion",
            "Actions",
            "Dernière relance",
        ]) {
            expect(got).toContain(header);
        }

        expect(await screen.findByText("Blin")).toBeInTheDocument();
        expect(screen.getByText("Ana")).toBeInTheDocument();
        expect(screen.getByText("A007")).toBeInTheDocument();

        // totalCount -> the h3 footer, fed from `this.state.total` set by the fetch response
        // above (data.adhesions || [] fallback, and the new totalCount prop on TanStackGrid).
        expect(
            await screen.findByText("1 adhésion au total")
        ).toBeInTheDocument();
    });
});
