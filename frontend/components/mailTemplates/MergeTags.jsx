import i18n from "../../i18n";

// Merge-tag dictionaries consumed by TemplateEditor.jsx -> ElvisEditor.jsx's
// `unlayer.setMergeTags(props.mergeTags)`. Per @unlayer/types' MergeTag interface
// (node_modules/@unlayer/types/dist/editor/merge-tags.d.ts), `name` is purely the display label
// shown in the unlayer merge-tag picker and `sample` is purely the preview/example text shown in
// unlayer's "sample data" preview mode — neither is a lookup/matching key. `value` (the actual
// `{{...}}` Liquid placeholder substituted server-side) and each dictionary's own object keys
// (e.g. `first_name`, `applicationId` — the id unlayer indexes tags by) ARE load-bearing and stay
// exactly as-is; only `name`/`sample` (and each loop tag's `rules.repeat.name`, itself a display
// label — `rules.repeat.before`/`after` are literal Liquid `{% for %}` syntax, untouched) are
// localized here. Docs/KnownIssues.md "Constant-module label dictionaries NOT extracted in P5".
//
// Same `export let` + `languageChanged` live-binding pattern as tools/constants.ts's
// WEEKDAYS/KINDS_LABEL/etc. and utils/StopReasons.ts's STOP_REASONS.

const _loadApplicationTags = () => ({
    first_name: {
        name: i18n.t("parameters:mailTemplates.mergeTags.application.firstName.name"),
        value: "{{first_name}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.application.firstName.sample"),
    },

    last_name: {
        name: i18n.t("parameters:mailTemplates.mergeTags.application.lastName.name"),
        value: "{{last_name}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.application.lastName.sample"),
    },

    applicationId: {
        name: i18n.t("parameters:mailTemplates.mergeTags.application.applicationId.name"),
        value: "{{application.id}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.application.applicationId.sample"),
    },

    application_season_label: {
        name: i18n.t("parameters:mailTemplates.mergeTags.application.seasonLabel.name"),
        value: "{{application.season_label}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.application.seasonLabel.sample"),
    },

    application_total_all_due_payments: {
        name: i18n.t("parameters:mailTemplates.mergeTags.application.totalAllDuePayments.name"),
        value: "{{application.total_all_due_payments}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.application.totalAllDuePayments.sample"),
    },

    application_total_pending_due_payments: {
        name: i18n.t("parameters:mailTemplates.mergeTags.application.totalPendingDuePayments.name"),
        value: "{{application.total_pending_due_payments}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.application.totalPendingDuePayments.sample"),
    },
});

export let APPLICATION_TAGS = _loadApplicationTags();

const _loadActivityTags = () => ({
    activity_day_in_week: {
        name: i18n.t("parameters:mailTemplates.mergeTags.activity.dayInWeek.name"),
        value: "{{activity.day_in_week}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.activity.dayInWeek.sample"),
    },

    activity_start_date: {
        name: i18n.t("parameters:mailTemplates.mergeTags.activity.startDate.name"),
        value: "{{activity.startDate}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.activity.startDate.sample"),
    },

    activity_start_hour: {
        name: i18n.t("parameters:mailTemplates.mergeTags.activity.startHour.name"),
        value: "{{activity.activity_start}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.activity.startHour.sample"),
    },

    activity_end: {
        name: i18n.t("parameters:mailTemplates.mergeTags.activity.end.name"),
        value: "{{activity.activity_end}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.activity.end.sample"),
    },

    activity_label: {
        name: i18n.t("parameters:mailTemplates.mergeTags.activity.label.name"),
        value: "{{activity.display_name}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.activity.label.sample"),
    },

    activity_teacher_first_name: {
        name: i18n.t("parameters:mailTemplates.mergeTags.activity.teacherFirstName.name"),
        value: "{{activity.teacher_first_name}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.activity.teacherFirstName.sample"),
    },

    activity_teacher_last_name: {
        name: i18n.t("parameters:mailTemplates.mergeTags.activity.teacherLastName.name"),
        value: "{{activity.teacher_last_name}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.activity.teacherLastName.sample"),
    },

    activity_display_price: {
        name: i18n.t("parameters:mailTemplates.mergeTags.activity.displayPrice.name"),
        value: "{{activity.display_price}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.activity.displayPrice.sample"),
    },
});

export let ACTIVITY_TAGS = _loadActivityTags();

const _loadActivityInstanceTags = () => ({
    activity_day_in_week: {
        name: i18n.t("parameters:mailTemplates.mergeTags.activityInstance.dayInWeek.name"),
        value: "{{activity.day_in_week}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.activityInstance.dayInWeek.sample"),
    },

    activity_start_date: {
        name: i18n.t("parameters:mailTemplates.mergeTags.activityInstance.startDate.name"),
        value: "{{activity_instance.start_date}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.activityInstance.startDate.sample"),
    },

    activity_start_hour: {
        name: i18n.t("parameters:mailTemplates.mergeTags.activityInstance.startHour.name"),
        value: "{{activity_instance.activity_start}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.activityInstance.startHour.sample"),
    },

    activity_end: {
        name: i18n.t("parameters:mailTemplates.mergeTags.activityInstance.end.name"),
        value: "{{activity_instance.activity_end}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.activityInstance.end.sample"),
    },

    activity_teacher_first_name: {
        name: i18n.t("parameters:mailTemplates.mergeTags.activityInstance.teacherFirstName.name"),
        value: "{{activity_instance.teacher_first_name}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.activityInstance.teacherFirstName.sample"),
    },

    activity_teacher_last_name: {
        name: i18n.t("parameters:mailTemplates.mergeTags.activityInstance.teacherLastName.name"),
        value: "{{activity_instance.teacher_last_name}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.activityInstance.teacherLastName.sample"),
    },
});

export let ACTIVITY_INSTANCE_TAGS = _loadActivityInstanceTags();

const _loadPaymentTags = () => ({
    // payment_schedule_id: {
    //     name: "payment_schedule_id",
    //     value: "{{payments.payment_schedule_id}}",
    //     sample: "payment_schedule_id"
    // },

    season_label: {
        name: i18n.t("parameters:mailTemplates.mergeTags.payment.seasonLabel.name"),
        value: "{{payments.season_of_payment}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.payment.seasonLabel.sample"),
    },

    previsional_date: {
        name: i18n.t("parameters:mailTemplates.mergeTags.payment.previsionalDate.name"),
        value: "{{payment.previsional_date}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.payment.previsionalDate.sample"),
    },

    amount: {
        name: i18n.t("parameters:mailTemplates.mergeTags.payment.amount.name"),
        value: "{{payment.amount}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.payment.amount.sample"),
    },

    status: {
        name: i18n.t("parameters:mailTemplates.mergeTags.payment.status.name"),
        value: "{{payment.status}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.payment.status.sample"),
    },

    paymentsLoop: {
        name: i18n.t("parameters:mailTemplates.mergeTags.payment.paymentsLoop.name"),
        rules: {
            repeat: {
                name: i18n.t("parameters:mailTemplates.mergeTags.payment.paymentsLoop.repeatRuleName"),
                before: "{% for payment in due_payments %}",
                after: "{% endfor %}",
            },
        },
    },
});

export let PAYMENT_TAGS = _loadPaymentTags();

const _loadReglementsTags = () => ({
    //
    // reglement_id: {
    //     name: "reglement_id",
    //     value: "{{reglements.reglement_id}}",
    //     sample: "reglement_id"
    // },
    //
    // reglement_payable_id: {
    //     name: "reglement_payable_id",
    //     value: "{{reglements.reglement_payable_id}}",
    //     sample: "reglement_payable_id"
    // },

    reglement_reception_date: {
        name: i18n.t("parameters:mailTemplates.mergeTags.reglements.receptionDate.name"),
        value: "{{reglements.reglement_reception_date}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.reglements.receptionDate.sample"),
    },

    reglement_cashing_date: {
        name: i18n.t("parameters:mailTemplates.mergeTags.reglements.cashingDate.name"),
        value: "{{reglement.['cashing_date']}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.reglements.cashingDate.sample"),
    },

    reglement_amount: {
        name: i18n.t("parameters:mailTemplates.mergeTags.reglements.amount.name"),
        value: "{{reglement['amount']}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.reglements.amount.sample"),
    },

    reglement_status: {
        name: i18n.t("parameters:mailTemplates.mergeTags.reglements.status.name"),
        value: "{{reglement['status']}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.reglements.status.sample"),
    },

    reglementsLoop: {
        name: i18n.t("parameters:mailTemplates.mergeTags.reglements.reglementsLoop.name"),
        rules: {
            repeat: {
                name: i18n.t("parameters:mailTemplates.mergeTags.reglements.reglementsLoop.repeatRuleName"),
                before: "{% for reglement in reglements %}",
                after: "{% endfor %}",
            },
        },
    },
});

export let REGLEMENTS_TAGS = _loadReglementsTags();

const _loadUtilsTags = () => ({
    button_school_link: {
        name: i18n.t("parameters:mailTemplates.mergeTags.utils.buttonSchoolLink.name"),
        value: "{{school_link}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.utils.buttonSchoolLink.sample"),
    },
});

export let UTILS_TAGS = _loadUtilsTags();

const _loadSchoolLogoTags = () => ({
    img_school_logo: {
        name: i18n.t("parameters:mailTemplates.mergeTags.schoolLogo.imgSchoolLogo.name"),
        value: "{{school_logo}}",
        sample: i18n.t("parameters:mailTemplates.mergeTags.schoolLogo.imgSchoolLogo.sample"),
    },
});

export let SCHOOL_LOGO_TAGS = _loadSchoolLogoTags();

i18n.on("languageChanged", () => {
    APPLICATION_TAGS = _loadApplicationTags();
    ACTIVITY_TAGS = _loadActivityTags();
    ACTIVITY_INSTANCE_TAGS = _loadActivityInstanceTags();
    PAYMENT_TAGS = _loadPaymentTags();
    REGLEMENTS_TAGS = _loadReglementsTags();
    UTILS_TAGS = _loadUtilsTags();
    SCHOOL_LOGO_TAGS = _loadSchoolLogoTags();
});
