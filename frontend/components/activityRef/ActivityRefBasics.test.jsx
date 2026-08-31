// i18n extraction tests for ActivityRefBasics (i18n-06 "activities" domain, lot 2b).
//
// ActivityRefBasics is the "Activité" tab body of the activity-ref form: a class component
// wrapped in `withTranslation("activities")`. Its constructor kicks off
// `fetchSeasonsAndPricings()` -> `api.set().success(...).error(...).get(...)`; `render()`
// short-circuits to a Bootstrap spinner (`common:loading`) while `state.seasons` is empty and
// only renders the real react-final-form body once the api success callback populates
// `state.seasons`.
//
// Test strategy:
//  - `../../tools/api` is a chainable no-op stub whose `.success` captures the callback into a
//    module-level `mockLastApiSuccess`, so a test can fire it with a fixture payload (inside
//    `act`) to make `state.seasons` populate and the form render. `.get` never invokes it on its
//    own, so the pre-success spinner assertion is deterministic.
//  - Heavy leaf children are stubbed down to just the copy ActivityRefBasics threads into them:
//    `Input` / `InputSelect` render their `label` (react-final-form `<Field label=... render=/>`
//    passes `label` straight through as a prop), `DragAndDrop` renders `textDisplayed`,
//    `BaseDataTable` renders its `columns[].Header` plus `oneResourceTypeName` /
//    `thisResourceTypeName`. `InputColor`, `ActivityRefPricingModal`, `sweetalert2` are inert.
//  - The form body needs a react-final-form `<Form>` context for the `<Field>`s, so
//    ActivityRefBasics is rendered inside `<Form onSubmit render={() => <ActivityRefBasics/>} />`.
//
// Language is driven through the frontend/i18n singleton with `i18n.changeLanguage(...)` (no
// <I18nextProvider> needed for a withTranslation() class); `afterEach` restores "fr".

import React from "react";
import {render, screen, act} from "@testing-library/react";
import {Form} from "react-final-form";
import i18n from "../../i18n";
import ActivityRefBasics from "./ActivityRefBasics";

// `.success` / `.error` callbacks captured here so a test can fire the api response by hand.
let mockLastApiSuccess = null;
let mockLastApiError = null;
vi.mock("../../tools/api", () => ({
    set: () => {
        const c = {};
        c.success = fn => {
            mockLastApiSuccess = fn;
            return c;
        };
        c.error = fn => {
            mockLastApiError = fn;
            return c;
        };
        c.get = () => c;
        c.post = () => c;
        c.put = () => c;
        c.del = () => c;
        return c;
    },
}));

// Leaf children reduced to the copy ActivityRefBasics passes into them. InputSelect also renders
// `componentAdd` (the "+ add a family" icon) so the addKind path is reachable; BaseDataTable
// renders `createButton` so `activityRefBasics.createPricing` gets exercised through the real
// `this.CreateButton.bind(this)` path, not just as a locale key.
vi.mock("../common/Input", () => ({default: props => <div>{props.label}</div>}));
vi.mock("../common/InputSelect", () => ({
    default: props => (
        <div>
            {props.label}
            {props.componentAdd || null}
        </div>
    ),
}));
vi.mock("../common/InputColor", () => ({default: () => null}));
vi.mock("../editParameters/DragAndDrop", () => ({
    default: props => <div>{props.textDisplayed}</div>,
}));
vi.mock("../common/baseDataTable/BaseDataTable", () => ({
    default: props => {
        const CreateButton = props.createButton;
        return (
            <div>
                {(props.columns || []).map((col, i) => (
                    <span key={i}>
                        {typeof col.Header === "string" ? col.Header : ""}
                    </span>
                ))}
                <span>{props.oneResourceTypeName}</span>
                <span>{props.thisResourceTypeName}</span>
                {CreateButton ? <CreateButton onCreate={() => {}} /> : null}
            </div>
        );
    },
}));
vi.mock("../common/baseDataTable/DefaultCreateButton", () => ({
    default: props => <button>{props.label}</button>,
}));
vi.mock("./ActivityRefPricingModal", () => ({default: () => null}));
const {swalMock} = vi.hoisted(() => ({swalMock: vi.fn()}));
vi.mock("sweetalert2", () => ({default: swalMock}));

const props = {
    activityRef: {id: 1},
    activityTypes: [],
    activityRefImage: null,
    activityRefKinds: [["Piano", 3]],
    seasons: [],
    addPricingCategoriesToSave() {},
    updatePricingCategoriesToSave() {},
    deletePricingCategoriesToSave() {},
    onImageChange() {},
};

const seasonsPayload = {
    seasons: [{id: 1, label: "2025-26"}],
    pricing_categories: [],
    activity_ref_pricings: [],
    packs: [],
};

function renderBasics() {
    return render(
        <Form onSubmit={() => {}} render={() => <ActivityRefBasics {...props} />} />,
    );
}

beforeEach(() => {
    mockLastApiSuccess = null;
    mockLastApiError = null;
    swalMock.mockClear();
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("ActivityRefBasics", () => {
    test("it is wrapped in withTranslation()", () => {
        expect(ActivityRefBasics.WrappedComponent).toBeDefined();
    });

    describe("loading spinner (before the api success fires)", () => {
        test("fr: shows common:loading", async () => {
            await i18n.changeLanguage("fr");
            renderBasics();
            expect(screen.getByText("Chargement...")).toBeInTheDocument();
        });

        test("en: shows common:loading", async () => {
            await i18n.changeLanguage("en");
            renderBasics();
            expect(screen.getByText("Loading...")).toBeInTheDocument();
        });
    });

    describe("form body (after the api success populates state.seasons)", () => {
        test("fr: renders the translated field labels, drop text, pricing section + columns", async () => {
            await i18n.changeLanguage("fr");
            renderBasics();
            expect(mockLastApiSuccess).toBeInstanceOf(Function);

            act(() => mockLastApiSuccess(seasonsPayload));

            // Field labels (Input / InputSelect stubs render `label`).
            // "Nom" is used by both the name field and the pricing "name" column.
            expect(screen.getAllByText("Nom").length).toBeGreaterThanOrEqual(2);
            expect(screen.getByText("Famille")).toBeInTheDocument();
            expect(screen.getByText("Nombre de places")).toBeInTheDocument();
            expect(screen.getByText("Places (avec surbooking)")).toBeInTheDocument();
            expect(screen.getByText("Âge minimum (inclus)")).toBeInTheDocument();
            expect(screen.getByText("Durée (en minutes)")).toBeInTheDocument();
            expect(
                screen.getByText("Couleur du créneau dans le planning"),
            ).toBeInTheDocument();

            // DragAndDrop textDisplayed.
            expect(
                screen.getByText("Pour ajouter une image, déposez un fichier ici ou"),
            ).toBeInTheDocument();

            // Pricing section label.
            expect(screen.getByText("Nombre de cours et tarifs")).toBeInTheDocument();

            // BaseDataTable pricing column headers.
            expect(screen.getByText("Nombre de cours")).toBeInTheDocument();
            expect(screen.getByText("Tarif en €")).toBeInTheDocument();
            expect(screen.getByText("Saisons concernées")).toBeInTheDocument();
        });

        test("en: renders the translated field labels, drop text, pricing section + columns", async () => {
            await i18n.changeLanguage("en");
            renderBasics();
            expect(mockLastApiSuccess).toBeInstanceOf(Function);

            act(() => mockLastApiSuccess(seasonsPayload));

            // "Name" is used by both the name field and the pricing "name" column.
            expect(screen.getAllByText("Name").length).toBeGreaterThanOrEqual(2);
            expect(screen.getByText("Family")).toBeInTheDocument();
            expect(screen.getByText("Number of spots")).toBeInTheDocument();
            expect(screen.getByText("Spots (with overbooking)")).toBeInTheDocument();
            expect(screen.getByText("Minimum age (included)")).toBeInTheDocument();
            expect(screen.getByText("Duration (in minutes)")).toBeInTheDocument();
            expect(screen.getByText("Slot color in the schedule")).toBeInTheDocument();

            expect(
                screen.getByText("To add an image, drop a file here or"),
            ).toBeInTheDocument();

            expect(
                screen.getByText("Number of courses and pricing"),
            ).toBeInTheDocument();

            expect(screen.getByText("Number of courses")).toBeInTheDocument();
            expect(screen.getByText("Price (€)")).toBeInTheDocument();
            expect(screen.getByText("Applicable seasons")).toBeInTheDocument();
        });

        // exercises `createButton={this.CreateButton.bind(this)}` — the bound-method path, not
        // just the locale key.
        test("fr: renders the CreateButton label", async () => {
            await i18n.changeLanguage("fr");
            renderBasics();
            act(() => mockLastApiSuccess(seasonsPayload));
            expect(screen.getByText("Créer un tarif")).toBeInTheDocument();
        });

        test("en: renders the CreateButton label", async () => {
            await i18n.changeLanguage("en");
            renderBasics();
            act(() => mockLastApiSuccess(seasonsPayload));
            expect(screen.getByText("Create a pricing")).toBeInTheDocument();
        });
    });

    describe("fetchSeasonsAndPricings error path", () => {
        test("fires the translated fetchError swal", async () => {
            await i18n.changeLanguage("fr");
            renderBasics();
            expect(mockLastApiError).toBeInstanceOf(Function);

            act(() => mockLastApiError({error: "boom"}));

            expect(swalMock).toHaveBeenCalledWith(
                "Une erreur est survenue lors de la récupération des saisons ou des catégories de prix",
                "boom",
                "error",
            );
        });
    });
});

// i18n-layer resolution check (no component): the validator fragments threaded through
// `i18n.t(...)` at module scope in ActivityRefBasics, plus `fetchError` and `addKind.title`.
describe("activities:activityRefBasics.{validators,fetchError,addKind} resolution", () => {
    const plainKeys = [
        "activityRefBasics.validators.required",
        "activityRefBasics.validators.mustBeInteger",
        "activityRefBasics.fetchError",
        "activityRefBasics.addKind.title",
    ];

    for (const lng of ["fr", "en"]) {
        for (const key of plainKeys) {
            test(`${lng}: ${key} resolves`, async () => {
                await i18n.changeLanguage(lng);
                const value = i18n.t(`activities:${key}`);
                expect(value).toBeTruthy();
                expect(value).not.toBe(key);
                expect(value).not.toBe(`activities:${key}`);
                expect(value).not.toMatch(/\{\{/);
            });
        }

        test(`${lng}: activityRefBasics.validators.minValue interpolates {min}`, async () => {
            await i18n.changeLanguage(lng);
            const value = i18n.t("activities:activityRefBasics.validators.minValue", {min: 3});
            expect(value).toBeTruthy();
            expect(value).toContain("3");
            expect(value).not.toMatch(/\{\{/);
        });
    }
});
