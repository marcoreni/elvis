// Unit test for the constants-i18n follow-up on advancedSearch/utils.js (docs/KnownIssues.md
// "Constant-module label dictionaries NOT extracted in P5"):
//
// - PAYMENT_SCHEDULE_OPTIONS_PAYMENTS_NUMBERS: `nb` is data (compared against
//   `payments_number` in PaymentScheduleOptionForm.jsx) and stays unchanged across a locale
//   switch; only `label` is display text, now localized via
//   `payments:terms.optionForm.paymentsNumbers.*` with the same `export let` + `languageChanged`
//   live-binding pattern used elsewhere (tools/constants.ts, utils/StopReasons.ts).
// - getQueryBuilderLangCode(): jQuery-QueryBuilder has its own `regional`/`lang_code` mechanism,
//   separate from react-i18next. It is read once at widget construction time (AdvancedSearch.jsx's
//   componentDidMount), not kept live across a locale switch, matching this app's existing
//   frozen-at-construct-time precedent for one-shot widget initializations.

import i18n from "../../i18n";
import * as utils from "./utils";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("PAYMENT_SCHEDULE_OPTIONS_PAYMENTS_NUMBERS follows the active UI language, nb unchanged", () => {
    test("default language (fr) exposes the French labels", async () => {
        await i18n.changeLanguage("fr");

        expect(utils.PAYMENT_SCHEDULE_OPTIONS_PAYMENTS_NUMBERS).toEqual([
            { nb: 1, label: "Annuel (1)" },
            { nb: 2, label: "Semestriel (2)" },
            { nb: 3, label: "Trimestriel (3)" },
            { nb: 9, label: "Mensuel (9)" },
        ]);
    });

    test("after changeLanguage('en') labels are re-read as English, nb unchanged", async () => {
        await i18n.changeLanguage("en");

        expect(utils.PAYMENT_SCHEDULE_OPTIONS_PAYMENTS_NUMBERS).toEqual([
            { nb: 1, label: "Annual (1)" },
            { nb: 2, label: "Biannual (2)" },
            { nb: 3, label: "Quarterly (3)" },
            { nb: 9, label: "Monthly (9)" },
        ]);
    });

    test("switching back to fr restores the French labels", async () => {
        await i18n.changeLanguage("en");
        await i18n.changeLanguage("fr");

        expect(
            utils.PAYMENT_SCHEDULE_OPTIONS_PAYMENTS_NUMBERS.find(
                (o) => o.nb === 9
            ).label
        ).toBe("Mensuel (9)");
    });

    test("nb values (compared against payments_number) never change across a locale switch", async () => {
        await i18n.changeLanguage("fr");
        const nbsFr = utils.PAYMENT_SCHEDULE_OPTIONS_PAYMENTS_NUMBERS.map(
            (o) => o.nb
        );

        await i18n.changeLanguage("en");
        expect(
            utils.PAYMENT_SCHEDULE_OPTIONS_PAYMENTS_NUMBERS.map((o) => o.nb)
        ).toEqual(nbsFr);
        expect(nbsFr).toEqual([1, 2, 3, 9]);
    });
});

describe("getQueryBuilderLangCode", () => {
    test("returns 'fr' by default / for the fr locale", async () => {
        await i18n.changeLanguage("fr");
        expect(utils.getQueryBuilderLangCode()).toBe("fr");
    });

    test("returns 'en' for the en locale", async () => {
        await i18n.changeLanguage("en");
        expect(utils.getQueryBuilderLangCode()).toBe("en");
    });
});
