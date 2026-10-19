// i18n extraction test — i18n-06 "parameters" domain, lot A (shared chrome).
//
// Covers the lot-A extraction:
//   - `frontend/locales/{fr,en}/parameters.json` (new namespace, 28 leaves) + `common:actions.create`
//   - `BaseDataTable.jsx` — abstract base for ~15 CRUD tables. NOT `withTranslation`-wrapped
//     (that would break `class X extends BaseDataTable`); it reads the `i18n` singleton directly.
//     The "+ Créer" button -> `i18n.t("common:actions.create")`; the ReactTable pagination props
//     (`previousText`/`nextText`/`loadingText`/`noDataText`/`pageText`/`ofText`/`rowsText`) ->
//     `i18n.t("common:reactTable.*")`.
//   - the tab-list wrappers over `BaseParameters` whose `tabsNames` are now built from `t(...)`:
//       * ALL of them are now plain functions calling `useTranslation("parameters")` directly --
//         Practice/Payments/Community/Evaluations used to be `withTranslation("parameters")(X)`
//         classes (`props.t` read in the constructor) until the jsx-to-tsx batch-1 conversion
//         took `BaseParameters` itself off a class (JS can't `extends` a function component),
//         which forced those 4 off the class+HOC shape onto the same props-based pattern
//         Plannings/Activities/ActivityApplications already used. Practice + Payments are
//         rendered in section C below (kept as a regression guard against the conversion rather
//         than the old HOC-wrap-missing one); Community/Evaluations are covered at the
//         i18n-layer + fr/en-parity level only.
//     `ActivitiesParameters` also renders an `<h2>{t("activities.heading")}</h2>`.
//     `ActivityApplicationsParameters` threads `desc={t("activityApplications.stepDesc.*")}` into
//     two `ApplicationStepParameters`.
//
// Every heavy tab-content child is mocked — they hit `fetch` / react-table / draft-js and are
// not under test here. We assert only the chrome's own translated copy.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../i18n";

// --- heavy tab-content children: replace with inert stubs ------------------------------------
// Factory kept in `vi.hoisted` so it is initialised before the hoisted `vi.mock` calls run.
const { stub } = vi.hoisted(() => {
    const React = require("react");
    return {
        stub: (name) => ({
            default: (props) =>
                React.createElement(
                    "div",
                    { "data-testid": `stub-${name}` },
                    props.desc ?? null
                ),
        }),
    };
});

vi.mock("./Practice/Groups", () => stub("groups"));
vi.mock("./Practice/BandsType", () => stub("band-types"));
vi.mock("./Practice/MusicGenres", () => stub("music-genres"));
vi.mock("./Practice/Materials", () => stub("materials"));
vi.mock("./Practice/FlatRate", () => stub("flat-rate"));
vi.mock("./Practice/Features", () => stub("features"));
vi.mock("./Practice/Instruments", () => stub("instruments"));

vi.mock("./Plannings/SchoolAvailabilities", () =>
    stub("school-availabilities")
);
vi.mock("./Plannings/TeacherAvailabilities", () =>
    stub("teacher-availabilities")
);
vi.mock("./Plannings/CancelActivityParameters", () => stub("cancel-activity"));
vi.mock("./Plannings/PlanningDisplayParameters", () =>
    stub("planning-display")
);

vi.mock("./ActivityApplications/ApplicationStatusTable", () =>
    stub("status-table")
);
vi.mock("./ActivityApplications/ConsentDocumentsList", () =>
    stub("consent-docs")
);
vi.mock("./ActivityApplications/ApplicationParameters", () =>
    stub("application-parameters")
);
vi.mock("./ActivityApplications/ApplicationStepParameters", () =>
    stub("step-parameters")
);

vi.mock("./Activities/PricingCategoriesEdit", () => stub("pricing-categories"));

vi.mock("./Payments/AdhesionSettings", () => stub("adhesion-settings"));
vi.mock("./Payments/PaymentsMethods", () => stub("payments-methods"));
vi.mock("./Payments/EditPaymentScheduleOptions", () =>
    stub("payment-schedule-options")
);
vi.mock("./Payments/Coupons", () => stub("coupons"));

vi.mock("../scripts/mergeUsers/MergeUsers", () => stub("merge-users"));

vi.mock("./Evaluations/EvaluationLevels", () => stub("evaluation-levels"));
vi.mock("./Evaluations/EvaluationSlot", () => stub("evaluation-slot"));

import BaseDataTable from "./BaseDataTable";
import PracticeParameters from "./Practice/PracticeParameters";
import PaymentsParameters from "./Payments/PaymentsParameters";
import PlanningsParameters from "./Plannings/PlanningsParameters";
import ActivityApplicationsParameters from "./ActivityApplications/ActivityApplicationsParameters";
import ActivitiesParameters from "./Activities/ActivitiesParameters";
import CommunityParameters from "./Community/CommunityParameters";
import EvaluationsParameters from "./Evaluations/EvaluationsParameters";

afterEach(async () => {
    await i18n.changeLanguage("fr");
    vi.clearAllMocks();
});

// Phase 07 P0: the "parameters namespace — i18n layer" block (fr/en key-set parity, "every key
// resolves", the common:actions.create / common:reactTable.* resolution loops) was pure pipeline
// coverage — now redundant with frontend/i18n/index.test.js's cross-namespace parity guard and
// `bin/i18n-tasks health`. Removed. The behaviour sections below (BaseDataTable chrome, tab-list
// wrappers, the class+HOC -> fn conversion regression guard) stay.

// ============================================================================================
// B. BaseDataTable — the "+ Créer" link + TanStackGrid's i18n'd pagination chrome
//
// BaseDataTable is abstract (no `columns` in state). Subclass it with `columns = []` and mount.
// Since batch 2 (docs/Modernization-Roadmap.md item 13) BaseDataTable renders the real
// TanStackGrid, which resolves its own pagination/loading/empty-state copy via `useTranslation`
// rather than accepting it as react-table props — assert against that real rendered output.
// TanStackGrid's own mount effect fires a real `fetchData` -> `fetch`, so it needs a mock here.
// ============================================================================================
describe("BaseDataTable — singleton-driven chrome", () => {
    class TestTable extends BaseDataTable {
        constructor(props) {
            super(props);
            this.state.columns = [];
        }
    }

    beforeEach(() => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({}),
        });
    });

    test("renders the create link (fr) pointing at props.urlNew, and the localised pagination chrome", async () => {
        await i18n.changeLanguage("fr");
        render(<TestTable urlNew="/widgets/new" urlListData="/widgets/list" />);

        const link = screen.getByRole("link", { name: /Créer/ });
        expect(link).toHaveAttribute("href", "/widgets/new");

        // Rendered unconditionally, so readable synchronously before the mount fetch resolves.
        expect(screen.getByText("Précédent")).toBeInTheDocument();
        expect(screen.getByText("Suivant")).toBeInTheDocument();
        // pageText/pageIndex/ofText/pages render as sibling text nodes under one div, so the
        // whole merged string is what a leaf-node text query sees.
        expect(screen.getByText(/Page 1 sur 1/)).toBeInTheDocument();
        // Still loading at mount -- the spinner's aria-label.
        expect(
            screen.getByRole("status", { name: "Chargement..." })
        ).toBeInTheDocument();

        // Once the mount fetch resolves, there is no data to show.
        expect(await screen.findByText("Aucune donnée")).toBeInTheDocument();
    });

    test("renders the create link + the localised pagination chrome in en", async () => {
        await i18n.changeLanguage("en");
        render(<TestTable urlNew="/widgets/new" urlListData="/widgets/list" />);

        expect(screen.getByRole("link", { name: /Create/ })).toHaveAttribute(
            "href",
            "/widgets/new"
        );
        expect(screen.getByText("Previous")).toBeInTheDocument();
        expect(screen.getByText(/Page 1 of 1/)).toBeInTheDocument();
        expect(await screen.findByText("No data")).toBeInTheDocument();
    });
});

// ============================================================================================
// C. Tab-list wrappers — the translated tab-link text rendered by BaseParameters
// ============================================================================================
describe("parameters tab wrappers — translated tab links", () => {
    // ordered list of parameters.* key paths, per wrapper, matching the render order
    const CASES = [
        {
            name: "PracticeParameters (post jsx-to-tsx-batch-1: fn wrapper, useTranslation; regression guard for the class+HOC -> fn conversion)",
            Component: PracticeParameters,
            props: {},
            keys: [
                "practice.tabs.bandTypes",
                "practice.tabs.musicGenre",
                "practice.tabs.manageBands",
                "practice.tabs.materials",
                "practice.tabs.flatRates",
                "practice.tabs.roomOptions",
                "practice.tabs.instruments",
            ],
        },
        {
            name: "PaymentsParameters (post jsx-to-tsx-batch-1: fn wrapper, useTranslation; regression guard for the class+HOC -> fn conversion)",
            Component: PaymentsParameters,
            props: {},
            keys: [
                "payments.tabs.adhesion",
                "payments.tabs.paymentMethods",
                "payments.tabs.pricingCategories",
                "payments.tabs.paymentTerms",
                "payments.tabs.discountRate",
            ],
        },
        {
            name: "PlanningsParameters (fn wrapper, useTranslation)",
            Component: PlanningsParameters,
            props: {
                planningId: 1,
                auth_token: "x",
                seasons: [],
                availabilityChecked: false,
            },
            keys: [
                "plannings.tabs.schoolAvailability",
                "plannings.tabs.teachers",
                "plannings.tabs.cancelActivity",
                "plannings.tabs.displaySettings",
            ],
        },
        {
            name: "ActivityApplicationsParameters (fn wrapper, useTranslation)",
            Component: ActivityApplicationsParameters,
            props: {},
            keys: [
                "activityApplications.tabs.statuses",
                "activityApplications.tabs.consentDocuments",
                "activityApplications.tabs.applicationSettings",
                "activityApplications.tabs.applicationPath",
            ],
        },
        {
            name: "ActivitiesParameters (fn wrapper, useTranslation)",
            Component: ActivitiesParameters,
            props: {},
            keys: ["activities.tabs.pricingCategories"],
        },
        {
            name: "CommunityParameters (post jsx-to-tsx-batch-1: fn wrapper, useTranslation; was a class extending BaseParameters)",
            Component: CommunityParameters,
            props: { season: {} },
            keys: ["community.tabs.mergeUsers"],
        },
        {
            name: "EvaluationsParameters (post jsx-to-tsx-batch-1: fn wrapper, useTranslation; was a class extending BaseParameters)",
            Component: EvaluationsParameters,
            props: {},
            keys: ["evaluations.tabs.levels", "evaluations.tabs.slot"],
        },
    ];

    for (const { name, Component, props, keys } of CASES) {
        describe(name, () => {
            test.each(["fr", "en"])(
                "renders every tab name as a link in %s",
                async (lng) => {
                    await i18n.changeLanguage(lng);
                    const t = i18n.getFixedT(lng, "parameters");

                    render(<Component {...props} />);

                    for (const key of keys) {
                        expect(
                            screen.getByRole("link", { name: t(key) })
                        ).toBeInTheDocument();
                    }
                }
            );
        });
    }

    test.each([
        ["fr", "Type de groupes", "Professeurs"],
        ["en", "Band types", "Teachers"],
    ])(
        "explicit spot-check in %s (Practice band-types tab, Plannings teachers tab)",
        async (lng, band, teacher) => {
            await i18n.changeLanguage(lng);
            render(<PracticeParameters />);
            expect(
                screen.getByRole("link", { name: band })
            ).toBeInTheDocument();

            render(<PlanningsParameters seasons={[]} />);
            expect(
                screen.getByRole("link", { name: teacher })
            ).toBeInTheDocument();
        }
    );
});

// ============================================================================================
// D. ActivitiesParameters — the page <h2>{t("activities.heading")}</h2> (outside BaseParameters)
// ============================================================================================
describe("ActivitiesParameters — pricing-categories page heading", () => {
    test.each([
        ["fr", "Paramétrage des catégories de prix"],
        ["en", "Configuring pricing categories"],
    ])("renders the h2 heading in %s", async (lng, heading) => {
        await i18n.changeLanguage(lng);
        render(<ActivitiesParameters />);
        expect(
            screen.getByRole("heading", { name: heading })
        ).toBeInTheDocument();
    });
});

// ============================================================================================
// E. ActivityApplicationsParameters — desc={t("activityApplications.stepDesc.*")} threaded into
//    the two ApplicationStepParameters children (tab 4, "applicationPath")
// ============================================================================================
describe("ActivityApplicationsParameters — stepDesc threaded into ApplicationStepParameters", () => {
    test.each([
        ["fr", "Message tarifs", "Message disponibilités"],
        ["en", "Pricing message", "Availability message"],
    ])(
        "passes the translated desc props in %s",
        async (lng, pricingDesc, availabilityDesc) => {
            await i18n.changeLanguage(lng);
            render(<ActivityApplicationsParameters />);

            // BaseParameters only mounts the active tab; activate the 4th tab ("applicationPath").
            const t = i18n.getFixedT(lng, "parameters");
            await userEvent.click(
                screen.getByRole("link", {
                    name: t("activityApplications.tabs.applicationPath"),
                })
            );

            const steps = screen.getAllByTestId("stub-step-parameters");
            const texts = steps.map((el) => el.textContent);
            expect(texts).toContain(pricingDesc);
            expect(texts).toContain(availabilityDesc);
        }
    );
});
