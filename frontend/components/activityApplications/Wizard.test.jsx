// i18n extraction tests — i18n-06 "activities" domain, lot 3d (`activityApplications` namespace).
//
// `Wizard` is the StepZilla *orchestrator* of the enrolment flow: after lot 3d it is
// `export default withTranslation("activityApplications")(Wizard)`, a class component that
// *renders* `<StepZilla steps={...}>` but is NOT itself a StepZilla step (no `isValidated`).
// Its `render()` builds an 11-entry `steps` array, every `name:` coming from `wizard.steps.*`,
// plus the `<h1>/<h3>` title block, the StepZilla next/back button labels, the admin begin-date
// label, the work-group instruments label, and — before all of that — a closed-seasons guard
// (`wizard.seasonsClosed` + `wizard.createSeason`). `handleSubmit()` fires four more keys
// through `t(...)`, three of them HTML (`wizard.submit.*`).
//
// A full mount is too brittle (StepZilla + ~15 heavy step children + moment math + the `_`
// webpack global), so this file is layered:
//   1. a class-shape guard on `Wizard.WrappedComponent`;
//   2. a shallow render of the closed-seasons guard branch (the earliest `render()` return),
//      driven by an unauthorised non-admin + empty `seasons`;
//   3. i18n-layer resolution of every `wizard.*` key, fr + en, including the sub-lexical
//      `<h3>` subtitle composition (`applicationSubtitle.full` fed `allActivities` /
//      `oneActivity` as its `activityPart`).
//
// Language switching follows the established pattern: the frontend/i18n singleton, driven with
// `i18n.changeLanguage(...)` for the render case and `i18n.getFixedT(lng, ns)` for the pure
// resolution checks. The singleton's LanguageDetector resolves to `en` under jsdom, so the fr
// render assertions call `changeLanguage("fr")` explicitly first.

import React from "react";
import {render, screen} from "@testing-library/react";
import _ from "lodash";
import i18n from "../../i18n";

// Wizard.jsx `import _ from "lodash"` directly, but its (mocked-away) children read the webpack
// `_` ProvidePlugin global; expose it here too, matching activityRef/ActivityRefContainer.test.jsx.
global._ = _;

// Heavy children / libs that only matter once StepZilla actually renders a step — mocked so the
// module graph loads under jsdom. The closed-seasons guard returns before any of them mount.
vi.mock("react-stepzilla", () => ({default: () => null}));
vi.mock("sweetalert2", () => ({default: vi.fn()}));
vi.mock("react-select", () => ({default: () => null}));
vi.mock("react-toastify", () => ({toast: Object.assign(vi.fn(), {error: vi.fn()})}));
vi.mock("../userForm/UserForm", () => ({default: () => null}));
vi.mock("../WrappedPayerPaymentTerms", () => ({default: () => null}));
vi.mock("./ActivityChoice", () => ({default: () => null}));
vi.mock("./Evaluation", () => ({default: () => null}));
vi.mock("./Validation", () => ({default: () => null}));
vi.mock("./EvaluationIntervalChoice", () => ({default: () => null}));
vi.mock("./ApplicationChangeQuestionnaire", () => ({default: () => null}));
vi.mock("./UserSearch", () => ({default: () => null}));
vi.mock("./WizardUserSelectMember", () => ({default: () => null}));
vi.mock("./WrappedFormulaChoice", () => ({default: () => null}));
vi.mock("./WrappedActivityChoice", () => ({default: () => null}));
vi.mock("./TimePreferencesStep", () => ({
    default: () => null,
    PLANNING_AND_PREFERENCES_MODE: "planning_and_preferences",
    PLANNING_MODE: "planning",
    PREFERENCES_MODE: "preferences",
}));

import Wizard from "./Wizard";

const NS = "activityApplications";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

// ---------------------------------------------------------------------------
// 1. Class-shape guard on the unwrapped component
// ---------------------------------------------------------------------------

describe("Wizard.WrappedComponent shape", () => {
    test("is a defined React class component", () => {
        expect(Wizard.WrappedComponent).toBeDefined();
        expect(Wizard.WrappedComponent.prototype instanceof React.Component).toBe(true);
    });

    test("is NOT itself a StepZilla step — no isValidated hook", () => {
        expect(Wizard.WrappedComponent.prototype.isValidated).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// 2. Shallow render of the closed-seasons guard branch
// ---------------------------------------------------------------------------
//
// `render()`'s first statement is
//   if (!this.isApplicationAuthorized(this.state.season_id)) return <Fragment>…</Fragment>
// `isApplicationAuthorized` returns false for a non-admin when `seasons.find(id)` misses, so a
// non-admin + `seasons: []` + no `season` prop drives the guard with a minimal prop set.
// `componentDidMount` returns early when `this.props.season` is absent, so no api calls fire.
// `user.is_admin` is truthy here so the `wizard.createSeason` link also renders.

const guardProps = {
    user: {is_admin: true},
    currentUserIsAdmin: false,
    seasons: [],
    activityRefs: [],
    activityRefsChildhood: [],
    availabilities: [],
};

describe("closed-seasons guard branch renders without throwing", () => {
    test("fr: renders wizard.seasonsClosed and the wizard.createSeason link", async () => {
        await i18n.changeLanguage("fr");
        render(<Wizard {...guardProps} />);

        expect(
            screen.getByText(
                "Les inscriptions à la saison actuelle sont fermées et celles de la saison suivante ne sont pas encore ouvertes."
            )
        ).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "Créer une saison"})).toHaveAttribute(
            "href",
            "/seasons/new"
        );
    });

    test("en: renders the translated closed-seasons copy and link", async () => {
        await i18n.changeLanguage("en");
        render(<Wizard {...guardProps} />);

        expect(
            screen.getByText(
                "Registration for the current season is closed, and registration for the next season is not open yet."
            )
        ).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "Create a season"})).toHaveAttribute(
            "href",
            "/seasons/new"
        );
    });
});

// ---------------------------------------------------------------------------
// 3. i18n-layer coverage — every wizard.* key, fr + en
// ---------------------------------------------------------------------------

// [key, interpolation options] — plain string keys: resolve, non-empty, not the key, no "{{".
const PLAIN_KEYS = [
    // the 11 StepZilla step names
    ["wizard.steps.member", {}],
    ["wizard.steps.contactDetails", {}],
    ["wizard.steps.changeWishes", {}],
    ["wizard.steps.packChoice", {}],
    ["wizard.steps.activityChoice", {}],
    ["wizard.steps.instruments", {}],
    ["wizard.steps.availabilities", {}],
    ["wizard.steps.levelEvaluation", {}],
    ["wizard.steps.evaluationSlots", {}],
    ["wizard.steps.payment", {}],
    ["wizard.steps.summary", {}],
    // chrome around the wizard
    ["wizard.nextStep", {}],
    ["wizard.prevStep", {}],
    ["wizard.beginDate", {}],
    ["wizard.instrumentsLabel", {}],
    ["wizard.createSeason", {}],
    ["wizard.seasonsClosed", {}],
    ["wizard.newApplicationTitle", {}],
    // handleSubmit — the non-HTML keys
    ["wizard.submit.redirect", {}],
    ["wizard.submit.errorTitle", {}],
    ["wizard.submit.errorText", {}],
];

describe.each(["fr", "en"])("wizard.* plain keys resolve in %s", lng => {
    const t = i18n.getFixedT(lng, NS);

    test.each(PLAIN_KEYS)("%s (%o) resolves to real, interpolated copy", (key, opts) => {
        const value = t(key, opts);
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
        expect(value).not.toBe(key);
        expect(value).not.toMatch(/\{\{/);
    });
});

describe.each(["fr", "en"])("wizard.steps.* — the 11 names are all distinct in %s", lng => {
    const t = i18n.getFixedT(lng, NS);

    test("no two step names collide", () => {
        const names = [
            "member",
            "contactDetails",
            "changeWishes",
            "packChoice",
            "activityChoice",
            "instruments",
            "availabilities",
            "levelEvaluation",
            "evaluationSlots",
            "payment",
            "summary",
        ].map(k => t(`wizard.steps.${k}`));
        expect(new Set(names).size).toBe(11);
    });
});

describe("wizard.steps.* — the exact French / English source copy", () => {
    const fr = i18n.getFixedT("fr", NS);
    const en = i18n.getFixedT("en", NS);

    test.each([
        ["member", "Membre concerné", "Member concerned"],
        ["contactDetails", "Coordonnées", "Contact details"],
        ["changeWishes", "Vœux de changement", "Change requests"],
        ["packChoice", "Choix de la formule", "Package choice"],
        ["activityChoice", "Choix de l'activité", "Activity choice"],
        ["instruments", "Instruments", "Instruments"],
        ["availabilities", "Disponibilités", "Availabilities"],
        ["levelEvaluation", "Évaluation de niveau", "Level evaluation"],
        ["evaluationSlots", "Créneaux d'évaluation", "Evaluation slots"],
        ["payment", "Paiement", "Payment"],
        ["summary", "Résumé", "Summary"],
    ])("wizard.steps.%s", (key, frCopy, enCopy) => {
        expect(fr(`wizard.steps.${key}`)).toBe(frCopy);
        expect(en(`wizard.steps.${key}`)).toBe(enCopy);
    });
});

describe("wizard chrome — the exact source copy", () => {
    const fr = i18n.getFixedT("fr", NS);
    const en = i18n.getFixedT("en", NS);

    test("nextStep / prevStep", () => {
        expect(fr("wizard.nextStep")).toBe("Suivant");
        expect(en("wizard.nextStep")).toBe("Next");
        expect(fr("wizard.prevStep")).toBe("Précédent");
        expect(en("wizard.prevStep")).toBe("Previous");
    });

    test("seasonsClosed reads naturally in both locales (fr grammar defect fixed)", () => {
        // The fr source used to have a subject/verb agreement defect ("Les inscriptions … est
        // fermée"); it now agrees ("… sont fermées").
        expect(fr("wizard.seasonsClosed")).toBe(
            "Les inscriptions à la saison actuelle sont fermées et celles de la saison suivante ne sont pas encore ouvertes."
        );
        expect(en("wizard.seasonsClosed")).toBe(
            "Registration for the current season is closed, and registration for the next season is not open yet."
        );
    });

    test("createSeason / newApplicationTitle", () => {
        expect(fr("wizard.createSeason")).toBe("Créer une saison");
        expect(en("wizard.createSeason")).toBe("Create a season");
        expect(fr("wizard.newApplicationTitle")).toBe("Nouvelle demande d'inscription");
        expect(en("wizard.newApplicationTitle")).toBe("New enrollment request");
    });
});

// ---- handleSubmit HTML keys -------------------------------------------------

describe.each(["fr", "en"])("wizard.submit HTML keys keep their markup and interpolate in %s", lng => {
    const t = i18n.getFixedT(lng, NS);

    test("greeting: <h5>/<b> wrapper, {name} filled, no leftover braces", () => {
        const value = t("wizard.submit.greeting", {name: "Jean Dupont"});
        expect(value).toContain("Jean Dupont");
        expect(value).toContain("<h5>");
        expect(value).toContain("<b>");
        expect(value).not.toMatch(/\{\{/);
    });

    test("applicationRegisteredHtml: <p>/<b>/<br/> markup, {id} filled, no leftover braces", () => {
        const value = t("wizard.submit.applicationRegisteredHtml", {id: 4242});
        expect(value).toContain("4242");
        expect(value).toContain("<p>");
        expect(value).toContain("<b>");
        expect(value).toContain("<br/>");
        expect(value).not.toMatch(/\{\{/);
    });

    test("packsAttributedHtml: <p>/<br/> markup, no leftover braces", () => {
        const value = t("wizard.submit.packsAttributedHtml");
        expect(value).toContain("<p>");
        expect(value).toContain("<br/>");
        expect(value).not.toMatch(/\{\{/);
    });
});

// ---- the sub-lexical <h3> subtitle composition ---------------------------
//
// render() does:
//   t("wizard.applicationSubtitle.full", {
//     activityPart: <allActivities> | <oneActivity {activity}>,
//     season: <season.label>,
//   })
// where `activityPart` is itself a nested `t(...)` result. Reproduce that composition here.

describe("wizard.applicationSubtitle.full — allActivities composition", () => {
    test("fr reads with single spaces and no leftover braces", () => {
        const t = i18n.getFixedT("fr", NS);
        const full = t("wizard.applicationSubtitle.full", {
            activityPart: t("wizard.applicationSubtitle.allActivities"),
            season: "2025-2026",
        });
        expect(full).toBe("Demande d'inscription aux activités pour la 2025-2026");
        expect(full).not.toMatch(/\{\{/);
        expect(full).not.toMatch(/\s{2,}/);
    });

    test("en reads naturally with single spaces and no leftover braces", () => {
        const t = i18n.getFixedT("en", NS);
        const full = t("wizard.applicationSubtitle.full", {
            activityPart: t("wizard.applicationSubtitle.allActivities"),
            season: "2025-2026",
        });
        expect(full).toBe("Enrollment request for all activities for 2025-2026");
        expect(full).not.toMatch(/\{\{/);
        expect(full).not.toMatch(/\s{2,}/);
    });
});

describe("wizard.applicationSubtitle.full — oneActivity composition", () => {
    test.each(["fr", "en"])("%s: contains the activity name and season, no leftover braces", lng => {
        const t = i18n.getFixedT(lng, NS);
        const activityPart = t("wizard.applicationSubtitle.oneActivity", {activity: "Piano"});
        const full = t("wizard.applicationSubtitle.full", {
            activityPart,
            season: "2025-2026",
        });
        expect(full).toContain("Piano");
        expect(full).toContain("2025-2026");
        expect(full).not.toMatch(/\{\{/);
    });

    // The original JSX was `"Demande d'inscription" + (" à l'activité " + name) + " pour la " + label`
    // — single spaces throughout. `oneActivity` therefore has a LEADING space only, and `full`
    // supplies the " pour la " space.
    test("fr composes with single spaces (matches the pre-extraction JSX)", () => {
        const t = i18n.getFixedT("fr", NS);
        const activityPart = t("wizard.applicationSubtitle.oneActivity", {activity: "Piano"});
        const full = t("wizard.applicationSubtitle.full", {activityPart, season: "2025-2026"});
        expect(full).toBe("Demande d'inscription à l'activité Piano pour la 2025-2026");
    });

    test("en composes with single spaces", () => {
        const t = i18n.getFixedT("en", NS);
        const activityPart = t("wizard.applicationSubtitle.oneActivity", {activity: "Piano"});
        const full = t("wizard.applicationSubtitle.full", {activityPart, season: "2025-2026"});
        expect(full).toBe("Enrollment request for the activity Piano for 2025-2026");
    });
});

describe("wizard.applicationSubtitle — the deliberate leading/trailing spaces are preserved", () => {
    test.each(["fr", "en"])("%s: allActivities has a LEADING space", lng => {
        const t = i18n.getFixedT(lng, NS);
        const part = t("wizard.applicationSubtitle.allActivities");
        expect(part.startsWith(" ")).toBe(true);
        expect(part.trim().length).toBeGreaterThan(0);
    });

    test.each(["fr", "en"])("%s: oneActivity has a LEADING space (and no trailing — full supplies it)", lng => {
        const t = i18n.getFixedT(lng, NS);
        const part = t("wizard.applicationSubtitle.oneActivity", {activity: "Piano"});
        expect(part.startsWith(" ")).toBe(true);
        expect(part.endsWith(" ")).toBe(false);
        expect(part).toContain("Piano");
        expect(part).not.toMatch(/\{\{/);
    });
});
