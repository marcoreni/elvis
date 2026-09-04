// Unit test for constants-i18n lot 1 (branch feature/i18n-constants-lot1-dates): WEEKDAYS /
// MONTHS moved out of the hardcoded French arrays into the `common` i18n namespace. They are now
// `export let` live bindings that an `i18n.on("languageChanged", ...)` handler re-reads, so
// day/month names follow the active UI language for every `import { WEEKDAYS }` consumer.
//
// ES live-binding gotcha: an aliased capture (`const w = WEEKDAYS`) freezes at its value at that
// point; the binding itself (namespace access or the named import) must be read FRESH after each
// changeLanguage. Every assertion below re-reads `constants.WEEKDAYS` / `WEEKDAYS` in place.
//
// constants-i18n lot 2 (branch feature/i18n-constants-lot2-messages) extends this same pattern to
// MESSAGES / API_ERRORS_MESSAGES: `MESSAGES.err_required` etc. are plain-string live bindings,
// while 7 entries (err_min_length, err_exact_length, err_starts_with, and the 4 err_ord_*) are
// functions that take an interpolation value and return the localized string immediately,
// bypassing the object-lookup pattern. Same aliased-capture gotcha applies: read `MESSAGES.xxx`
// (or the object returned by a fresh `constants.MESSAGES`) after each changeLanguage, never a
// `const` destructured before the switch.
//
// constants-i18n lot 3 (branch feature/i18n-constants-lot3-labels) closes out the pass with
// KINDS_LABEL / PRE_APPLICATION_ACTION_LABELS (same `export let` + `languageChanged` pattern —
// same aliased-capture gotcha) and RECURRENCE_TYPES.toString (an `export const`; `toString` is a
// method that reads `i18n.t()` fresh on every call, so there is no live binding to go stale — the
// tests below call it before *and* after a `changeLanguage` to confirm that directly).

import i18n from "../i18n";
import * as constants from "./constants";
import { WEEKDAYS, MONTHS, INTERVAL_KINDS, RECURRENCE_TYPES } from "./constants";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("WEEKDAYS / MONTHS follow the active UI language", () => {
    test("default language (fr) exposes the French day/month names", async () => {
        await i18n.changeLanguage("fr");

        expect(constants.WEEKDAYS).toEqual([
            "Dimanche",
            "Lundi",
            "Mardi",
            "Mercredi",
            "Jeudi",
            "Vendredi",
            "Samedi",
        ]);
        expect(constants.MONTHS).toHaveLength(12);
        expect(constants.MONTHS[0]).toBe("Janvier");
        expect(constants.MONTHS[5]).toBe("Juin");
        expect(constants.MONTHS[11]).toBe("Décembre");
    });

    test("after changeLanguage('en') both arrays are re-read as English", async () => {
        await i18n.changeLanguage("en");

        expect(constants.WEEKDAYS).toEqual([
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ]);
        expect(constants.MONTHS).toHaveLength(12);
        expect(constants.MONTHS[0]).toBe("January");
        expect(constants.MONTHS[5]).toBe("June");
        expect(constants.MONTHS[11]).toBe("December");
    });

    test("an aliased capture freezes at its value — the gotcha the header warns about", async () => {
        await i18n.changeLanguage("fr");
        const aliased = WEEKDAYS; // captures the array reference at fr

        await i18n.changeLanguage("en");
        expect(aliased[1]).toBe("Lundi"); // stale — alias did not follow the switch
        expect(WEEKDAYS[1]).toBe("Monday"); // the binding itself did
    });

    test("switching back to fr restores the French names", async () => {
        await i18n.changeLanguage("en");
        expect(constants.WEEKDAYS[1]).toBe("Monday");
        expect(constants.MONTHS[5]).toBe("June");

        await i18n.changeLanguage("fr");
        expect(constants.WEEKDAYS[1]).toBe("Lundi");
        expect(constants.MONTHS[5]).toBe("Juin");
    });

    test("the live binding updates for a named import, not only the namespace object", async () => {
        // `WEEKDAYS` / `MONTHS` here come from `import { WEEKDAYS, MONTHS }`. Reading the binding
        // itself (not a `const` alias of it) must reflect the languageChanged re-read.
        await i18n.changeLanguage("en");
        expect(WEEKDAYS[1]).toBe("Monday");
        expect(MONTHS[5]).toBe("June");

        await i18n.changeLanguage("fr");
        expect(WEEKDAYS[1]).toBe("Lundi");
        expect(MONTHS[5]).toBe("Juin");
    });
});

describe("MESSAGES follows the active UI language", () => {
    test("after changeLanguage('fr') exposes the French plain-string messages", async () => {
        await i18n.changeLanguage("fr");

        expect(constants.MESSAGES.err_required).toBe("Cette information est requise.");
        expect(constants.MESSAGES.err_must_choose_activity).toBe(
            "Veuillez choisir une activité avant de continuer."
        );
    });

    test("after changeLanguage('en') plain-string messages are re-read as English", async () => {
        await i18n.changeLanguage("en");

        expect(constants.MESSAGES.err_required).toBe("This information is required.");
        expect(constants.MESSAGES.err_must_choose_activity).toBe(
            "Please choose an activity before continuing."
        );
    });

    test("switching back to fr restores the French plain-string messages", async () => {
        await i18n.changeLanguage("en");
        expect(constants.MESSAGES.err_required).toBe("This information is required.");

        await i18n.changeLanguage("fr");
        expect(constants.MESSAGES.err_required).toBe("Cette information est requise.");
    });

    test("an aliased capture of a plain-string message freezes at its value", async () => {
        await i18n.changeLanguage("fr");
        const aliased = constants.MESSAGES.err_required;

        await i18n.changeLanguage("en");
        expect(aliased).toBe("Cette information est requise."); // stale
        expect(constants.MESSAGES.err_required).toBe("This information is required."); // live
    });

    test("function-valued messages interpolate their argument in French", async () => {
        await i18n.changeLanguage("fr");

        expect(constants.MESSAGES.err_min_length(5)).toBe(
            "Ce champ doit comporter au minimum 5 caractères"
        );
        expect(constants.MESSAGES.err_ord_gte(10)).toBe(
            "La valeur doit être supérieure ou égale à 10"
        );
    });

    test("function-valued messages interpolate their argument in English", async () => {
        await i18n.changeLanguage("en");

        expect(constants.MESSAGES.err_min_length(5)).toBe(
            "This field must be at least 5 characters long"
        );
        expect(constants.MESSAGES.err_ord_gte(10)).toBe(
            "The value must be greater than or equal to 10"
        );
    });

    // Pinning the pre-existing err_ord_lte / err_ord_lt swap bug (docs/KnownIssues.md): by name
    // err_ord_lte should be the "or equal" variant and err_ord_lt the strict one, but the message
    // bodies are swapped relative to their key names. Preserved verbatim from the pre-i18n French
    // strings — do NOT "fix" this while touching the messages; a deliberate fix should show up as
    // an intentional change to this test, not a silent regression.
    test.each(["fr", "en"])(
        "err_ord_lte / err_ord_lt swap-bug is preserved as-is (%s)",
        async lng => {
            await i18n.changeLanguage(lng);

            expect(constants.MESSAGES.err_ord_lt(10)).toMatch(/or equal|ou égale/);
            expect(constants.MESSAGES.err_ord_lte(10)).not.toMatch(/or equal|ou égale/);
        }
    );
});

describe("API_ERRORS_MESSAGES follows the active UI language", () => {
    test("after changeLanguage('fr') exposes French server-error text", async () => {
        await i18n.changeLanguage("fr");

        expect(constants.API_ERRORS_MESSAGES.default).toBe(
            "Une erreur s'est produite lors de la récupération des données"
        );
        expect(constants.API_ERRORS_MESSAGES.err_group_name_empty).toBe(
            "Le nom du groupe ne peut être vide."
        );
    });

    test("after changeLanguage('en') server-error text is re-read as English", async () => {
        await i18n.changeLanguage("en");

        expect(constants.API_ERRORS_MESSAGES.default).toBe(
            "An error occurred while retrieving the data"
        );
        expect(constants.API_ERRORS_MESSAGES.err_group_name_empty).toBe(
            "The group name cannot be empty."
        );
    });

    test("switching back to fr restores French server-error text", async () => {
        await i18n.changeLanguage("en");
        expect(constants.API_ERRORS_MESSAGES.default).toBe(
            "An error occurred while retrieving the data"
        );

        await i18n.changeLanguage("fr");
        expect(constants.API_ERRORS_MESSAGES.default).toBe(
            "Une erreur s'est produite lors de la récupération des données"
        );
    });
});

describe("KINDS_LABEL follows the active UI language", () => {
    test("default language (fr) exposes the French kind labels", async () => {
        await i18n.changeLanguage("fr");

        expect(constants.KINDS_LABEL[INTERVAL_KINDS.AVAILABILITY]).toBe("Disponibilité");
        expect(constants.KINDS_LABEL[INTERVAL_KINDS.LESSON]).toBe("Cours");
        expect(constants.KINDS_LABEL[INTERVAL_KINDS.EVALUATION]).toBe("Évaluation");
        expect(constants.KINDS_LABEL[INTERVAL_KINDS.OPTION]).toBe("Option");
    });

    test("after changeLanguage('en') kind labels are re-read as English", async () => {
        await i18n.changeLanguage("en");

        expect(constants.KINDS_LABEL[INTERVAL_KINDS.AVAILABILITY]).toBe("Availability");
        expect(constants.KINDS_LABEL[INTERVAL_KINDS.LESSON]).toBe("Course");
        expect(constants.KINDS_LABEL[INTERVAL_KINDS.EVALUATION]).toBe("Evaluation");
        expect(constants.KINDS_LABEL[INTERVAL_KINDS.OPTION]).toBe("Option");
    });

    test("switching back to fr restores the French kind labels", async () => {
        await i18n.changeLanguage("en");
        expect(constants.KINDS_LABEL[INTERVAL_KINDS.LESSON]).toBe("Course");

        await i18n.changeLanguage("fr");
        expect(constants.KINDS_LABEL[INTERVAL_KINDS.LESSON]).toBe("Cours");
    });

    test("an aliased capture of KINDS_LABEL freezes at its value — the same gotcha as WEEKDAYS", async () => {
        await i18n.changeLanguage("fr");
        const aliased = constants.KINDS_LABEL;

        await i18n.changeLanguage("en");
        expect(aliased[INTERVAL_KINDS.LESSON]).toBe("Cours"); // stale
        expect(constants.KINDS_LABEL[INTERVAL_KINDS.LESSON]).toBe("Course"); // live
    });
});

describe("PRE_APPLICATION_ACTION_LABELS follows the active UI language", () => {
    test("default language (fr) exposes the French action labels", async () => {
        await i18n.changeLanguage("fr");

        expect(constants.PRE_APPLICATION_ACTION_LABELS.new).toBe("Nouvelle inscription");
        expect(constants.PRE_APPLICATION_ACTION_LABELS.renew).toBe("Renouvellement");
        expect(constants.PRE_APPLICATION_ACTION_LABELS.change).toBe("Changement");
        expect(constants.PRE_APPLICATION_ACTION_LABELS.stop).toBe("Arrêt");
        expect(constants.PRE_APPLICATION_ACTION_LABELS.pursue_childhood).toBe("Poursuite enfance");
        expect(constants.PRE_APPLICATION_ACTION_LABELS.cham).toBe("Inscription CHAM");
    });

    test("after changeLanguage('en') action labels are re-read as English", async () => {
        await i18n.changeLanguage("en");

        expect(constants.PRE_APPLICATION_ACTION_LABELS.new).toBe("New enrollment");
        expect(constants.PRE_APPLICATION_ACTION_LABELS.renew).toBe("Renewal");
        expect(constants.PRE_APPLICATION_ACTION_LABELS.change).toBe("Change");
        expect(constants.PRE_APPLICATION_ACTION_LABELS.stop).toBe("Stop");
        expect(constants.PRE_APPLICATION_ACTION_LABELS.pursue_childhood).toBe("Continuing from Kids");
        expect(constants.PRE_APPLICATION_ACTION_LABELS.cham).toBe("CHAM enrollment");
    });

    test("switching back to fr restores the French action labels", async () => {
        await i18n.changeLanguage("en");
        expect(constants.PRE_APPLICATION_ACTION_LABELS.new).toBe("New enrollment");

        await i18n.changeLanguage("fr");
        expect(constants.PRE_APPLICATION_ACTION_LABELS.new).toBe("Nouvelle inscription");
    });

    test("an aliased capture of PRE_APPLICATION_ACTION_LABELS freezes at its value", async () => {
        await i18n.changeLanguage("fr");
        const aliased = constants.PRE_APPLICATION_ACTION_LABELS;

        await i18n.changeLanguage("en");
        expect(aliased.new).toBe("Nouvelle inscription"); // stale
        expect(constants.PRE_APPLICATION_ACTION_LABELS.new).toBe("New enrollment"); // live
    });

    // The fallback bug fixed alongside this lot's extraction (ActivitiesApplicationsList.jsx
    // indexed with the numeric PRE_APPLICATION_ACTIONS.NEW enum value instead of the "new" string
    // key — always undefined) is covered directly against the real component in
    // ActivitiesApplicationsList.test.jsx; the exact-value assertions above already pin that
    // `.new` itself resolves correctly in both locales, so no separate regression test is needed
    // here.
});

describe("RECURRENCE_TYPES.toString follows the active UI language (no export let needed)", () => {
    test("RECURRENCE_TYPES is a plain export const, not a live binding reassigned on languageChanged", async () => {
        // Unlike WEEKDAYS/KINDS_LABEL/etc., there is no `constants.RECURRENCE_TYPES = ...`
        // reassignment anywhere — the object identity itself never changes across a locale switch.
        // (Reading both sides before any changeLanguage would make this pass trivially even if a
        // future regression reassigned the binding on "languageChanged" — the switch below is
        // what actually exercises that.)
        const ref = constants.RECURRENCE_TYPES;
        await i18n.changeLanguage("en");
        expect(constants.RECURRENCE_TYPES).toBe(ref);
    });

    test("default language (fr) resolves recurrence-type strings", async () => {
        await i18n.changeLanguage("fr");

        expect(RECURRENCE_TYPES.toString("daily")).toBe("Tous les jours");
        expect(RECURRENCE_TYPES.toString("weekly")).toBe("Toutes les semaines");
        expect(RECURRENCE_TYPES.toString("yearly")).toBe("Tous les ans");
    });

    test("after changeLanguage('en') the same calls resolve to English", async () => {
        await i18n.changeLanguage("en");

        expect(RECURRENCE_TYPES.toString("daily")).toBe("Every day");
        expect(RECURRENCE_TYPES.toString("weekly")).toBe("Every week");
        expect(RECURRENCE_TYPES.toString("yearly")).toBe("Every year");
    });

    // The specific claim in the branch description: toString reads i18n.t() fresh on every call,
    // so it is *never* stale across a changeLanguage — there is no cached/aliased value to freeze,
    // unlike WEEKDAYS/KINDS_LABEL/PRE_APPLICATION_ACTION_LABELS above.
    test("toString is never stale: calling it before and after changeLanguage both read live", async () => {
        await i18n.changeLanguage("fr");
        const before = RECURRENCE_TYPES.toString("weekly");
        expect(before).toBe("Toutes les semaines");

        await i18n.changeLanguage("en");
        const after = RECURRENCE_TYPES.toString("weekly");
        expect(after).toBe("Every week");
        // Re-calling with the very same enum value after switching back confirms every call is a
        // fresh i18n.t() read, not a memoized result from the first call.
        await i18n.changeLanguage("fr");
        expect(RECURRENCE_TYPES.toString("weekly")).toBe("Toutes les semaines");
        expect(before).not.toBe(after);
    });

    test("getDefault/getAll enum helpers are unaffected by locale (data, not UI text)", async () => {
        await i18n.changeLanguage("fr");
        expect(RECURRENCE_TYPES.getDefault()).toBe("weekly");
        const allFr = RECURRENCE_TYPES.getAll();

        await i18n.changeLanguage("en");
        expect(RECURRENCE_TYPES.getDefault()).toBe("weekly");
        expect(RECURRENCE_TYPES.getAll()).toEqual(allFr);
    });
});
