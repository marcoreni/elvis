// i18n extraction tests for ActivityRefPricingModal (i18n-06 "activities" domain, lot 2c).
//
// ActivityRefPricingModal is a class component wrapped in `withTranslation("activities")`. It
// renders react-final-form `<Field>`s, so it is mounted inside
// `<Form onSubmit render={() => <ActivityRefPricingModal/>} />`. `componentDidMount` only maps
// the `seasons` / `pricingCategories` props into state (no fetch).
//
// Stubs:
//  - `../common/Input` renders its `label` prop.
//  - `react-select` renders `label` + `placeholder` (both are threaded through the
//    `ReactSelectAdapter` `...rest` onto `<Select>`), so the Field-level `label` / `placeholder`
//    copy is asserted through it.
//
// The bare `<label>` elements ("Type de tarif :" etc.) are real DOM, asserted with getByText.
// A small `isUpdate: true` case with unresolvable options exercises the `t("common:loading")`
// early return. Language via the frontend/i18n singleton; `afterEach` restores "fr".

import React from "react";
import {render, screen} from "@testing-library/react";
import {Form} from "react-final-form";
import i18n from "../../i18n";
import ActivityRefPricingModal from "./ActivityRefPricingModal";

vi.mock("../common/Input", () => ({default: props => <div>{props.label}</div>}));
vi.mock("react-select", () => ({
    default: ({label, placeholder}) => (
        <div data-testid="react-select">
            {label ? <span>{label}</span> : null}
            {placeholder ? <span>{placeholder}</span> : null}
        </div>
    ),
}));

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

function renderModal(extraProps = {}) {
    const props = {
        seasons: [{id: 1, label: "2025-26"}],
        pricingCategories: [{id: 1, name: "Trimestre"}],
        isUpdate: false,
        item: undefined,
        ...extraProps,
    };
    return render(
        <Form onSubmit={() => {}} render={() => <ActivityRefPricingModal {...props} />} />,
    );
}

describe("ActivityRefPricingModal", () => {
    test("it is wrapped in withTranslation()", () => {
        expect(ActivityRefPricingModal.WrappedComponent).toBeDefined();
    });

    describe("fr (isUpdate false)", () => {
        test("renders the bare <label> copy", async () => {
            await i18n.changeLanguage("fr");
            renderModal();

            expect(screen.getByText("Type de tarif :")).toBeInTheDocument();
            expect(screen.getByText("Prix")).toBeInTheDocument();
            expect(screen.getByText("à partir de :")).toBeInTheDocument();
            expect(screen.getByText("jusqu'à (optionnel) :")).toBeInTheDocument();
        });

        test("renders the Field label / placeholder copy (via stubs)", async () => {
            await i18n.changeLanguage("fr");
            renderModal();

            expect(screen.getByText("Choisir une catégorie de tarif")).toBeInTheDocument();
            expect(
                screen.getByText("sélectionner une catégorie de tarif"),
            ).toBeInTheDocument();
            expect(screen.getAllByText("sélectionner une saison")).toHaveLength(2);
        });
    });

    describe("en (isUpdate false)", () => {
        test("renders the bare <label> copy", async () => {
            await i18n.changeLanguage("en");
            renderModal();

            expect(screen.getByText("Pricing type:")).toBeInTheDocument();
            expect(screen.getByText("Price")).toBeInTheDocument();
            expect(screen.getByText("from:")).toBeInTheDocument();
            expect(screen.getByText("until (optional):")).toBeInTheDocument();
        });

        test("renders the Field label / placeholder copy (via stubs)", async () => {
            await i18n.changeLanguage("en");
            renderModal();

            expect(screen.getByText("Choose a pricing category")).toBeInTheDocument();
            expect(screen.getByText("select a pricing category")).toBeInTheDocument();
            expect(screen.getAllByText("select a season")).toHaveLength(2);
        });
    });

    describe("isUpdate with unresolvable options → common:loading early return", () => {
        const item = {pricing_category: {id: 9}, from_season_id: 9, to_season_id: 9};

        test("fr", async () => {
            await i18n.changeLanguage("fr");
            renderModal({isUpdate: true, item});
            expect(screen.getByText("Chargement...")).toBeInTheDocument();
        });

        test("en", async () => {
            await i18n.changeLanguage("en");
            renderModal({isUpdate: true, item});
            expect(screen.getByText("Loading...")).toBeInTheDocument();
        });
    });
});
