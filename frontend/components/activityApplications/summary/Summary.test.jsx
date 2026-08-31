// i18n extraction test — i18n-06 "activities" domain, lot 3g (`activityApplications` namespace,
// `summary.*` keys). Covers `Summary.jsx` (the top-level admin panel of the activity-application
// summary page).
//
// `Summary`'s default export is `withTranslation("activityApplications")(Summary)` (class). Its
// `render()` threads `t` (from props, injected by the HOC) into: the header labels
// (`status` / `referent` / `selectReferent`), the member line (`ageYears` / `memberNumber`), the
// "other applications" block (`newRequest` / `otherApplications`), every action-bar
// `data-tippy-content` / ButtonModal `tooltip` (`summary.tooltips.*`), the `<option>` placeholders
// inside the three questionnaire/evaluation modals (`selectQuestionnaire` / `selectEvaluation`),
// the `begin_at` / stop-date `<label>`s, and the status modal footer buttons
// (`common:actions.cancel` / `common:actions.validate`).
// The module-level `renderEvaluationForm` helper resolves its error branch through the singleton
// (`i18n.t("activityApplications:summary.evaluationRenderError")`) — covered at the i18n layer.
//
// Heavy children are mocked so Summary's own translated copy renders synchronously:
//   - `react-modal` renders its children unconditionally, so every ButtonModal body (and its
//     `<option>` placeholders) is in the DOM without a click.
//   - `./Activity`, `../../CommentSection`, `../../evaluation/EvaluationForm`,
//     `../EvaluationChoice`, `../TimePreferencesStep`, `../../common/UserWithInfos` are stubbed.
//   - `../../../tools/api` is a chainable stub (not hit on mount/render).

import React from "react";
import {render, screen, waitFor, within} from "@testing-library/react";
import _ from "lodash";
import i18n from "../../../i18n";
import fr from "../../../locales/fr/activityApplications.json";
import en from "../../../locales/en/activityApplications.json";
import Summary from "./Summary";

// Some transitive lodash-chain helpers in this tree read the global `_` without importing it.
global._ = _;

// --- mocks -------------------------------------------------------------------------------------

vi.mock("react-modal", () => ({
    default: ({children}) => <div data-testid="react-modal">{children}</div>,
}));

vi.mock("@fullcalendar/react", () => ({
    isValidDate: d => !Number.isNaN(new Date(d).getTime()),
}));

vi.mock("./Activity", () => ({default: () => <div data-testid="activity-stub" />}));
vi.mock("../../CommentSection", () => ({default: () => <div data-testid="comment-section-stub" />}));
vi.mock("../../evaluation/EvaluationForm", () => ({default: () => <div data-testid="eval-form-stub" />}));
vi.mock("../EvaluationChoice", () => ({default: () => <div data-testid="eval-choice-stub" />}));
vi.mock("../TimePreferencesStep", () => ({
    default: () => <div data-testid="time-prefs-stub" />,
    PLANNING_MODE: "PLANNING",
}));
vi.mock("../../common/UserWithInfos", () => ({
    default: ({children}) => <span data-testid="user-with-infos">{children}</span>,
}));

vi.mock("../../../tools/api", () => {
    const chain = {
        before: () => chain,
        useLoading: () => chain,
        success: () => chain,
        error: () => chain,
        get: vi.fn(() => Promise.resolve()),
        post: vi.fn(() => Promise.resolve()),
        patch: vi.fn(() => Promise.resolve()),
        del: vi.fn(() => Promise.resolve()),
    };
    return {set: () => chain, patch: vi.fn(() => Promise.resolve({data: {}}))};
});

// --- props -----------------------------------------------------------------------------------

// `user.activity_applications` holds one sibling application (same `season_id`, different `id`) so
// the "other applications" ButtonModal renders — that is the only render path for `summary.status`
// inside the sibling row, `summary.newRequest` and `summary.otherApplications`.
const baseApplication = () => ({
    id: 100,
    season_id: 1,
    user_id: 2,
    begin_at: "2025-09-01",
    status_updated_at: null,
    referent_id: null,
    mail_sent: false,
    mail_sent_at: null,
    stopped_at: null,
    reason_of_refusal: "",
    activity_application_status: {id: 1, label: "En attente"},
    desired_activities: [],
    comments: [],
    evaluation_appointments: [],
    season: {start: "2025-09-01", end: "2026-06-30"},
    user: {
        id: 2,
        first_name: "Marie",
        last_name: "Curie",
        birthday: "2010-05-04",
        adherent_number: 42,
        levels: [],
        planning: {id: 1, time_intervals: []},
        activity_applications: [
            {
                id: 200,
                season_id: 1,
                desired_activities: [],
                activity_application_status: {label: "Traitée"},
                pre_application_activity: null,
                pre_application_desired_activity: null,
            },
        ],
    },
});

const baseProps = () => ({
    application: baseApplication(),
    statuses: [],
    admins: [],
    activityRefs: [],
    seasons: [],
    levels: [],
    isAdmin: false,
    user_id: 9,
    student_evaluations: {forms: []},
    application_change_questionnaires: {forms: []},
    new_student_level_questionnaires: [],
    student_evaluation_questions: [],
    application_change_questions: [],
    new_student_level_questions: [],
});

beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({json: () => Promise.resolve([])});
});

afterEach(async () => {
    vi.clearAllMocks();
    delete global.fetch;
    await i18n.changeLanguage("fr");
});

// ==============================================================================================
// A. WrappedComponent guard
// ==============================================================================================

describe("Summary — withTranslation HOC shape", () => {
    test("default export wraps a React.Component class", () => {
        expect(Summary.WrappedComponent).toBeDefined();
        expect(Summary.WrappedComponent.prototype instanceof React.Component).toBe(true);
    });
});

// ==============================================================================================
// B. Shallow mount — translated render-path copy per locale
// ==============================================================================================

describe("Summary — rendered copy per locale", () => {
    const CASES = {
        fr: {
            status: "Statut",
            referent: "Référent.e",
            selectReferent: "SELECTIONNER UN REFERENT",
            newRequest: "Nouvelle demande",
            otherApplications: "Autres demandes",
            ageYears: /\d+ ans/,
            memberNumber: /- Adhérent n°42/,
            beginDate: "Début le",
            selectQuestionnaire: "Sélectionnez un questionnaire",
            selectEvaluation: "Sélectionnez une évaluation",
            changeQuestionnaireTitle: "Questionnaire sur le changement",
            studentEvaluationsTitle: "Évaluations de l'élève",
            availabilitiesTitle: "Disponibilités horaires",
            mailNotSent: "Pas envoyé",
            cancel: "Annuler",
            validate: "Valider",
            tooltips: {
                viewProfile: "Voir la fiche",
                sendConfirmMail: "Envoyer mail confirmation",
                comments: "Commentaires",
                availabilities: "Disponibilités horaires",
                deletePermanently: "Supprimer définitivement cette demande",
            },
        },
        en: {
            status: "Status",
            referent: "Referent",
            selectReferent: "SELECT A REFERENT",
            newRequest: "New request",
            otherApplications: "Other requests",
            ageYears: /\d+ years old/,
            memberNumber: /- Member no\. 42/,
            beginDate: "Start on",
            selectQuestionnaire: "Select a questionnaire",
            selectEvaluation: "Select an evaluation",
            changeQuestionnaireTitle: "Questionnaire about the change",
            studentEvaluationsTitle: "Student's evaluations",
            availabilitiesTitle: "Time availabilities",
            mailNotSent: "Not sent",
            cancel: "Cancel",
            validate: "Submit",
            tooltips: {
                viewProfile: "View profile",
                sendConfirmMail: "Send confirmation email",
                comments: "Comments",
                availabilities: "Time availabilities",
                deletePermanently: "Permanently delete this request",
            },
        },
    };

    const tip = s => document.querySelector(`[data-tippy-content="${s}"]`);

    test.each(["fr", "en"])("%s", async lng => {
        await i18n.changeLanguage(lng);
        const expected = CASES[lng];

        const {container} = render(<Summary {...baseProps()} />);

        // header labels
        expect(screen.getAllByText(expected.status).length).toBeGreaterThan(0);
        expect(screen.getByText(expected.referent)).toBeInTheDocument();
        expect(screen.getByText(expected.selectReferent)).toBeInTheDocument();

        // "other applications" block (needs the sibling activity_application fixture)
        expect(screen.getByText(expected.newRequest)).toBeInTheDocument();
        expect(screen.getAllByText(expected.otherApplications).length).toBeGreaterThan(0);

        // member line — {{age}} varies with the system clock, {{number}} is the fixture's 42.
        // (Two <h2>s render: the member line and the "other applications" modal title.)
        const heading = container.querySelector("h2.no-margins");
        expect(heading).toHaveTextContent(expected.ageYears);
        expect(heading).toHaveTextContent(expected.memberNumber);
        expect(within(heading).getByText(expected.memberNumber)).toBeInTheDocument();

        // date labels
        expect(screen.getByText(expected.beginDate)).toBeInTheDocument();

        // <option> placeholders inside the (react-modal-mocked) questionnaire/evaluation modals
        expect(screen.getAllByText(expected.selectQuestionnaire).length).toBeGreaterThan(0);
        expect(screen.getByText(expected.selectEvaluation)).toBeInTheDocument();
        expect(screen.getByText(expected.changeQuestionnaireTitle)).toBeInTheDocument();
        expect(screen.getByText(expected.studentEvaluationsTitle)).toBeInTheDocument();
        expect(screen.getAllByText(expected.availabilitiesTitle).length).toBeGreaterThan(0);

        // mail-sent status line
        expect(screen.getByText(expected.mailNotSent)).toBeInTheDocument();

        // status modal footer — bootstrap modal carries aria-hidden, so query by text not role
        expect(screen.getByText(expected.cancel)).toBeInTheDocument();
        expect(screen.getByText(expected.validate)).toBeInTheDocument();

        // tooltips: data-tippy-content on the action <a>/<button>, and ButtonModal's wrapper <span>
        expect(tip(expected.tooltips.viewProfile)).toBeTruthy();
        expect(tip(expected.tooltips.sendConfirmMail)).toBeTruthy();
        expect(tip(expected.tooltips.comments)).toBeTruthy();
        expect(tip(expected.tooltips.availabilities)).toBeTruthy();
        expect(tip(expected.tooltips.deletePermanently)).toBeTruthy();

        // no raw `summary.*` key and no un-interpolated `{{…}}` leaked into the DOM
        expect(container.innerHTML).not.toMatch(/summary\.[a-zA-Z]/);
        expect(container.innerHTML).not.toContain("{{");
    });
});

// ==============================================================================================
// C. Locale reactivity — the withTranslation HOC re-renders on i18n.changeLanguage
// ==============================================================================================

describe("Summary — locale switch re-renders labels", () => {
    test("fr → en flips summary.referent / summary.status without remount", async () => {
        await i18n.changeLanguage("fr");
        render(<Summary {...baseProps()} />);

        expect(screen.getByText("Référent.e")).toBeInTheDocument();
        expect(screen.getAllByText("Statut").length).toBeGreaterThan(0);

        await i18n.changeLanguage("en");

        await waitFor(() => expect(screen.getByText("Referent")).toBeInTheDocument());
        expect(screen.getAllByText("Status").length).toBeGreaterThan(0);
        expect(screen.queryByText("Référent.e")).not.toBeInTheDocument();
    });
});

// ==============================================================================================
// D. i18n layer — every summary.* leaf key resolves, fully interpolated, in both locales
// ==============================================================================================

describe("Summary — summary.* i18n layer", () => {
    const flatten = (obj, prefix = "") =>
        Object.entries(obj).flatMap(([k, v]) =>
            v && typeof v === "object"
                ? flatten(v, `${prefix}${k}.`)
                : [[`${prefix}${k}`, v]],
        );

    const FR_KEYS = flatten(fr.summary).map(([k]) => k);
    const EN_KEYS = flatten(en.summary).map(([k]) => k);

    const OPTS = {
        age: 9,
        number: 42,
        name: "Marie Curie",
        when: "il y a 2 jours",
        date: "01/09/2025",
        course: "Piano",
        group: "Groupe A",
        teacher: "Jean Dupont",
        kind: "Ado",
        season: "2025-2026",
    };

    test("fr and en expose exactly the same summary.* key set", () => {
        expect(new Set(EN_KEYS)).toEqual(new Set(FR_KEYS));
        expect(FR_KEYS.length).toBeGreaterThan(40);
    });

    test.each(["fr", "en"])("all summary.* keys resolve to real, fully-interpolated copy in %s", lng => {
        const t = i18n.getFixedT(lng, "activityApplications");
        for (const key of FR_KEYS) {
            const v = t(`summary.${key}`, OPTS);
            expect(typeof v).toBe("string");
            expect(v.length).toBeGreaterThan(0);
            expect(v).not.toBe(`summary.${key}`);
            expect(v).not.toContain("{{");
            expect(v).not.toContain("}}");
        }
    });

    test("ageYears interpolates {{age}}", () => {
        expect(i18n.getFixedT("fr", "activityApplications")("summary.ageYears", {age: 9})).toBe("9 ans");
        expect(i18n.getFixedT("en", "activityApplications")("summary.ageYears", {age: 9})).toBe(
            "9 years old",
        );
    });

    test("memberNumber interpolates {{number}} and keeps its leading ' - '", () => {
        expect(
            i18n.getFixedT("fr", "activityApplications")("summary.memberNumber", {number: 42}),
        ).toBe(" - Adhérent n°42");
        expect(
            i18n.getFixedT("en", "activityApplications")("summary.memberNumber", {number: 42}),
        ).toBe(" - Member no. 42");
    });

    test("selectReferent keeps the source's missing accents (fr)", () => {
        expect(i18n.getFixedT("fr", "activityApplications")("summary.selectReferent")).toBe(
            "SELECTIONNER UN REFERENT",
        );
    });

    test("courseOption / evaluationOption interpolate every placeholder", () => {
        for (const lng of ["fr", "en"]) {
            const t = i18n.getFixedT(lng, "activityApplications");
            const course = t("summary.courseOption", {
                course: "Piano",
                group: "Groupe A",
                teacher: "Jean Dupont",
            });
            expect(course).toContain("Piano");
            expect(course).toContain("Groupe A");
            expect(course).toContain("Jean Dupont");
            expect(course).not.toMatch(/\{\{/);

            const evalOpt = t("summary.evaluationOption", {
                season: "2025-2026",
                course: "Piano",
                group: "Groupe A",
                teacher: "Jean Dupont",
            });
            expect(evalOpt).toContain("2025-2026");
            expect(evalOpt).not.toMatch(/\{\{/);
        }
    });

    test("evaluationRenderError (the renderEvaluationForm singleton branch) resolves", () => {
        expect(i18n.t("activityApplications:summary.evaluationRenderError")).toBe(
            "Echec du rendu : cette évaluation n'existe pas",
        );
    });

    test("beginDate / stopDate resolve in both locales", () => {
        const frT = i18n.getFixedT("fr", "activityApplications");
        const enT = i18n.getFixedT("en", "activityApplications");
        expect(frT("summary.beginDate")).toBe("Début le");
        expect(frT("summary.stopDate")).toBe("Arrêt le");
        expect(enT("summary.beginDate")).toBe("Start on");
        expect(enT("summary.stopDate")).toBe("Stop on");
    });

    test("tooltips.* all resolve in both locales", () => {
        for (const lng of ["fr", "en"]) {
            const t = i18n.getFixedT(lng, "activityApplications");
            for (const key of Object.keys(fr.summary.tooltips)) {
                const v = t(`summary.tooltips.${key}`);
                expect(v.length).toBeGreaterThan(0);
                expect(v).not.toBe(`summary.tooltips.${key}`);
            }
        }
    });
});
