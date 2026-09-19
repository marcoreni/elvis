// i18n extraction test for BaseDataTable.jsx (frontend/components/common/baseDataTable/), a
// KnownIssues.md follow-up: this shared fn component used to hardcode its modal-title templates
// and pagination strings in French regardless of the active UI language, producing mixed-language
// chrome ("Créer a discount rate") for call sites that already passed a translated resource name
// (Coupons.jsx, ActivityRefBasics.jsx, EditFormule.jsx). It now reads everything from
// `useTranslation("common")` under a new `baseDataTable.*` block (+ the pre-existing
// `common:reactTable.*` pagination keys).
//
// Since the TanStack Table v8 rewrite (docs/Modernization-Roadmap.md item 13), the table itself is
// headless -- this component renders real `<table>` markup instead of delegating to a v6 black-box
// component -- so these tests render for real and assert on visible DOM instead of mocking
// "react-table" and inspecting stashed props.

import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import i18n from "../../../i18n";
import BaseDataTable from "./BaseDataTable";

const makeDataService = (overrides = {}) => ({
    listData: () => Promise.resolve({ data: [], pages: 1 }),
    createData: () => Promise.resolve({}),
    updateData: () => Promise.resolve({}),
    deleteData: () => Promise.resolve({}),
    ...overrides,
});

// BaseDataTable's "actions" column binds `onEdit={() => showItemFormModal(true, props.original)}`
// (item already baked in -- callers invoke it with no args) but `onDelete={showDeleteItemModal}`
// (the bare setter -- callers are expected to supply the item themselves), matching every real
// actionButtons implementation in this repo (DefaultActionButtons.jsx, CouponsActionButtons.jsx
// both call `onDelete(item)`).
const ActionButtons = ({ item, onEdit, onDelete }) => (
    <div>
        <button onClick={() => onEdit()}>edit-{item.id}</button>
        <button onClick={() => onDelete(item)}>delete-{item.id}</button>
    </div>
);

const CreateButton = ({ onCreate }) => (
    <button onClick={onCreate}>create</button>
);

const FormContent = () => <div>form content</div>;

const waitForDebouncedFetch = () =>
    act(() => new Promise((resolve) => setTimeout(resolve, 450)));

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("BaseDataTable — pagination chrome follows the active UI language", () => {
    for (const lng of ["fr", "en"]) {
        test(`${lng}: previousText/nextText/pageText/ofText/resultsCount come from common:*`, async () => {
            await i18n.changeLanguage(lng);
            render(
                <BaseDataTable
                    dataService={makeDataService()}
                    columns={[]}
                    oneResourceTypeName="x"
                />
            );

            expect(
                screen.getByRole("status", {
                    name: i18n.getFixedT(
                        lng,
                        "common"
                    )("reactTable.loadingText"),
                })
            ).toBeInTheDocument();
            await waitForDebouncedFetch();

            const t = i18n.getFixedT(lng, "common");
            const grid = screen.getByTestId("table-x");
            expect(
                screen.getByRole("button", {
                    name: t("reactTable.previousText"),
                })
            ).toBeInTheDocument();
            expect(
                screen.getByRole("button", { name: t("reactTable.nextText") })
            ).toBeInTheDocument();
            expect(grid.textContent).toContain(t("reactTable.pageText"));
            expect(grid.textContent).toContain(t("reactTable.ofText"));
            expect(grid.textContent).toContain(
                t("baseDataTable.resultsCount", { count: 0 })
            );
        });
    }

    // Regression: the results-count footer used to interpolate the raw common:reactTable.rowsText
    // string ("results", plural-only) after the count, producing "1 results" for a single row.
    // common:baseDataTable.resultsCount is now a proper i18next plural key (_one/_other).
    test("results count is grammatically singular for exactly 1 row", async () => {
        await i18n.changeLanguage("en");
        const dataService = makeDataService({
            listData: () => Promise.resolve({ data: [{ id: 1 }], pages: 1 }),
        });
        render(
            <BaseDataTable
                dataService={dataService}
                columns={[]}
                oneResourceTypeName="x"
            />
        );
        await waitForDebouncedFetch();

        expect(screen.getByText("1 result")).toBeInTheDocument();
        expect(screen.queryByText("1 results")).not.toBeInTheDocument();
    });

    // fr and en happen to both render "Page" for common:reactTable.pageText, so the loop above
    // can't tell "wired through i18n" apart from "still the old hardcoded pageText='Page'" for
    // this one key (see PR #66 for the same class of gap: an assertion that's byte-identical
    // between locales can't distinguish the two). Override the resource value instead, so the
    // assertion only passes if pageText is actually being read from i18n at render time.
    test("pageText is read from common:reactTable.pageText at render time (not hardcoded)", async () => {
        await i18n.changeLanguage("en");
        i18n.addResource(
            "en",
            "common",
            "reactTable.pageText",
            "PAGE-OVERRIDE"
        );
        try {
            render(
                <BaseDataTable
                    dataService={makeDataService()}
                    columns={[]}
                    oneResourceTypeName="x"
                />
            );
            await waitForDebouncedFetch();
            expect(screen.getByTestId("table-x").textContent).toContain(
                "PAGE-OVERRIDE"
            );
        } finally {
            i18n.addResource("en", "common", "reactTable.pageText", "Page");
        }
    });

    test("noDataText falls back to common:reactTable.noDataText while no fetch error has occurred", async () => {
        await i18n.changeLanguage("en");
        render(
            <BaseDataTable
                dataService={makeDataService()}
                columns={[]}
                oneResourceTypeName="x"
            />
        );
        await waitForDebouncedFetch();

        expect(
            screen.getByText(
                i18n.getFixedT("en", "common")("reactTable.noDataText")
            )
        ).toBeInTheDocument();
    });

    // Regression: the fetch-error message was a hardcoded French literal
    // ("Une erreur est survenue..."), not routed through i18n, so it couldn't have shown in English
    // even though it displaces noDataText on a failed fetch.
    test("noDataText shows the translated common:baseDataTable.loadError after a failed fetch", async () => {
        await i18n.changeLanguage("en");
        const dataService = makeDataService({
            listData: () => Promise.reject(new Error("boom")),
        });
        render(
            <BaseDataTable
                dataService={dataService}
                columns={[]}
                oneResourceTypeName="x"
            />
        );
        await waitForDebouncedFetch();

        expect(
            screen.getByText(
                i18n.getFixedT("en", "common")("baseDataTable.loadError")
            )
        ).toBeInTheDocument();
    });

    // Regression coverage for the errorMessage/noDataText interaction the other direction: a
    // *successful* fetch must clear any previously-set errorMessage (fetchData's `.then` branch
    // sets `errorMessage: null`) so noDataText reverts to the plain translated
    // common:reactTable.noDataText fallback instead of getting stuck on a stale error. Typing into
    // a column's filter input is the real, user-triggered path that re-runs fetchData without
    // changing page/sort (the table has no auto-retry).
    test("noDataText reverts to common:reactTable.noDataText after a successful fetch clears a prior error", async () => {
        await i18n.changeLanguage("en");
        let shouldFail = true;
        const dataService = makeDataService({
            listData: () =>
                shouldFail
                    ? Promise.reject(new Error("boom"))
                    : Promise.resolve({ data: [], pages: 1 }),
        });
        render(
            <BaseDataTable
                dataService={dataService}
                columns={[{ id: "name", Header: "Name", accessor: "name" }]}
                oneResourceTypeName="x"
            />
        );
        await waitForDebouncedFetch();
        expect(
            screen.getByText(
                i18n.getFixedT("en", "common")("baseDataTable.loadError")
            )
        ).toBeInTheDocument();

        shouldFail = false;
        fireEvent.change(screen.getByRole("textbox"), {
            target: { value: "a" },
        });
        await waitForDebouncedFetch();

        expect(
            screen.getByText(
                i18n.getFixedT("en", "common")("reactTable.noDataText")
            )
        ).toBeInTheDocument();
    });
});

describe("BaseDataTable — column adapter (v6-shaped column defs onto TanStack Table v8)", () => {
    // PricingCategoriesEdit.jsx's boolean column destructures {value} rather than {original} --
    // a distinct real-world shape from the actions-column Cell exercised by the other tests here,
    // which reads .original. Also covers a dot-path string accessor for the same reason
    // (ActivityRefBasics.jsx/EditFormule.jsx access "pricing_category.name").
    test("a Cell destructuring {value}, and a dot-path string accessor, both resolve against real row data", async () => {
        const dataService = makeDataService({
            listData: () =>
                Promise.resolve({
                    data: [
                        {
                            id: 1,
                            is_a_pack: true,
                            pricing_category: { name: "Trimestre" },
                        },
                    ],
                    pages: 1,
                }),
        });
        render(
            <BaseDataTable
                dataService={dataService}
                columns={[
                    {
                        id: "pricing_name",
                        Header: "Name",
                        accessor: "pricing_category.name",
                    },
                    {
                        id: "is_pack",
                        Header: "Pack",
                        accessor: "is_a_pack",
                        Cell: ({ value }) => (value ? "yes" : "no"),
                    },
                ]}
                oneResourceTypeName="x"
            />
        );
        await waitForDebouncedFetch();

        expect(screen.getByText("Trimestre")).toBeInTheDocument();
        expect(screen.getByText("yes")).toBeInTheDocument();
    });
});

describe("BaseDataTable — fullscreen button tooltip follows the active UI language", () => {
    for (const lng of ["fr", "en"]) {
        test(`${lng}: data-tippy-content comes from common:baseDataTable.fullScreenTooltip`, async () => {
            await i18n.changeLanguage(lng);
            render(
                <BaseDataTable
                    dataService={makeDataService()}
                    columns={[]}
                    oneResourceTypeName="x"
                    showFullScreenButton
                />
            );

            const expected = i18n.getFixedT(
                lng,
                "common"
            )("baseDataTable.fullScreenTooltip");
            expect(
                document.querySelector(`[data-tippy-content="${expected}"]`)
            ).not.toBeNull();
        });
    }
});

describe("BaseDataTable — modal titles interpolate the resource name via common:baseDataTable.*", () => {
    const props = {
        dataService: makeDataService(),
        columns: [],
        oneResourceTypeName: "a discount rate",
        actionButtons: ActionButtons,
        createButton: CreateButton,
        formContentComponent: FormContent,
        labellizer: (item) => item.label,
    };

    test("fr: create/update modal titles use the fr baseDataTable templates", async () => {
        await i18n.changeLanguage("fr");
        render(<BaseDataTable {...props} />);

        fireEvent.click(screen.getByText("create"));
        expect(
            screen.getByRole("heading", { name: "Créer a discount rate" })
        ).toBeInTheDocument();
    });

    test("en: create/update modal titles use the en baseDataTable templates (no mixed-language 'Créer')", async () => {
        await i18n.changeLanguage("en");
        render(<BaseDataTable {...props} />);

        fireEvent.click(screen.getByText("create"));
        expect(
            screen.getByRole("heading", { name: "Create a discount rate" })
        ).toBeInTheDocument();
    });
});

describe("BaseDataTable — delete modal question falls back to common:baseDataTable.defaultResource", () => {
    const item = { id: 1, label: "Summer sale" };
    const makeProps = (overrides = {}) => ({
        dataService: makeDataService({
            listData: () => Promise.resolve({ data: [item], pages: 1 }),
        }),
        columns: [{ id: "id", accessor: "id" }],
        oneResourceTypeName: "a discount rate",
        actionButtons: ActionButtons,
        labellizer: (i) => i.label,
        ...overrides,
    });

    test("fr: with no thisResourceTypeName, the question falls back to 'cet élément', and includes the labellized item", async () => {
        await i18n.changeLanguage("fr");
        render(<BaseDataTable {...makeProps()} />);
        await waitForDebouncedFetch();

        fireEvent.click(screen.getByText(`delete-${item.id}`));
        expect(
            screen.getByText(
                "Voulez-vous vraiment supprimer cet élément : Summer sale ?",
                { exact: false }
            )
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: "Supprimer a discount rate" })
        ).toBeInTheDocument();
    });

    test("en: an explicit thisResourceTypeName is used instead of the default, and the title comes from common:baseDataTable.deleteTitle", async () => {
        await i18n.changeLanguage("en");
        render(
            <BaseDataTable
                {...makeProps({ thisResourceTypeName: "this discount rate" })}
            />
        );
        await waitForDebouncedFetch();

        fireEvent.click(screen.getByText(`delete-${item.id}`));
        expect(
            screen.getByText(
                /Do you really want to delete this discount rate: Summer sale\?/
            )
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: "Delete a discount rate" })
        ).toBeInTheDocument();
    });
});
