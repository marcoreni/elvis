// i18n extraction test — i18n-06 "activities" domain, lot 3c (`activityApplications` namespace).
//
// ActivityChoice is a function component (`useTranslation("activityApplications")`) wrapped by
// WrappedActivityChoice for StepZilla; it is tested directly. It has a wide required-prop surface
// and does `moment(season.start)` / `moment(infos.birthday)` age math on mount, so every prop is
// supplied with a shape that survives that math. Heavy / irrelevant children are mocked:
//   - `./../AdditionalStudentSelection` -> null (only mounted in edit mode anyway)
//   - `../utils/WysiwygViewer`          -> null
//   - `draft-js`                        -> {} (imported at top of the file but unused in render)
//
// Language is driven through the frontend/i18n singleton. `afterEach` resets to "fr".

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../../i18n";
import ActivityChoice from "./ActivityChoice";

vi.mock("./../AdditionalStudentSelection", () => ({default: () => null}));
vi.mock("../utils/WysiwygViewer", () => ({default: () => null}));
vi.mock("draft-js", () => ({}));

const baseProps = {
    schoolName: "X",
    adhesionPrices: [],
    selectedActivities: [],
    activityRefs: [],
    activityRefsChildhood: [],
    activityRefsCham: [],
    allActivityRefs: [],
    allActivityRefKinds: [],
    currentUserIsAdmin: true,
    handleAddActivity() {},
    handleRemoveActivity() {},
    validation: {},
    additionalStudents: [],
    handleChangeAdditionalStudent() {},
    infos: {birthday: "2010-01-01", user: {family_member_users: []}},
    season: {id: 1, start: "2025-09-01", end: "2026-06-30"},
    adhesionEnabled: false,
    packs: {},
    handleRemovePack() {},
    handleAddPack() {},
    selectedPacks: {},
    pricingInfo: null,
    selectedFormulas: [],
    formulas: [],
    selectedFormulaActivities: {},
};

const renderActivityChoice = (overrides = {}) =>
    render(<ActivityChoice {...baseProps} {...overrides} />);

afterEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("fr");
});

const COPY = {
    fr: {
        title: "Choix de l'activité",
        duration: "Durée",
        searchPlaceholder: "Rechercher",
        colActivity: "Activité",
        colEstimatedPrice: "Tarif estimé",
        summary: "Récapitulatif",
        noActivitySelected: "aucune activité sélectionnée",
        estimatedTotal: "Total estimé",
    },
    en: {
        title: "Activity choice",
        duration: "Duration",
        searchPlaceholder: "Search",
        colActivity: "Activity",
        colEstimatedPrice: "Estimated price",
        summary: "Summary",
        noActivitySelected: "No activity selected",
        estimatedTotal: "Estimated total",
    },
};

// A selected activity ref that survives getDisplayPrice/getDisplayDuration.
const SELECTED_REF = {
    id: 1,
    display_name: "Guitare",
    duration: 30,
    display_prices_by_season: {},
    display_price: "100",
};

describe.each(["fr", "en"])("ActivityChoice — rendered copy (%s)", lng => {
    const x = COPY[lng];

    beforeEach(async () => {
        await i18n.changeLanguage(lng);
    });

    test("empty state: headings, sort control, placeholder, column headers, empty row", () => {
        renderActivityChoice();

        // Panel heading + summary heading (one each).
        expect(screen.getByRole("heading", {name: x.title})).toBeInTheDocument();
        expect(screen.getByRole("heading", {name: x.summary})).toBeInTheDocument();

        // Duration sort control.
        expect(screen.getByRole("button", {name: x.duration})).toBeInTheDocument();
        // Search input.
        expect(screen.getByPlaceholderText(x.searchPlaceholder)).toBeInTheDocument();

        // colActivity + colEstimatedPrice each appear in the available and the summary <thead>.
        expect(screen.getAllByText(x.colActivity)).toHaveLength(2);
        expect(screen.getAllByText(x.colEstimatedPrice)).toHaveLength(2);
        // "Durée" appears as the sort button label + one <th> in each of the two tables.
        expect(screen.getAllByText(x.duration).length).toBeGreaterThanOrEqual(3);

        // Empty summary row.
        expect(screen.getByText(x.noActivitySelected)).toBeInTheDocument();
    });

    test("one selected activity: the estimated-total row renders", () => {
        renderActivityChoice({selectedActivities: [1], allActivityRefs: [SELECTED_REF]});

        expect(screen.getByText(x.estimatedTotal)).toBeInTheDocument();
        // Empty-state row is gone once something is selected.
        expect(screen.queryByText(x.noActivitySelected)).not.toBeInTheDocument();
    });
});

describe("ActivityChoice — fr specifics", () => {
    test("the empty-state copy is the lowercase 'aucune…' variant", async () => {
        await i18n.changeLanguage("fr");
        renderActivityChoice();

        expect(screen.getByText("aucune activité sélectionnée")).toBeInTheDocument();
        expect(screen.queryByText("Aucune activité sélectionnée")).not.toBeInTheDocument();
    });

    test("the estimated-total label has no trailing colon", async () => {
        await i18n.changeLanguage("fr");
        renderActivityChoice({selectedActivities: [1], allActivityRefs: [SELECTED_REF]});

        const el = screen.getByText("Total estimé");
        expect(el.textContent.trim()).toBe("Total estimé");
    });
});
