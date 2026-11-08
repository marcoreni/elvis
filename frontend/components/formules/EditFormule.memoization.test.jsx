// KnownIssues "EditFormule rebuilds dataService/columns on every render" fix: pricingColumns /
// pricingDataService are now useMemo'd instead of rebuilt inline on every render. Kept in its own
// file (rather than EditFormule.test.jsx) because it needs BaseDataTable and the two pricing
// DataService classes mocked to observe identity/construction-count directly -- mocks that would
// break EditFormule.test.jsx's existing real-grid-rendering assertions.

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import EditFormule from "./EditFormule";

const { formulePricingCtor } = vi.hoisted(() => ({
    formulePricingCtor: vi.fn(),
}));
vi.mock("./FormulePricingDataService", () => ({
    default: class {
        constructor(formuleId) {
            formulePricingCtor(formuleId);
            this.formuleId = formuleId;
        }
    },
}));
vi.mock("./NewFormulePricingDataService", () => ({
    default: class {
        constructor(...args) {
            formulePricingCtor(...args);
        }
    },
}));

let mockLastDataService = null;
let mockLastColumns = null;
vi.mock("../common/baseDataTable/BaseDataTable", () => ({
    default: (props) => {
        mockLastDataService = props.dataService;
        mockLastColumns = props.columns;
        return <div>base-data-table-stub</div>;
    },
}));

const formule = {
    id: 1,
    name: "Parcours découverte",
    description: "",
    active: true,
    number_of_items: 1,
    formule_items: [],
    formule_pricings: [],
};

function mockFetch(seasons) {
    global.fetch = vi.fn((url) => {
        const u = String(url);
        const body = u.includes("get_seasons_and_pricing_categories")
            ? { seasons, pricing_categories: [] }
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

beforeEach(() => {
    formulePricingCtor.mockClear();
    mockLastDataService = null;
    mockLastColumns = null;
    mockFetch([]);
});

afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
});

describe("EditFormule pricingColumns/pricingDataService memoization", () => {
    test("stay referentially stable across an unrelated re-render (typing in the name field)", async () => {
        await i18n.changeLanguage("fr");
        render(<EditFormule formule={formule} />);

        expect(formulePricingCtor).toHaveBeenCalledTimes(1);
        const firstDataService = mockLastDataService;
        const firstColumns = mockLastColumns;

        const nameInput = screen.getByDisplayValue(formule.name);
        fireEvent.change(nameInput, { target: { value: "Nouveau nom" } });

        expect(mockLastDataService).toBe(firstDataService);
        expect(mockLastColumns).toBe(firstColumns);
        // No new FormulePricingDataService got constructed for the unrelated re-render.
        expect(formulePricingCtor).toHaveBeenCalledTimes(1);
    });

    test("pricingColumns is rebuilt once allSeasons actually changes (after the seasons fetch resolves)", async () => {
        mockFetch([{ id: 1, label: "2025-26" }]);
        await i18n.changeLanguage("fr");
        render(<EditFormule formule={formule} />);

        const columnsBeforeFetch = mockLastColumns;

        await waitFor(() => {
            const seasonsColumn = (mockLastColumns || []).find(
                (c) => c.id === "selectedSeasons"
            );
            const result = seasonsColumn.Cell({
                original: { from_season_id: 1, to_season_id: null },
            });
            expect(result).toBe("2025-26 > ...");
        });

        expect(mockLastColumns).not.toBe(columnsBeforeFetch);
    });
});
