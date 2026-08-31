import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import moment from "moment";
import "moment/locale/fr";

import common_fr from "../locales/fr/common.json";
import common_en from "../locales/en/common.json";
import users_fr from "../locales/fr/users.json";
import users_en from "../locales/en/users.json";
import evaluation_fr from "../locales/fr/evaluation.json";
import evaluation_en from "../locales/en/evaluation.json";
import payments_fr from "../locales/fr/payments.json";
import payments_en from "../locales/en/payments.json";
import formules_fr from "../locales/fr/formules.json";
import formules_en from "../locales/en/formules.json";
import planning_fr from "../locales/fr/planning.json";
import planning_en from "../locales/en/planning.json";
import activities_fr from "../locales/fr/activities.json";
import activities_en from "../locales/en/activities.json";
import courses_fr from "../locales/fr/courses.json";
import courses_en from "../locales/en/courses.json";
import activityApplications_fr from "../locales/fr/activityApplications.json";
import activityApplications_en from "../locales/en/activityApplications.json";

const resources = {
    fr: {common: common_fr, users: users_fr, evaluation: evaluation_fr, payments: payments_fr, formules: formules_fr, planning: planning_fr, activities: activities_fr, courses: courses_fr, activityApplications: activityApplications_fr},
    en: {common: common_en, users: users_en, evaluation: evaluation_en, payments: payments_en, formules: formules_en, planning: planning_en, activities: activities_en, courses: courses_en, activityApplications: activityApplications_en},
};

// Derived from `resources` so it can't drift from what's actually loaded here. Still needs to
// stay in sync with Elvis::SUPPORTED_LOCALES (lib/elvis/supported_locales.rb) by hand — there's
// no shared source of truth across the two runtimes.
const SUPPORTED_LOCALES = Object.keys(resources);

// <html lang="..."> is rendered server-side by ApplicationController#switch_locale (see
// docs/I18n.md), reflecting the same resolution cascade (user preference -> cookie ->
// installation default, including the per-installation default set via the "Langues" settings
// screen) already used for ERB-rendered pages. Read it directly instead of hardcoding a fallback
// locale here, so the JS-side fallback can't diverge from the backend's actual configured
// default.
const initialLocale = (typeof document !== "undefined" && document.documentElement.lang) || "fr";

// Keep moment's locale tracking the active UI language. Registered *before* init() so an
// init-time `languageChanged` emit (inline resources + the synchronous htmlTag detector resolve
// the language during init, not in a later microtask) is not missed.
// Only "fr" locale data is bundled below; moment.locale("xx") with no data is a silent no-op, so
// warn if a newly-added UI language has no matching moment locale.
i18n.on("languageChanged", (lng) => {
    const target = lng || initialLocale;
    if (moment.locale(target) !== target && target !== "en") {
        // eslint-disable-next-line no-console
        console.warn(`[i18n] no moment locale data for "${target}"; dates will render in "${moment.locale()}"`);
    }
});

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        supportedLngs: SUPPORTED_LOCALES,
        fallbackLng: initialLocale,
        defaultNS: "common",
        ns: ["common", "users", "evaluation", "payments", "formules", "planning", "activities", "courses", "activityApplications"],
        detection: {
            // Only fall back to localStorage/navigator if <html lang> is somehow missing.
            order: ["htmlTag", "localStorage", "navigator"],
        },
        interpolation: {
            escapeValue: false, // React already escapes interpolated values
        },
    });

// Belt-and-braces, intentionally redundant with the pre-init listener above (under i18next 26
// with inline resources, init() resolves the language and emits `languageChanged` synchronously,
// so the listener has already fired by here). Kept so the moment locale is still correct if a
// future i18next version defers that emit. `moment.locale(undefined)` is a getter that would
// silently leave moment on "en", so never pass a possibly-undefined value.
moment.locale(i18n.language || initialLocale);

export default i18n;
