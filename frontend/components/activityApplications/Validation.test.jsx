// i18n extraction test — i18n-06 "activities" domain, lot 3e (`activityApplications` namespace).
//
// Validation.jsx is the final "review your enrolment request" step of the enrolment wizard. It is
// a default-export function component using `const { t } = useTranslation("activityApplications")`
// — NOT a StepZilla step (no `isValidated`). It reads deeply into `application.*` in the render
// body but has no lifecycle / mount-time fetch, so a single synchronous render exercises every
// extracted string.
//
// The three child tables + UserAvatar + WysiwygViewer are stubbed to `() => null` so the
// assertions target Validation's own copy, not a child's. Language is driven through the
// frontend/i18n singleton (registered via initReactI18next — no <I18nextProvider> needed).

import React from "react";
import { render, screen } from "@testing-library/react";
import _ from "lodash";
import i18n from "../../i18n";
import Validation from "./Validation";

// Validation imports lodash directly, but stay consistent with the other activityApplications /
// activityRef tests and expose the webpack `_` global defensively.
global._ = _;

vi.mock("./TimePreferencesTable", () => ({ default: () => null }));
vi.mock("./SelectedActivitiesTable", () => ({ default: () => null }));
vi.mock("./EvaluationChoiceTable", () => ({ default: () => null }));
vi.mock("../UserAvatar", () => ({ default: () => null }));
vi.mock("../utils/WysiwygViewer", () => ({ default: () => null }));

const baseApplication = () => ({
    user: { first_name: "Jean", last_name: "Dupont", birthday: "2010-01-01" },
    infos: {
        id: 1,
        is_paying: true,
        first_name: "Jean",
        last_name: "Dupont",
        addresses: {},
        telephones: [],
        family_links_with_user: [],
        payers: [1],
    },
    childhoodPreferences: {},
    intervals: [],
    selectedActivities: [],
    selectedFormulas: [],
    selectedFormulaActivities: {},
    selectedEvaluationIntervals: {},
    duration: null,
    formulas: [],
});

const baseProps = (overrides = {}) => ({
    application: baseApplication(),
    activityRefs: [],
    allActivityRefs: [],
    allActivityRefKinds: [],
    handleSubmit() {},
    additionalStudents: [],
    buttonDisabled: false,
    handleComment() {},
    selectedPacks: [],
    packs: {},
    formulas: [],
    paymentTerms: [],
    availPaymentScheduleOptions: [],
    availPaymentMethods: [],
    selectedFormulas: [],
    selectedFormulaActivities: {},
    pricingInfo: null,
    ...overrides,
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

// --------------------------------------------------------------------------------------------
// Always-rendered sections (no conditional prop needed)
// --------------------------------------------------------------------------------------------

const ALWAYS_COPY = {
    fr: {
        title: "Récapitulatif de la demande",
        personalInfo: "Informations personnelles",
        birthDate: "Date de naissance",
        personalContactDetails: "Coordonnées personnelles",
        addresses: "Adresse(s)",
        comment: "Commentaire",
        submitRequest: "Envoyer la demande",
    },
    en: {
        title: "Request summary",
        personalInfo: "Personal information",
        birthDate: "Date of birth",
        personalContactDetails: "Personal contact details",
        addresses: "Address(es)",
        comment: "Comment",
        submitRequest: "Submit request",
    },
};

describe.each(["fr", "en"])("Validation always-rendered sections (%s)", (lng) => {
    beforeEach(async () => {
        await i18n.changeLanguage(lng);
    });

    test("renders the summary title, personal-info, contact-details and comment headings plus the submit button", () => {
        render(<Validation {...baseProps()} />);
        const c = ALWAYS_COPY[lng];

        expect(screen.getByRole("heading", { name: c.title })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: c.personalInfo })).toBeInTheDocument();
        expect(screen.getByText(c.birthDate)).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: c.personalContactDetails })).toBeInTheDocument();
        expect(screen.getByText(c.addresses)).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: c.comment })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: c.submitRequest })).toBeInTheDocument();
    });
});

// --------------------------------------------------------------------------------------------
// Conditional: selected activities section
// --------------------------------------------------------------------------------------------

describe.each(["fr", "en"])("Validation selected-activities section (%s)", (lng) => {
    test("shows the selectedActivities heading once the application has picked an activity", async () => {
        await i18n.changeLanguage(lng);

        const application = baseApplication();
        application.selectedActivities = [1];

        render(
            <Validation
                {...baseProps({
                    application,
                    allActivityRefs: [{ id: 1, display_name: "Guitare" }],
                })}
            />,
        );

        const name = lng === "fr" ? "Activités sélectionnées" : "Selected activities";
        expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    });
});

// --------------------------------------------------------------------------------------------
// Conditional: selected packages ("formules") section
// --------------------------------------------------------------------------------------------

const PACKAGES_COPY = {
    fr: {
        heading: "Formules sélectionnées",
        colPackage: "Formule",
        colIncluded: "Activités incluses",
        colPrice: "Tarif estimé",
        noActivity: "Aucune activité sélectionnée",
        estimatedTotal: "Total estimé",
    },
    en: {
        heading: "Selected packages",
        colPackage: "Package",
        colIncluded: "Included activities",
        colPrice: "Estimated price",
        noActivity: "No activity selected",
        estimatedTotal: "Estimated total",
    },
};

describe.each(["fr", "en"])("Validation selected-packages section (%s)", (lng) => {
    test("renders the packages heading, the three column headers, the empty-activities cell and the estimated total", async () => {
        await i18n.changeLanguage(lng);

        const application = baseApplication();
        application.selectedFormulas = [7];
        application.formulas = [
            { id: 7, name: "Trio", formule_items: [], formule_pricings: [{ price: "120" }] },
        ];
        application.selectedFormulaActivities = { 7: [] };

        render(<Validation {...baseProps({ application })} />);

        const c = PACKAGES_COPY[lng];
        expect(screen.getByRole("heading", { name: c.heading })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: c.colPackage })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: c.colIncluded })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: c.colPrice })).toBeInTheDocument();
        expect(screen.getByText(c.noActivity)).toBeInTheDocument();
        expect(screen.getByText(c.estimatedTotal)).toBeInTheDocument();

        if (lng === "fr") {
            // Distinct from lot-3c's lowercase `activityChoice.noActivitySelected`
            // ("aucune activité sélectionnée") — this key is capitalised.
            expect(screen.getByText("Aucune activité sélectionnée")).toBeInTheDocument();
        }
    });
});

// --------------------------------------------------------------------------------------------
// Conditional: payment preference section
// --------------------------------------------------------------------------------------------

const PAYMENT_COPY = {
    fr: {
        heading: "Préférence de paiement",
        schedule: "Echéancier",
        method: "Moyen de paiement",
        payers: "Payeur(s)",
    },
    en: {
        heading: "Payment preference",
        schedule: "Payment schedule",
        method: "Payment method",
        payers: "Payer(s)",
    },
};

describe.each(["fr", "en"])("Validation payment-preference section (%s)", (lng) => {
    test("renders the payment-preference heading and the schedule / method / payers labels", async () => {
        await i18n.changeLanguage(lng);

        render(
            <Validation
                {...baseProps({
                    paymentTerms: [{ payment_method_id: 1, payment_schedule_options_id: 2 }],
                    availPaymentMethods: [{ id: 1, label: "CB" }],
                    availPaymentScheduleOptions: [{ id: 2, label: "Mensuel" }],
                })}
            />,
        );

        const c = PAYMENT_COPY[lng];
        expect(screen.getByRole("heading", { name: c.heading })).toBeInTheDocument();
        expect(screen.getByText(c.schedule)).toBeInTheDocument();
        expect(screen.getByText(c.method)).toBeInTheDocument();
        expect(screen.getByText(c.payers)).toBeInTheDocument();
    });
});

// --------------------------------------------------------------------------------------------
// i18n-layer resolution — every `validation.*` key resolves in fr + en
// --------------------------------------------------------------------------------------------

const NS = "activityApplications";

// [key, interpolation options]
const VALIDATION_KEYS = [
    ["validation.title", {}],
    ["validation.personalInfo", {}],
    ["validation.birthDate", {}],
    ["validation.personalContactDetails", {}],
    ["validation.addresses", {}],
    ["validation.phone", { label: "domicile" }],
    ["validation.contacts", {}],
    ["validation.legalRepresentative", {}],
    ["validation.accompanyingPerson", {}],
    ["validation.emergencyContact", {}],
    ["validation.selectedActivities", {}],
    ["validation.selectedPackages", {}],
    ["validation.colPackage", {}],
    ["validation.colIncludedActivities", {}],
    ["validation.colEstimatedPrice", {}],
    ["validation.noActivitySelected", {}],
    ["validation.estimatedTotal", {}],
    ["validation.totalEstimatedCost", {}],
    ["validation.availabilities", {}],
    ["validation.levelEvaluation", {}],
    ["validation.paymentPreference", {}],
    ["validation.paymentSchedule", {}],
    ["validation.paymentMethod", {}],
    ["validation.payers", {}],
    ["validation.comment", {}],
    ["validation.submitRequest", {}],
];

describe.each(["fr", "en"])("activityApplications lot-3e validation.* keys resolve in %s", (lng) => {
    const t = i18n.getFixedT(lng, NS);

    test.each(VALIDATION_KEYS)("%s (%o) resolves to real, interpolated copy", (key, opts) => {
        const value = t(key, opts);
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
        expect(value).not.toBe(key);
        expect(value).not.toMatch(/\{\{/);
    });
});

describe("lot-3e copy specifics", () => {
    const fr = i18n.getFixedT("fr", NS);
    const en = i18n.getFixedT("en", NS);

    test("validation.phone — fr keeps the preserved 'Télephone' typo (no accent on the second e) and interpolates the label", () => {
        const value = fr("validation.phone", { label: "domicile" });
        expect(value).toContain("Télephone");
        expect(value).not.toContain("Téléphone");
        expect(value).toContain("domicile");
        expect(value).not.toMatch(/\{\{/);
    });

    test("validation.totalEstimatedCost — fr keeps the space before the colon", () => {
        expect(fr("validation.totalEstimatedCost")).toBe("Coût total estimé :");
        expect(en("validation.totalEstimatedCost")).toBe("Total estimated cost:");
    });

    test("validation.noActivitySelected — fr is capitalised, unlike lot-3c's lowercase variant", () => {
        expect(fr("validation.noActivitySelected")).toBe("Aucune activité sélectionnée");
        expect(fr("validation.noActivitySelected")).not.toBe("aucune activité sélectionnée");
        expect(en("validation.noActivitySelected")).toBe("No activity selected");
    });
});
