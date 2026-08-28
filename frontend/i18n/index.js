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

const resources = {
    fr: {common: common_fr, users: users_fr, evaluation: evaluation_fr},
    en: {common: common_en, users: users_en, evaluation: evaluation_en},
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

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        supportedLngs: SUPPORTED_LOCALES,
        fallbackLng: initialLocale,
        defaultNS: "common",
        ns: ["common", "users", "evaluation"],
        detection: {
            // Only fall back to localStorage/navigator if <html lang> is somehow missing.
            order: ["htmlTag", "localStorage", "navigator"],
        },
        interpolation: {
            escapeValue: false, // React already escapes interpolated values
        },
    });

// Centralizes moment's locale so it always tracks the active UI language.
moment.locale(i18n.language);
i18n.on("languageChanged", (lng) => moment.locale(lng));

export default i18n;
