// i18n extraction test for BaseDataTable.jsx (frontend/components/common/baseDataTable/), a
// KnownIssues.md follow-up: this shared fn component used to hardcode its modal-title templates
// and react-table pagination strings in French regardless of the active UI language, producing
// mixed-language chrome ("Créer a discount rate") for call sites that already passed a translated
// resource name (Coupons.jsx, ActivityRefBasics.jsx, EditFormule.jsx). It now reads everything from
// `useTranslation("common")` under a new `baseDataTable.*` block (+ the pre-existing
// `common:reactTable.*` pagination keys).
//
// `react-table` (v6, pulled in transitively through ReactTableFullScreen) does DOM measurement that
// does not run cleanly in jsdom, so it is mocked the same way as elsewhere in this repo: the stub
// stashes its own props for direct assertion instead of rendering a real grid.

import React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import i18n from "../../../i18n";
import BaseDataTable from "./BaseDataTable";

let lastReactTableProps = null;
vi.mock("react-table", () => ({
    default: props => {
        lastReactTableProps = props;
        return <div data-testid="react-table-stub" />;
    },
}));

const makeDataService = (overrides = {}) => ({
    listData: () => Promise.resolve({data: [], pages: 1}),
    createData: () => Promise.resolve({}),
    updateData: () => Promise.resolve({}),
    deleteData: () => Promise.resolve({}),
    ...overrides,
});

// Renders a button that fires onEdit/onDelete on click, so a test can reach the modals the way a
// real actionButtons implementation (e.g. CouponsActionButtons/DefaultActionButtons) would. It
// only ever mounts inside the "actions" column's Cell render prop -- react-table itself is mocked
// and never invokes Cell, so a test has to reach it directly through the stashed columns (see
// `renderActionButtons` below).
//
// BaseDataTable's Cell binds `onEdit={() => showItemFormModal(true, props.original)}` (item
// already baked in -- callers invoke it with no args) but `onDelete={showDeleteItemModal}` (the
// bare setter -- callers are expected to supply the item themselves), matching every real
// actionButtons implementation in this repo (DefaultActionButtons.jsx, CouponsActionButtons.jsx
// both call `onDelete(item)`). Calling `onDelete()` here with no argument would leave
// `state.item` undefined and silently defeat any assertion on the delete question's interpolated
// label.
const ActionButtons = ({item, onEdit, onDelete}) => (
    <div>
        <button onClick={() => onEdit()}>edit-{item.id}</button>
        <button onClick={() => onDelete(item)}>delete-{item.id}</button>
    </div>
);

// BaseDataTable appends an "actions" column whose Cell renders <actionButtons original={item}>.
// Invoke it directly the same way LessonList's Cell/Filter render props are tested elsewhere.
const renderActionButtons = item =>
    render(lastReactTableProps.columns.find(c => c.id === "actions").Cell({original: item}));

const CreateButton = ({onCreate}) => <button onClick={onCreate}>create</button>;

const FormContent = () => <div>form content</div>;

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("BaseDataTable — react-table pagination chrome follows the active UI language", () => {
    for (const lng of ["fr", "en"]) {
        test(`${lng}: previousText/nextText/loadingText/pageText/ofText/rowsText come from common:reactTable.*`, async () => {
            await i18n.changeLanguage(lng);
            render(
                <BaseDataTable
                    dataService={makeDataService()}
                    columns={[]}
                    oneResourceTypeName="x"
                />,
            );

            const t = i18n.getFixedT(lng, "common");
            expect(lastReactTableProps).not.toBeNull();
            expect(lastReactTableProps.previousText).toBe(t("reactTable.previousText"));
            expect(lastReactTableProps.nextText).toBe(t("reactTable.nextText"));
            expect(lastReactTableProps.loadingText).toBe(t("reactTable.loadingText"));
            expect(lastReactTableProps.pageText).toBe(t("reactTable.pageText"));
            expect(lastReactTableProps.ofText).toBe(t("reactTable.ofText"));
            expect(lastReactTableProps.rowsText).toBe(t("reactTable.rowsText"));
        });
    }

    // fr and en happen to both render "Page" for common:reactTable.pageText, so the loop above
    // can't tell "wired through i18n" apart from "still the old hardcoded pageText='Page'" for
    // this one key (see PR #66 for the same class of gap: an assertion that's byte-identical
    // between locales can't distinguish the two). Override the resource value instead, so the
    // assertion only passes if pageText is actually being read from i18n at render time.
    test("pageText is read from common:reactTable.pageText at render time (not hardcoded)", async () => {
        await i18n.changeLanguage("en");
        i18n.addResource("en", "common", "reactTable.pageText", "PAGE-OVERRIDE");
        try {
            render(<BaseDataTable dataService={makeDataService()} columns={[]} oneResourceTypeName="x" />);
            expect(lastReactTableProps.pageText).toBe("PAGE-OVERRIDE");
        } finally {
            i18n.addResource("en", "common", "reactTable.pageText", "Page");
        }
    });

    test("noDataText falls back to common:reactTable.noDataText while no fetch error has occurred", async () => {
        await i18n.changeLanguage("en");
        render(<BaseDataTable dataService={makeDataService()} columns={[]} oneResourceTypeName="x" />);

        expect(lastReactTableProps.noDataText).toBe(i18n.getFixedT("en", "common")("reactTable.noDataText"));
    });

    // Regression: the fetch-error message was a hardcoded French literal
    // ("Une erreur est survenue..."), not routed through i18n, so it couldn't have shown in English
    // even though it displaces noDataText on a failed fetch. react-table (mocked) is what would
    // normally call `onFetchData` on mount under `manual` pagination; fire it by hand here.
    test("noDataText shows the translated common:baseDataTable.loadError after a failed fetch", async () => {
        await i18n.changeLanguage("en");
        const dataService = makeDataService({listData: () => Promise.reject(new Error("boom"))});
        render(<BaseDataTable dataService={dataService} columns={[]} oneResourceTypeName="x" />);

        act(() => {
            lastReactTableProps.onFetchData({page: 0, pageSize: 20, sorted: [], filtered: []});
        });
        // BaseDataTable debounces fetchData by 400ms before firing.
        await act(() => new Promise(resolve => setTimeout(resolve, 450)));

        expect(lastReactTableProps.noDataText).toBe(
            i18n.getFixedT("en", "common")("baseDataTable.loadError"),
        );
    });

    // Regression coverage for the errorMessage/noDataText interaction the other direction: a
    // *successful* fetch must clear any previously-set errorMessage (fetchData's `.then` branch
    // sets `errorMessage: null`) so noDataText reverts to the plain translated
    // common:reactTable.noDataText fallback instead of getting stuck on a stale error.
    test("noDataText reverts to common:reactTable.noDataText after a successful fetch clears a prior error", async () => {
        await i18n.changeLanguage("en");
        let shouldFail = true;
        const dataService = makeDataService({
            listData: () => (shouldFail ? Promise.reject(new Error("boom")) : Promise.resolve({data: [], pages: 1})),
        });
        render(<BaseDataTable dataService={dataService} columns={[]} oneResourceTypeName="x" />);

        act(() => {
            lastReactTableProps.onFetchData({page: 0, pageSize: 20, sorted: [], filtered: []});
        });
        await act(() => new Promise(resolve => setTimeout(resolve, 450)));
        expect(lastReactTableProps.noDataText).toBe(i18n.getFixedT("en", "common")("baseDataTable.loadError"));

        shouldFail = false;
        act(() => {
            lastReactTableProps.onFetchData({page: 0, pageSize: 20, sorted: [], filtered: []});
        });
        await act(() => new Promise(resolve => setTimeout(resolve, 450)));

        expect(lastReactTableProps.noDataText).toBe(i18n.getFixedT("en", "common")("reactTable.noDataText"));
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
                />,
            );

            const expected = i18n.getFixedT(lng, "common")("baseDataTable.fullScreenTooltip");
            expect(document.querySelector(`[data-tippy-content="${expected}"]`)).not.toBeNull();
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
        labellizer: item => item.label,
    };

    test("fr: create/update modal titles use the fr baseDataTable templates", async () => {
        await i18n.changeLanguage("fr");
        render(<BaseDataTable {...props} />);

        fireEvent.click(screen.getByText("create"));
        expect(screen.getByRole("heading", {name: "Créer a discount rate"})).toBeInTheDocument();
    });

    test("en: create/update modal titles use the en baseDataTable templates (no mixed-language 'Créer')", async () => {
        await i18n.changeLanguage("en");
        render(<BaseDataTable {...props} />);

        fireEvent.click(screen.getByText("create"));
        expect(screen.getByRole("heading", {name: "Create a discount rate"})).toBeInTheDocument();
    });
});

describe("BaseDataTable — delete modal question falls back to common:baseDataTable.defaultResource", () => {
    const item = {id: 1, label: "Summer sale"};
    const baseProps = {
        dataService: makeDataService(),
        columns: [{id: "id"}],
        oneResourceTypeName: "a discount rate",
        actionButtons: ActionButtons,
        labellizer: i => i.label,
    };

    test("fr: with no thisResourceTypeName, the question falls back to 'cet élément', and includes the labellized item", async () => {
        await i18n.changeLanguage("fr");
        render(<BaseDataTable {...baseProps} />);
        const {getByText} = renderActionButtons(item);

        fireEvent.click(getByText(`delete-${item.id}`));
        expect(
            screen.getByText("Voulez-vous vraiment supprimer cet élément : Summer sale ?", {exact: false}),
        ).toBeInTheDocument();
        expect(screen.getByRole("heading", {name: "Supprimer a discount rate"})).toBeInTheDocument();
    });

    test("en: an explicit thisResourceTypeName is used instead of the default, and the title comes from common:baseDataTable.deleteTitle", async () => {
        await i18n.changeLanguage("en");
        render(<BaseDataTable {...baseProps} thisResourceTypeName="this discount rate" />);
        const {getByText} = renderActionButtons(item);

        fireEvent.click(getByText(`delete-${item.id}`));
        expect(
            screen.getByText(/Do you really want to delete this discount rate: Summer sale\?/),
        ).toBeInTheDocument();
        expect(screen.getByRole("heading", {name: "Delete a discount rate"})).toBeInTheDocument();
    });
});
