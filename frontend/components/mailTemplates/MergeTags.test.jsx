// Unit test for the constants-i18n follow-up extracting merge-tag `name`/`sample` display text
// (docs/KnownIssues.md "Constant-module label dictionaries NOT extracted in P5"). Per
// @unlayer/types' MergeTag interface, `name` is the display label shown in unlayer's merge-tag
// picker and `sample` is the preview/example text — neither is a lookup key, so both are safe to
// localize. `value` (the actual `{{...}}` Liquid placeholder substituted server-side), each
// dictionary's object keys (e.g. `first_name`, `applicationId` — the id unlayer indexes tags by),
// and each loop tag's `rules.repeat.before`/`after` (literal Liquid `{% for %}` syntax) are data
// and must stay unchanged across a locale switch.

import i18n from "../../i18n";
import * as MergeTags from "./MergeTags";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("APPLICATION_TAGS follows the active UI language, value/keys unchanged", () => {
    test("default language (fr) exposes French name/sample", async () => {
        await i18n.changeLanguage("fr");

        expect(MergeTags.APPLICATION_TAGS.first_name).toEqual({
            name: "Prénom de l'utilisateur",
            value: "{{first_name}}",
            sample: "Prénom",
        });
    });

    test("after changeLanguage('en') name/sample are re-read as English, value/keys unchanged", async () => {
        await i18n.changeLanguage("en");

        expect(Object.keys(MergeTags.APPLICATION_TAGS)).toEqual([
            "first_name",
            "last_name",
            "applicationId",
            "application_season_label",
            "application_total_all_due_payments",
            "application_total_pending_due_payments",
        ]);
        expect(MergeTags.APPLICATION_TAGS.first_name).toEqual({
            name: "User's first name",
            value: "{{first_name}}",
            sample: "First name",
        });
        expect(MergeTags.APPLICATION_TAGS.applicationId.value).toBe(
            "{{application.id}}"
        );
    });

    test("switching back to fr restores French name/sample", async () => {
        await i18n.changeLanguage("en");
        await i18n.changeLanguage("fr");

        expect(MergeTags.APPLICATION_TAGS.last_name).toEqual({
            name: "Nom de l'utilisateur",
            value: "{{last_name}}",
            sample: "Nom",
        });
    });
});

describe("PAYMENT_TAGS loop tag: name/rules.repeat.name localized, before/after Liquid syntax unchanged", () => {
    test("fr", async () => {
        await i18n.changeLanguage("fr");

        expect(MergeTags.PAYMENT_TAGS.paymentsLoop).toEqual({
            name: "Paiements",
            rules: {
                repeat: {
                    name: "Répeter pour chaque paiement",
                    before: "{% for payment in due_payments %}",
                    after: "{% endfor %}",
                },
            },
        });
    });

    test("en: name/rules.repeat.name translated, before/after untouched", async () => {
        await i18n.changeLanguage("en");

        expect(MergeTags.PAYMENT_TAGS.paymentsLoop).toEqual({
            name: "Payments",
            rules: {
                repeat: {
                    name: "Repeat for each payment",
                    before: "{% for payment in due_payments %}",
                    after: "{% endfor %}",
                },
            },
        });
    });
});

describe("REGLEMENTS_TAGS loop tag and value placeholders", () => {
    test("value placeholders (including bracket-index Liquid syntax) never change across locale", async () => {
        await i18n.changeLanguage("fr");
        const valuesFr = Object.fromEntries(
            Object.entries(MergeTags.REGLEMENTS_TAGS).map(([k, v]) => [
                k,
                v.value,
            ])
        );

        await i18n.changeLanguage("en");
        const valuesEn = Object.fromEntries(
            Object.entries(MergeTags.REGLEMENTS_TAGS).map(([k, v]) => [
                k,
                v.value,
            ])
        );

        expect(valuesEn).toEqual(valuesFr);
        expect(MergeTags.REGLEMENTS_TAGS.reglement_cashing_date.value).toBe(
            "{{reglement.['cashing_date']}}"
        );
        expect(
            MergeTags.REGLEMENTS_TAGS.reglementsLoop.rules.repeat.before
        ).toBe("{% for reglement in reglements %}");
    });

    test("reglementsLoop name/repeat rule name localized", async () => {
        await i18n.changeLanguage("en");
        expect(MergeTags.REGLEMENTS_TAGS.reglementsLoop.name).toBe(
            "Settlements"
        );
        expect(MergeTags.REGLEMENTS_TAGS.reglementsLoop.rules.repeat.name).toBe(
            "Repeat for each settlement"
        );

        await i18n.changeLanguage("fr");
        expect(MergeTags.REGLEMENTS_TAGS.reglementsLoop.name).toBe(
            "Règlements"
        );
        expect(MergeTags.REGLEMENTS_TAGS.reglementsLoop.rules.repeat.name).toBe(
            "Répeter pour chaque règlement"
        );
    });
});

describe("ACTIVITY_TAGS vs ACTIVITY_INSTANCE_TAGS: distinct wording for the same tag key", () => {
    test("activity_start_date differs between the activity and activity-instance dictionaries", async () => {
        await i18n.changeLanguage("fr");

        expect(MergeTags.ACTIVITY_TAGS.activity_start_date.name).toBe(
            "Date de début de l'activité"
        );
        expect(MergeTags.ACTIVITY_INSTANCE_TAGS.activity_start_date.name).toBe(
            "Date de début de la séance"
        );
        // value placeholders must remain distinct (activity vs activity_instance object)
        expect(MergeTags.ACTIVITY_TAGS.activity_start_date.value).toBe(
            "{{activity.startDate}}"
        );
        expect(MergeTags.ACTIVITY_INSTANCE_TAGS.activity_start_date.value).toBe(
            "{{activity_instance.start_date}}"
        );
    });
});

describe("UTILS_TAGS / SCHOOL_LOGO_TAGS follow the active UI language", () => {
    test("fr / en", async () => {
        await i18n.changeLanguage("fr");
        expect(MergeTags.UTILS_TAGS.button_school_link.name).toBe(
            "Bouton vers le site de l'école"
        );
        expect(MergeTags.SCHOOL_LOGO_TAGS.img_school_logo.name).toBe(
            "Logo de l'école"
        );

        await i18n.changeLanguage("en");
        expect(MergeTags.UTILS_TAGS.button_school_link.name).toBe(
            "Button to the school's website"
        );
        expect(MergeTags.SCHOOL_LOGO_TAGS.img_school_logo.name).toBe(
            "School logo"
        );
    });
});
