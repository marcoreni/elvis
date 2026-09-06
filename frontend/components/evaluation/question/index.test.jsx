import { checkCondition } from "./index";

describe("checkCondition — resolves the answer for the referenced question", () => {
    const questions = [{ id: 1, name: "q1" }];

    test("'=' condition: does not throw, and matches when the answer equals the expected value", () => {
        const answers = { 1: "yes" };

        expect(() =>
            checkCondition("q1=yes", questions, answers)
        ).not.toThrow();
        expect(checkCondition("q1=yes", questions, answers)).toBe(true);
    });

    test("'=' condition: false when the answer differs from the expected value", () => {
        const answers = { 1: "no" };

        expect(checkCondition("q1=yes", questions, answers)).toBe(false);
    });

    test("'!=' condition: false when the answer matches the excluded value", () => {
        const answers = { 1: "yes" };

        expect(() =>
            checkCondition("q1!=yes", questions, answers)
        ).not.toThrow();
        expect(checkCondition("q1!=yes", questions, answers)).toBe(false);
    });

    test("no answer recorded for the referenced question — no throw", () => {
        const answers = {};

        expect(() =>
            checkCondition("q1=yes", questions, answers)
        ).not.toThrow();
        expect(checkCondition("q1=yes", questions, answers)).toBe(false);
    });
});
