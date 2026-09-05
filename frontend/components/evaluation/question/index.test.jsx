// Regression test for the undeclared-lodash-global fix (fix/undeclared-lodash-global): before that
// fix, `checkCondition` called `_.find(answers, ...)` with no `import _ from "lodash"` in this
// file, relying on a global `_` the webpack config never actually provides. Under jsdom (and in
// the real bundle) that threw `ReferenceError: _ is not defined` the moment a conditional question
// was evaluated. This is a pure function -- no component mount needed -- so the regression is
// exercised directly.

import { checkCondition } from "./index";

describe("checkCondition — _.find resolves the answer for the referenced question", () => {
    const questions = [{ id: 1, name: "q1" }];

    test("'=' condition: does not throw, and matches when the answer equals the expected value", () => {
        const answers = { 1: "yes" };

        expect(() => checkCondition("q1=yes", questions, answers)).not.toThrow();
        expect(checkCondition("q1=yes", questions, answers)).toBe(true);
    });

    test("'=' condition: false when the answer differs from the expected value", () => {
        const answers = { 1: "no" };

        expect(checkCondition("q1=yes", questions, answers)).toBe(false);
    });

    test("'!=' condition: false when the answer matches the excluded value", () => {
        const answers = { 1: "yes" };

        expect(() => checkCondition("q1!=yes", questions, answers)).not.toThrow();
        expect(checkCondition("q1!=yes", questions, answers)).toBe(false);
    });

    test("no answer recorded for the referenced question — _.find returns undefined, no throw", () => {
        const answers = {};

        expect(() => checkCondition("q1=yes", questions, answers)).not.toThrow();
        expect(checkCondition("q1=yes", questions, answers)).toBe(false);
    });
});
