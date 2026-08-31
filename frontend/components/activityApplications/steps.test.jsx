// i18n extraction test — i18n-06 "activities" domain, lot 3a (`activityApplications` namespace).
//
// WrappedActivityChoice / ApplicationChangeQuestionnaire / Evaluation are StepZilla steps: their
// only extracted string is a toast fired from `isValidated()` via the i18n singleton
// (`i18n.t("activityApplications:...")`). They MUST stay plain classes — StepZilla only wires a
// step's isValidated() hook when the element is `instanceof React.Component`, so wrapping them in
// withTranslation() (a function component) would silently disable validation. Hence: a class-shape
// guard per component, plus a direct `isValidated()` call under the failing branch asserting the
// resolved French toast string.
//
// react-toastify's `toast` is mocked; the EvaluationForm child is stubbed to a null component
// while keeping the real `validateQuestions` export (used by two of the three isValidated impls).

import React from "react";
import i18n from "../../i18n";
import {toast} from "react-toastify";
import WrappedActivityChoice from "./WrappedActivityChoice";
import ApplicationChangeQuestionnaire from "./ApplicationChangeQuestionnaire";
import Evaluation from "./Evaluation";

vi.mock("react-toastify", () => {
    const toast = vi.fn();
    toast.error = vi.fn();
    return {toast};
});

vi.mock("../evaluation/EvaluationForm", async importActual => {
    const actual = await importActual();
    return {...actual, default: () => null};
});

vi.mock("./ActivityChoice", () => ({default: () => null}));

// The i18n singleton's LanguageDetector resolves to `en` here (jsdom navigator.language is
// en-US, <html lang> is empty), so pin it to fr before each test — these assertions check the
// French source copy.
beforeEach(async () => {
    await i18n.changeLanguage("fr");
});

afterEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("fr");
});

describe("StepZilla step shape guards (isValidated wiring depends on it)", () => {
    test.each([
        ["WrappedActivityChoice", WrappedActivityChoice],
        ["ApplicationChangeQuestionnaire", ApplicationChangeQuestionnaire],
        ["Evaluation", Evaluation],
    ])("%s is a plain class with isValidated and no withTranslation wrapper", (_name, Cmp) => {
        expect(Cmp.prototype instanceof React.Component).toBe(true);
        expect(typeof Cmp.prototype.isValidated).toBe("function");
        expect(Cmp.WrappedComponent).toBeUndefined();
    });
});

describe("isValidated() toasts resolve through the activityApplications namespace", () => {
    test("WrappedActivityChoice: no activity/formula/pack selected -> noActivityError toast", () => {
        const step = new WrappedActivityChoice({
            selectedActivities: [],
            selectedFormulas: {},
            selectedPacks: {},
        });

        expect(step.isValidated()).toBe(false);
        expect(toast.error).toHaveBeenCalledWith(
            i18n.t("activityApplications:wrappedActivityChoice.noActivityError"),
            expect.objectContaining({autoClose: 3000})
        );
        expect(toast.error.mock.calls[0][0]).toBe(
            "Vous devez choisir au moins une activité si vous n'avez pas sélectionné de formule"
        );
    });

    test("ApplicationChangeQuestionnaire: unanswered mandatory questions -> requiredQuestionsError toast", () => {
        const step = new ApplicationChangeQuestionnaire({
            questions: [{id: 1, is_required: true}],
            answers: {},
        });

        expect(step.isValidated()).toBe(false);
        expect(toast.error).toHaveBeenCalledWith(
            i18n.t("activityApplications:applicationChangeQuestionnaire.requiredQuestionsError"),
            expect.objectContaining({autoClose: 3000})
        );
        expect(toast.error.mock.calls[0][0]).toBe(
            "Vous devez répondre aux questions obligatoires de ce questionnaire"
        );
    });

    test("Evaluation: unanswered questionnaires -> answerQuestionnairesError toast", () => {
        const step = new Evaluation({
            refsToEvaluate: [{id: 1}],
            answers: {},
            questions: [],
        });

        expect(step.isValidated()).toBe(false);
        expect(toast).toHaveBeenCalledWith(
            i18n.t("activityApplications:evaluation.answerQuestionnairesError"),
            expect.objectContaining({type: "error"})
        );
        expect(toast.mock.calls[0][0]).toBe("Veuillez répondre au.x questionnaire.s");
    });
});
