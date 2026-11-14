// KnownIssues "EditFormule.jsx's NewFormulePricingDataService can still collide temp ids" fix.
//
// Mirrors ActivityRefBasics.test.jsx's "keeps tempIdCounter monotonic across saves" regression
// test, adapted to EditFormule being a function component: pricingDataService is now memoized on
// deps that don't change across a new formule's pricing adds (formule.id, formule.formule_pricings,
// allPricingCategories, and the three stable handle*ForNewFormule callbacks), instead of on
// `selectedPricings` (which gets a new reference on every real add). Kept in its own file --
// EditFormule.memoization.test.jsx mocks NewFormulePricingDataService itself (to observe
// construction identity/count), which would hide the tempIdCounter behavior this test needs the
// real class for.

import React from "react";
import {
    render,
    screen,
    fireEvent,
    waitFor,
    act,
} from "@testing-library/react";
import i18n from "../../i18n";
import EditFormule from "./EditFormule";

let mockLastDataService = null;
vi.mock("../common/baseDataTable/BaseDataTable", () => ({
    default: (props) => {
        mockLastDataService = props.dataService;
        return <div>base-data-table-stub</div>;
    },
}));

const formule = {
    id: null,
    name: "Nouvelle formule",
    description: "",
    active: true,
    number_of_items: 1,
    formule_items: [],
    formule_pricings: [],
};

const pricingCategory = { id: 10, name: "Standard" };

function mockFetch() {
    global.fetch = vi.fn((url) => {
        const u = String(url);
        const body = u.includes("get_seasons_and_pricing_categories")
            ? {
                  seasons: [{ id: 1, label: "2025-26" }],
                  pricing_categories: [pricingCategory],
              }
            : [];
        return Promise.resolve({
            ok: true,
            headers: {
                get: (h) => (h === "Content-type" ? "application/json" : null),
            },
            json: () => Promise.resolve(body),
        });
    });
}

function newPricingPayload() {
    return {
        name: { label: "Standard" },
        price: 50,
        fromSeason: { value: 1 },
        toSeason: null,
    };
}

beforeEach(() => {
    mockLastDataService = null;
    mockFetch();
});

afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
});

describe("EditFormule NewFormulePricingDataService temp id collision regression", () => {
    test("two new pricings added to the same unsaved formule get distinct temp ids", async () => {
        await i18n.changeLanguage("fr");
        render(<EditFormule formule={formule} />);

        // Wait for the seasons/pricing-categories fetch to resolve and the dataService to pick up
        // allPricingCategories (its one and only rebuild, from the initial empty array).
        await waitFor(() => {
            expect(mockLastDataService.pricing_categories.length).toBe(1);
        });
        const dataService = mockLastDataService;

        let first;
        let second;
        await act(async () => {
            first = (await dataService.createData(newPricingPayload())).data;
        });
        await act(async () => {
            second = (await dataService.createData(newPricingPayload())).data;
        });

        expect([first.id, second.id]).toEqual([1, 2]);
        // Same instance reused across both adds -- that's what keeps tempIdCounter monotonic.
        expect(mockLastDataService).toBe(dataService);

        // Editing/deleting the second one actually affects the second one, not the first.
        await act(async () => {
            await dataService.updateData({
                id: second.id,
                price: 99,
                fromSeason: { value: 1 },
                toSeason: { value: null },
                pricing_category: pricingCategory,
            });
        });
        const afterUpdate = (await dataService.listData()).data;
        expect(afterUpdate.find((p) => p.id === first.id).price).toBe(50);
        expect(afterUpdate.find((p) => p.id === second.id).price).toBe(99);

        await act(async () => {
            await dataService.deleteData({ id: second.id });
        });
        const afterDelete = (await dataService.listData()).data;
        expect(afterDelete.map((p) => p.id)).toEqual([first.id]);
    });

    test("pricingDataService stays referentially stable across an unrelated re-render (typing in the name field)", async () => {
        await i18n.changeLanguage("fr");
        render(<EditFormule formule={formule} />);

        await waitFor(() => {
            expect(mockLastDataService.pricing_categories.length).toBe(1);
        });
        const dataService = mockLastDataService;

        const nameInput = screen.getByDisplayValue(formule.name);
        fireEvent.change(nameInput, { target: { value: "Autre nom" } });

        expect(mockLastDataService).toBe(dataService);
    });
});
