import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import moment from "moment";
import "moment/locale/fr";

import common_fr from "../locales/fr/common.json";
import common_en from "../locales/en/common.json";

// Keep in sync with Elvis::SUPPORTED_LOCALES (lib/elvis/supported_locales.rb) — this is the
// frontend's own copy of the list, there is no shared source of truth across the two runtimes.
const SUPPORTED_LOCALES = ["fr", "en"];

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            fr: {common: common_fr},
            en: {common: common_en},
        },
        supportedLngs: SUPPORTED_LOCALES,
        fallbackLng: "fr",
        defaultNS: "common",
        ns: ["common"],
        detection: {
            // <html lang="..."> is rendered server-side by ApplicationController#switch_locale
            // (see docs/I18n.md), so it reflects the same resolution cascade (user preference ->
            // cookie -> installation default) already used for ERB-rendered pages. Only fall back
            // to localStorage/navigator if that's somehow missing.
            order: ["htmlTag", "localStorage", "navigator"],
            caches: ["localStorage"],
            htmlTag: document.documentElement,
        },
        interpolation: {
            escapeValue: false, // React already escapes interpolated values
        },
    });

// Centralizes moment's locale so it always tracks the active UI language. Several components
// still `require("moment/locale/fr")` individually (a pre-existing pattern that also has the side
// effect of forcing moment's *global* locale to "fr" as soon as that module loads) — those are a
// known follow-up, not yet cleaned up here, see docs/I18n.md.
moment.locale(i18n.language);
i18n.on("languageChanged", (lng) => moment.locale(lng));

export default i18n;
