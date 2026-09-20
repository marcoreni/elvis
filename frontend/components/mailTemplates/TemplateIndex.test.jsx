// Regression test for TemplateIndex's migration off react-table v6 onto TanStackGrid
// (docs/Modernization-Roadmap.md item 13 batch 4b). No prior test file existed for this
// component.
//
// The "path" column used to be defined with `id: ""` (an empty string, not a real id) --
// harmless under react-table v6, but TanStack falls back to auto-deriving a column id only when
// `id`/`accessorKey` are nullish, and an empty string is not nullish, so it stuck as the literal
// column id. TanStack's `createColumn` throws ("Columns require an id when using a non-string
// header") whenever a column ends up with an empty-string id, in production too -- this would
// have crashed the whole table, not silently misbehaved. Fixed to `id: "path"`. Rendering a real
// row through the real mounted table (not a stub) is what would have caught this.
//
// Also covers `showPagination={false}` and `filterable={false}` -- both new TanStackGrid
// table-wide props used by this component (see TanStackGrid.test.tsx for their generic coverage;
// this is the check that this specific caller actually passes them through as intended).

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../../i18n";

vi.mock("sweetalert2", () => ({
    default: { fire: vi.fn(() => Promise.resolve({})) },
}));

import TemplateIndex from "./TemplateIndex";

beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
            Promise.resolve({
                templates: [
                    {
                        name: "Confirmation d'inscription",
                        path: "activity_applications/confirmation",
                        built_in: false,
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

describe("TemplateIndex", () => {
    test("renders the path column's real accessorKey value for the fetched row (regression: id was '' before)", async () => {
        await i18n.changeLanguage("fr");
        render(<TemplateIndex />);

        expect(
            await screen.findByText("activity_applications/confirmation")
        ).toBeInTheDocument();
        expect(
            screen.getByText("Confirmation d'inscription")
        ).toBeInTheDocument();
    });

    test("showPagination={false} hides the footer", async () => {
        await i18n.changeLanguage("fr");
        render(<TemplateIndex />);

        await waitFor(() =>
            expect(
                screen.getByText("activity_applications/confirmation")
            ).toBeInTheDocument()
        );
        expect(
            screen.queryByRole("button", { name: "Précédent" })
        ).not.toBeInTheDocument();
    });

    test("filterable={false} disables every column's filter row", async () => {
        await i18n.changeLanguage("fr");
        render(<TemplateIndex />);

        await waitFor(() =>
            expect(
                screen.getByText("activity_applications/confirmation")
            ).toBeInTheDocument()
        );
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
});
