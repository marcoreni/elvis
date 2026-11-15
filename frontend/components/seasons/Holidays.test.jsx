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
import userEvent from "@testing-library/user-event";
import i18n from "../../i18n";
// editModal's preConfirm reads/writes its popup's inputs via jQuery (`$`), matching addModal's
// existing real-markup approach -- real jQuery (not jsdom's own query APIs) is needed to exercise
// it the same way the component's own code does.
import "../../expose-jquery";

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

        for (const header of [
            "Label",
            "Date de début",
            "Date de fin",
            "Action",
        ]) {
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

        // Action column order is [edit, delete] -- see the "editModal" tests below for the
        // first button.
        const deleteButton = screen
            .getByText("Toussaint")
            .closest("tr")
            .querySelectorAll("button")[1];
        fireEvent.click(deleteButton);

        expect(swal.fire).toHaveBeenCalledTimes(1);
        expect(swal.fire.mock.calls[0][0].title).toBe(
            "Confirmez-vous la suppression de « Toussaint » ?"
        );
    });
});

// Coverage for the "edit holiday" affordance (item 5): an edit button in the action column,
// reusing addModal's own swal-with-raw-HTML-inputs machinery (prefilled this time) and the new
// `PATCH /season/:id/holidays` endpoint. swal.fire itself stays mocked (see the top-level mock
// above) -- these tests inspect the config object passed to it and invoke `preConfirm` directly,
// since the mock never renders the popup's actual DOM.
describe("Holidays — editModal", () => {
    beforeEach(() => {
        // preConfirm reads/writes these via jQuery ids, same as addModal's real popup markup
        // would once rendered -- the mocked swal.fire never renders that markup, so it's stood up
        // by hand here.
        document.body.innerHTML =
            '<input id="ds" /><input id="de" /><div id="er"></div>';
    });

    afterEach(() => {
        document.body.innerHTML = "";
        delete global.fetch;
    });

    function clickEditButton() {
        const editButton = screen
            .getByText("Toussaint")
            .closest("tr")
            .querySelectorAll("button")[0];
        fireEvent.click(editButton);
    }

    test("opens prefilled with the row's current label/start/end", async () => {
        await i18n.changeLanguage("fr");
        render(<Holidays datas={DATAS} sid={1} />);

        clickEditButton();

        expect(swal.fire).toHaveBeenCalledTimes(1);
        const config = swal.fire.mock.calls[0][0];
        expect(config.title).toBe("Modifier les vacances ou le jour férié");
        expect(config.inputValue).toBe("Toussaint");
        expect(config.html).toContain('value="2026-10-19"');
        expect(config.html).toContain('value="2026-11-02"');
    });

    test("preConfirm PATCHes the identifying triple plus the new_* values and resolves with the response body", async () => {
        await i18n.changeLanguage("fr");
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () =>
                Promise.resolve({
                    label: "Toussaint (modifié)",
                    start: "2026-10-20",
                    end: "2026-11-03",
                }),
        });
        render(<Holidays datas={DATAS} sid={1} />);

        clickEditButton();
        const { preConfirm } = swal.fire.mock.calls[0][0];

        $("#ds").val("2026-10-20");
        $("#de").val("2026-11-03");
        const result = await preConfirm("Toussaint (modifié)");

        expect(global.fetch).toHaveBeenCalledWith(
            "/season/1/holidays",
            expect.objectContaining({
                method: "PATCH",
                body: JSON.stringify({
                    label: "Toussaint",
                    start: "2026-10-19",
                    end: "2026-11-02",
                    new_label: "Toussaint (modifié)",
                    new_start: "2026-10-20",
                    new_end: "2026-11-03",
                }),
            })
        );
        expect(result).toEqual({
            label: "Toussaint (modifié)",
            start: "2026-10-20",
            end: "2026-11-03",
        });
    });

    test("preConfirm shows the server's localized 422 errors and keeps the popup open", async () => {
        await i18n.changeLanguage("fr");
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            json: () =>
                Promise.resolve({
                    errors: [
                        "La date de début ne peut pas être après la date de fin.",
                    ],
                }),
        });
        render(<Holidays datas={DATAS} sid={1} />);

        clickEditButton();
        const { preConfirm } = swal.fire.mock.calls[0][0];

        $("#ds").val("2026-11-03");
        $("#de").val("2026-10-20");
        const result = await preConfirm("Toussaint");

        expect(result).toBe(false);
        expect($("#er").text()).toBe(
            "La date de début ne peut pas être après la date de fin."
        );
    });

    test("preConfirm rejects a blank new label client-side without calling fetch", async () => {
        await i18n.changeLanguage("fr");
        global.fetch = vi.fn();
        render(<Holidays datas={DATAS} sid={1} />);

        clickEditButton();
        const { preConfirm } = swal.fire.mock.calls[0][0];

        $("#ds").val("2026-10-20");
        $("#de").val("2026-11-03");
        const result = await preConfirm("");

        expect(result).toBe(false);
        expect(global.fetch).not.toHaveBeenCalled();
        expect($("#er").text()).toBe("Un des champs est vide.");
    });

    test("a confirmed edit replaces the row's label/start/end in local state", async () => {
        await i18n.changeLanguage("fr");
        swal.fire.mockResolvedValueOnce({
            value: {
                label: "Toussaint (modifié)",
                start: "2026-10-20",
                end: "2026-11-03",
            },
        });
        render(<Holidays datas={DATAS} sid={1} />);

        clickEditButton();

        expect(
            await screen.findByText("Toussaint (modifié)")
        ).toBeInTheDocument();
        expect(screen.queryByText("Toussaint")).not.toBeInTheDocument();
    });
});

// Regression coverage for the infinite-render loop fixed in `changeData` (see the comment there):
// it used to rebuild the controlled `pagination` prop from a fresh object literal on every
// `onFetchData` call, feeding straight back into TanStackGrid's onFetchData effect (keyed on
// `pagination` by reference) and firing again forever. None of the tests above ever click
// pagination, so they wouldn't have caught it. 20 rows at the real pageSize of 15 (see the
// constructor) spans exactly 2 pages, so Next/Previous is exercised for real. If the loop ever
// comes back, these tests hang past Vitest's default timeout instead of passing silently.
const PAGED_DATAS = Array.from({ length: 20 }, (_, i) => ({
    label: `Holiday ${String(i).padStart(2, "0")}`,
    start: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
    end: `2026-01-${String((i % 28) + 1).padStart(2, "0")}`,
}));

describe("Holidays — pagination", () => {
    test("Next/Previous actually change the visible rows, and repeated clicks resolve promptly", async () => {
        await i18n.changeLanguage("fr");
        render(<Holidays datas={PAGED_DATAS} sid={1} />);

        // Page 1 of 2 (pageSize 15): first 15 rows, none of page 2's.
        expect(screen.getByText("Holiday 00")).toBeInTheDocument();
        expect(screen.getByText("Holiday 14")).toBeInTheDocument();
        expect(screen.queryByText("Holiday 15")).not.toBeInTheDocument();
        expect(screen.getByText("Page 1 sur 2")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Suivant" }));

        // Page 2: the remaining 5 rows, none of page 1's.
        expect(screen.getByText("Holiday 15")).toBeInTheDocument();
        expect(screen.getByText("Holiday 19")).toBeInTheDocument();
        expect(screen.queryByText("Holiday 00")).not.toBeInTheDocument();
        expect(screen.getByText("Page 2 sur 2")).toBeInTheDocument();

        // Click back and forth a few more times -- the old bug looped forever on its own (via the
        // onFetchData effect), independent of any click, so this mainly proves the fix holds up
        // under repeated interaction rather than only on mount.
        await userEvent.click(
            screen.getByRole("button", { name: "Précédent" })
        );
        await userEvent.click(screen.getByRole("button", { name: "Suivant" }));
        await userEvent.click(
            screen.getByRole("button", { name: "Précédent" })
        );

        expect(screen.getByText("Holiday 00")).toBeInTheDocument();
        expect(screen.queryByText("Holiday 15")).not.toBeInTheDocument();
        expect(screen.getByText("Page 1 sur 2")).toBeInTheDocument();
    });

    test("changing the page-size selector re-slices the visible rows", async () => {
        await i18n.changeLanguage("fr");
        render(<Holidays datas={PAGED_DATAS} sid={1} />);

        expect(screen.getByText("Holiday 14")).toBeInTheDocument();

        await userEvent.selectOptions(screen.getByRole("combobox"), "5");

        expect(screen.getByText("Holiday 00")).toBeInTheDocument();
        expect(screen.getByText("Holiday 04")).toBeInTheDocument();
        expect(screen.queryByText("Holiday 05")).not.toBeInTheDocument();
        expect(screen.getByText("Page 1 sur 4")).toBeInTheDocument();
    });
});
