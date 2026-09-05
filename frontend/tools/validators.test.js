// Focused coverage for `ordCheck` in tools/validators.js.
//
// `ordCheck(bound, ord)` returns `a => message | ""`. The bug fixed in this batch
// (docs/KnownIssues.md) was that the two locale values common:messages.errOrdLt /
// errOrdLte were swapped, so the strict ("<") branch rendered "or equal" wording and
// vice-versa. constants.test.js pins the wording of the two keys in isolation; the point
// of the block below is to lock the wording to the comparison branch that actually
// renders it:
//   case "lt"  fails on `a >= b` (equality is a failure -> requires strictly less) -> errOrdLt
//   case "lte" fails on `a > b`  (equality is allowed)                              -> errOrdLte
// so errOrdLt MUST be the strict phrasing and errOrdLte the "or equal" phrasing.

import i18n from "../i18n";
import { ordCheck } from "./validators";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("ordCheck wires each locale message to the right comparison branch", () => {
    describe.each([
        [
            "fr",
            {
                lt: "La valeur doit être inférieure à 10",
                lte: "La valeur doit être inférieure ou égale à 10",
                gt: "La valeur doit être supérieure à 10",
                gte: "La valeur doit être supérieure ou égale à 10",
            },
        ],
        [
            "en",
            {
                lt: "The value must be less than 10",
                lte: "The value must be less than or equal to 10",
                gt: "The value must be greater than 10",
                gte: "The value must be greater than or equal to 10",
            },
        ],
    ])("%s", (lng, expected) => {
        beforeEach(async () => {
            await i18n.changeLanguage(lng);
        });

        test('"lt" fails on equality and renders the strict (non "or equal") message', () => {
            expect(ordCheck(10, "lt")(10)).toBe(expected.lt);
            expect(ordCheck(10, "lt")(10)).not.toMatch(/or equal|ou égale/);
        });

        test('"lt" passes (empty string) when strictly less', () => {
            expect(ordCheck(10, "lt")(9)).toBe("");
        });

        test('"lte" allows equality and renders the "or equal" message only when exceeded', () => {
            expect(ordCheck(10, "lte")(10)).toBe("");
            expect(ordCheck(10, "lte")(11)).toBe(expected.lte);
            expect(ordCheck(10, "lte")(11)).toMatch(/or equal|ou égale/);
        });

        test('"gt" fails on equality and renders the strict (non "or equal") message', () => {
            expect(ordCheck(10, "gt")(10)).toBe(expected.gt);
            expect(ordCheck(10, "gt")(10)).not.toMatch(/or equal|ou égale/);
        });

        test('"gte" allows equality and renders the "or equal" message only when below', () => {
            expect(ordCheck(10, "gte")(10)).toBe("");
            expect(ordCheck(10, "gte")(9)).toBe(expected.gte);
            expect(ordCheck(10, "gte")(9)).toMatch(/or equal|ou égale/);
        });

        test("formatB is applied to the bound before interpolation", () => {
            expect(ordCheck(10, "lt", x => x * 2)(10)).toBe(expected.lt.replace("10", "20"));
        });
    });
});
