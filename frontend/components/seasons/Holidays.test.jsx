// Smoke test for Holidays' migration off react-table v6 onto TanStackGrid
// (docs/Modernization-Roadmap.md item 13 batch 4b). No prior test file existed for this
// component (frontend/components/editParameters/SchoolParameters.test.jsx covers an unrelated
// "holidays zone" setting, not this component).
//
// The "action" column used to have neither `id` nor `accessor` -- v6 tolerated this silently,
// but TanStack falls back to deriving the column id from a string `header`, which here is a
// *translated* string (`planning:holidays.columns.action`), making the id locale-dependent.
// Fixed with `id: "action"`. Not independently observable through rendered content in this test
// (fr and en both happen to translate to "Action"), but this still exercises the action column's
// real Cell (the delete button) through the real mounted table, which the id derivation feeds
// into (`cell.id`/`header.id` both build off column id).

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import i18n from "../../i18n";

vi.mock("sweetalert2", () => ({
    default: { fire: vi.fn(() => Promise.resolve({})) },
}));

import swal from "sweetalert2";
import Holidays from "./Holidays";

const DATAS = [{ label: "Toussaint", start: "2026-10-19", end: "2026-11-02" }];

afterEach(async () => {
    await i18n.changeLanguage("fr");
    vi.clearAllMocks();
});

describe("Holidays", () => {
    test("renders the translated column headers and a real data row in fr", async () => {
        await i18n.changeLanguage("fr");
        render(<Holidays datas={DATAS} sid={1} />);

        for (const header of ["Label", "Date de début", "Date de fin", "Action"]) {
            expect(screen.getByText(header)).toBeInTheDocument();
        }
        expect(screen.getByText("Toussaint")).toBeInTheDocument();
    });

    test("renders the translated column headers in en", async () => {
        await i18n.changeLanguage("en");
        render(<Holidays datas={DATAS} sid={1} />);

        for (const header of ["Label", "Start date", "End date", "Action"]) {
            expect(screen.getByText(header)).toBeInTheDocument();
        }
    });

    test("clicking the action column's delete button opens the deleteModal swal with the row's label", async () => {
        await i18n.changeLanguage("fr");
        render(<Holidays datas={DATAS} sid={1} />);

        const deleteButton = screen
            .getByText("Toussaint")
            .closest("tr")
            .querySelector("button");
        fireEvent.click(deleteButton);

        expect(swal.fire).toHaveBeenCalledTimes(1);
        expect(swal.fire.mock.calls[0][0].title).toBe(
            "Confirmez-vous la suppression de « Toussaint » ?"
        );
    });
});
