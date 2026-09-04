// Unit test for constants-i18n lot 1 (branch feature/i18n-constants-lot1-dates): WEEKDAYS /
// MONTHS moved out of the hardcoded French arrays into the `common` i18n namespace. They are now
// `export let` live bindings that an `i18n.on("languageChanged", ...)` handler re-reads, so
// day/month names follow the active UI language for every `import { WEEKDAYS }` consumer.
//
// ES live-binding gotcha: an aliased capture (`const w = WEEKDAYS`) freezes at its value at that
// point; the binding itself (namespace access or the named import) must be read FRESH after each
// changeLanguage. Every assertion below re-reads `constants.WEEKDAYS` / `WEEKDAYS` in place.

import i18n from "../i18n";
import * as constants from "./constants";
import { WEEKDAYS, MONTHS } from "./constants";

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
