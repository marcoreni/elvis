// Regression tests for three helpers that lost their original behaviour in the TS conversion
// (see docs/KnownIssues.md and the code review that found them):
//
//  - reactOptionCreator/reactOptionMapper lost their `= {}` default parameter, so calling
//    reactOptionMapper() with no argument crashed on destructuring `undefined`.
//  - findAndGet switched from lodash's `_.find` to `Array.prototype.find`, dropping lodash's
//    object/string-predicate shorthand and its tolerance of a non-array first argument.
//  - hasKeys was inverted (true/false swapped) *and* switched from key-presence to
//    value-truthiness, and threw when the target object was undefined.
//
// This is the highest-value test in this pass: it pins the exact fixed behaviour for all three
// helpers as it's used by real call sites (planning/SelectActivity, planning/ActivityDetailsModal,
// tools/mutators, personalInfos/LevelInfos).

import { describe, expect, test } from "vitest";
import { reactOptionMapper, findAndGet, hasKeys } from "./index";

describe("reactOptionMapper / reactOptionCreator", () => {
    test("reactOptionMapper() with no argument does not throw and uses id/label defaults", () => {
        const mapper = reactOptionMapper();
        const option = mapper({ id: 3, label: "Piano" }, 0, []);
        expect(option).toEqual({ value: "3", label: "Piano" });
    });

    test("reactOptionMapper(options) still honours custom accessors", () => {
        const mapper = reactOptionMapper<{ id: number; code: string }>({
            id: (d) => d.code,
        });
        const option = mapper({ id: 1, code: "abc" }, 0, []);
        expect(option.value).toBe("abc");
    });
});

describe("findAndGet", () => {
    const rooms = [
        { id: 1, label: "Salle A" },
        { id: 2, label: "Salle B" },
    ];

    test("supports a predicate function, matching the .find style", () => {
        expect(findAndGet(rooms, (r) => r.id === 2, "label", "??")).toBe(
            "Salle B"
        );
    });

    test("supports lodash's object-predicate shorthand (ActivityDetailsModal call site)", () => {
        expect(findAndGet(rooms, { id: 2 }, "label", "??")).toBe("Salle B");
    });

    test("falls back to the default when the object predicate matches nothing", () => {
        expect(findAndGet(rooms, { id: 999 }, "label", "??")).toBe("??");
    });

    test("supports lodash's string-predicate shorthand", () => {
        const flagged = [
            { id: 1, active: false },
            { id: 2, active: true },
        ];
        expect(findAndGet(flagged, "active", "id")).toBe(2);
    });

    test("tolerates a plain object as the collection, not just an array (mutators.js call site)", () => {
        const values = {
            family: { id: 42, family: true },
            other: { id: 7, family: false },
        };
        expect(() => findAndGet(values, "family", "id")).not.toThrow();
        expect(findAndGet(values, "family", "id")).toBe(42);
    });

    test("returns the default and does not throw when the collection is undefined", () => {
        expect(() =>
            findAndGet(undefined, (r: any) => r.id === 1, "label", "fallback")
        ).not.toThrow();
        expect(
            findAndGet(undefined, (r: any) => r.id === 1, "label", "fallback")
        ).toBe("fallback");
    });
});

describe("hasKeys", () => {
    test("true when all keys are present as own keys, even with falsy values", () => {
        expect(
            hasKeys({ a: 0, b: "", c: false, d: null }, ["a", "b", "c", "d"])
        ).toBe(true);
    });

    test("false when at least one key is missing", () => {
        expect(hasKeys({ a: 1, b: 2 }, ["a", "b", "c"])).toBe(false);
    });

    test("false (not a throw) when the object itself is undefined", () => {
        expect(() => hasKeys(undefined, ["a"])).not.toThrow();
        expect(hasKeys(undefined, ["a"])).toBe(false);
    });

    test("false (not a throw) when the object itself is null", () => {
        expect(hasKeys(null, ["a"])).toBe(false);
    });
});
