import i18n from "../i18n";

export const PRE_APPLICATION_ACTIONS = {
    NEW: 0,
    RENEW: 1,
    CHANGE: 2,
    STOP: 3,
    PURSUE_CHILDHOOD: 4,
    CHAM: 5
};

export const PRE_APPLICATION_ACTION_LABELS = {
    new: "Nouvelle inscription",
    renew: "Renouvellement",
    change: "Changement",
    stop: "Arrêt",
    pursue_childhood: "Poursuite enfance",
    cham: "Inscription CHAM"
};

// --- Constants sourced from the `common` i18n namespace, so they follow the active UI language
// (constants-i18n lots 1-2; KINDS_LABEL / PRE_APPLICATION_ACTION_LABELS / RECURRENCE_TYPES above
// and below are still pending, see docs/KnownIssues.md). `import i18n from "../i18n"` runs
// i18next's synchronous init (inline resources), so `t()` returns real values immediately at
// module load, not just after the first render. Every export below is an `export let` binding
// that the single `languageChanged` subscription at the bottom of this block re-reads on an
// in-page locale switch — the *binding* every `import { X }` reads is updated (ES live bindings);
// a consumer still only repaints if it (or an ancestor) re-renders. WEEKDAYS/MONTHS fall back to
// a hardcoded French array if their `common:` key ever goes missing (botched merge) — `t()` would
// otherwise return the key string, and indexing/iterating that string would be silent garbage.
// MESSAGES/API_ERRORS_MESSAGES have no such fallback: a missing key there just renders as the raw
// i18next key string in that one message, not a whole-object failure, so it isn't worth doubling
// every string as a hardcoded duplicate.

const _WEEKDAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const _MONTHS_FR = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août",
    "Septembre", "Octobre", "Novembre", "Décembre"];
const _loadArray = (key, fallback) => {
    const value = i18n.t(key, { returnObjects: true });
    return Array.isArray(value) ? value : fallback;
};
const _loadWeekdays = () => _loadArray("common:weekdays", _WEEKDAYS_FR);
const _loadMonths = () => _loadArray("common:months", _MONTHS_FR);

// WEEKDAYS is Sunday-indexed (`WEEKDAYS[date.getDay()]`).
export let WEEKDAYS = _loadWeekdays();
export let MONTHS = _loadMonths();

// API_ERRORS_MESSAGES: server error-code -> display text. Keys stay the original snake_case
// identifiers (tools/api.js looks them up as `API_ERRORS_MESSAGES[err]`, where `err` is a
// server-supplied error code, not a UI string) — only the *values* are localized.
const _loadApiErrorsMessages = () => ({
    default: i18n.t("common:apiErrors.default"),
    err_interval_validated: i18n.t("common:apiErrors.errIntervalValidated"),
    err_interval_creation_failed: i18n.t("common:apiErrors.errIntervalCreationFailed"),
    err_interval_creation_partial: i18n.t("common:apiErrors.errIntervalCreationPartial"),
    err_interval_bounds: i18n.t("common:apiErrors.errIntervalBounds"),
    err_interval_not_found: i18n.t("common:apiErrors.errIntervalNotFound"),
    err_group_name_exists: i18n.t("common:apiErrors.errGroupNameExists"),
    err_group_name_empty: i18n.t("common:apiErrors.errGroupNameEmpty"),
    err_evaluation_interval_already_taken: i18n.t("common:apiErrors.errEvaluationIntervalAlreadyTaken"),
});

export let API_ERRORS_MESSAGES = _loadApiErrorsMessages();

// MESSAGES: shared validation-error / toast dictionary. Keys stay the original snake_case
// identifiers because several call sites index into this object with a bare sentinel string a
// validator returned (`tools/validators.js`'s plain validators return e.g. "err_required", not
// display text; a consuming component then resolves it via `MESSAGES[error]` — see
// components/common/{Input,InputSelect,InputColor,AlertCheckbox,AlertYesNoRadio,
// InlineYesNoRadio,ValidationErrorList}.jsx). The 7 function-valued entries
// (err_min_length/err_exact_length/err_starts_with/the 4 err_ord_*) take the interpolation value
// and return the localized string immediately, bypassing that lookup.
const _loadMessages = () => ({
    no_answer: i18n.t("common:messages.noAnswer"),
    err_min_length: length => i18n.t("common:messages.errMinLength", { length }),
    err_exact_length: length => i18n.t("common:messages.errExactLength", { length }),
    err_starts_with: str => i18n.t("common:messages.errStartsWith"),
    err_required: i18n.t("common:messages.errRequired"),
    err_is_invalid: i18n.t("common:messages.errIsInvalid"),
    err_is_invalid_id: i18n.t("common:messages.errIsInvalidId"),
    err_agreement_gdpr: i18n.t("common:messages.errAgreementGdpr"),
    err_agreement_image_right: i18n.t("common:messages.errAgreementImageRight"),
    err_must_have_payer: i18n.t("common:messages.errMustHavePayer"),
    err_must_check_rules: i18n.t("common:messages.errMustCheckRules"),
    err_phone_format: i18n.t("common:messages.errPhoneFormat"),
    err_at_least_one_phone: i18n.t("common:messages.errAtLeastOnePhone"),
    err_at_least_one_address: i18n.t("common:messages.errAtLeastOneAddress"),
    err_postal_code: i18n.t("common:messages.errPostalCode"),
    err_must_select_user: i18n.t("common:messages.errMustSelectUser"),
    err_must_choose_slot: i18n.t("common:messages.errMustChooseSlot"),
    err_must_choose_activity: i18n.t("common:messages.errMustChooseActivity"),
    err_must_choose_teacher: i18n.t("common:messages.errMustChooseTeacher"),
    err_must_choose_room: i18n.t("common:messages.errMustChooseRoom"),
    err_negative_date_range: i18n.t("common:messages.errNegativeDateRange"),
    err_negative_hour_range: i18n.t("common:messages.errNegativeHourRange"),
    err_data_missing: i18n.t("common:messages.errDataMissing"),
    err_invalid_age: i18n.t("common:messages.errInvalidAge"),
    err_invalid_NN: i18n.t("common:messages.errInvalidNN"),
    err_invalid_email: i18n.t("common:messages.errInvalidEmail"),
    err_links_missing: i18n.t("common:messages.errLinksMissing"),
    err_interval_integrity: i18n.t("common:messages.errIntervalIntegrity"),
    err_ord_gte: mark => i18n.t("common:messages.errOrdGte", { mark }),
    err_ord_gt: mark => i18n.t("common:messages.errOrdGt", { mark }),
    err_ord_lte: mark => i18n.t("common:messages.errOrdLte", { mark }),
    err_ord_lt: mark => i18n.t("common:messages.errOrdLt", { mark }),
    err_must_check_consent: i18n.t("common:messages.errMustCheckConsent"),
    err_must_respond: i18n.t("common:messages.errMustRespond"),
    err_must_select_price: i18n.t("common:messages.errMustSelectPrice"),
    err_cannot_duplicate_price: i18n.t("common:messages.errCannotDuplicatePrice"),
    err_must_select_payment_terms: i18n.t("common:messages.errMustSelectPaymentTerms"),
});

export let MESSAGES = _loadMessages();

i18n.on("languageChanged", () => {
    WEEKDAYS = _loadWeekdays();
    MONTHS = _loadMonths();
    API_ERRORS_MESSAGES = _loadApiErrorsMessages();
    MESSAGES = _loadMessages();
});

// --- End of constants sourced from the `common` i18n namespace.

export const INTERVAL_KINDS = {
    AVAILABILITY: "p",
    LESSON: "c",
    EVALUATION: "e",
    OPTION: "o",
};

export const KINDS_LABEL = {
    [INTERVAL_KINDS.AVAILABILITY]: "Disponibilité",
    [INTERVAL_KINDS.LESSON]: "Cours",
    [INTERVAL_KINDS.EVALUATION]: "Evaluation",
    [INTERVAL_KINDS.OPTION]: "Option",
};

export const TIME_STEPS = [
    { label: "1h", value: 1 },
    { label: "45min", value: 0.75 },
    { label: "30min", value: 0.5 },
    { label: "15min", value: 0.25 },
];

export const RECURRENCE_TYPES = {
    DAILY: "daily",
    WEEKLY: "weekly",
    BIWEEKLY: "biweekly",
    MONTHLY: "monthly",
    BIMONTHLY: "bimonthly",
    YEARLY: "yearly",
    toString: function (type) {
        return {
            [this.DAILY]: "Tous les jours",
            [this.WEEKLY]: "Toutes les semaines",
            [this.BIWEEKLY]: "Toutes les deux semaines",
            [this.MONTHLY]: "Tous les mois",
            [this.BIMONTHLY]: "Tous les deux mois",
            [this.YEARLY]: "Tous les ans",
        }[type];
    },
    getDefault: function () {return this.WEEKLY},
    getAll: function () {return Object.values(this).filter(v => typeof v === "string")},
}

export const modalStyle = {
    overlay: {
        overflowY: "auto",
        alignItems: "flex-start",
    },
    content: {
        bottom: "initial",
        maxHeight: "max-content",
        top: "20px",
        left: "20px",
        right: "20px",
        transform: "none",
    },
};

export const ACTIVITY_KIND_COLORS = {
    Enfance: "#FFC314",
    CHAM: "#5A676F",
    ATELIERS: "#FF9846",
    DEFAULT: "#E96469",
};
