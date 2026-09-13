import { createTargetOptions } from "./select_question";

describe("createTargetOptions", () => {
    test("maps a real, present collection to options", () => {
        const referenceData = {
            seasons: [
                { id: 1, label: "2025-2026" },
                { id: 2, label: "2026-2027" },
            ],
        };

        const options = createTargetOptions("seasons", referenceData);

        expect(options).toEqual([
            { value: "1", label: "2025-2026" },
            { value: "2", label: "2026-2027" },
        ]);
    });

    test("falls back gracefully when referenceData is missing the collection for a valid target", () => {
        const referenceData = {};

        const options = createTargetOptions("seasons", referenceData);

        expect(options).toEqual([{ label: "TARGET seasons NOT SUPPORTED" }]);
    });

    test("falls back gracefully for an EntityName with no registered target (e.g. activity_refs)", () => {
        const referenceData = { activity_refs: [{ id: 1, label: "Guitare" }] };

        expect(() =>
            createTargetOptions("activity_refs", referenceData)
        ).not.toThrow();
        expect(createTargetOptions("activity_refs", referenceData)).toEqual([
            { label: "TARGET activity_refs NOT SUPPORTED" },
        ]);
    });
});
