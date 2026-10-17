// Coverage for the logic moved verbatim out of RichTextViewer.tsx (see that file's header
// comment and this module's own). RichTextViewer.test.tsx still covers these paths through the
// component; this file covers the module directly, plus `isDraftJsRaw`, which is new (additive,
// used by the Ruby bridge via wysiwygConversionCli.js).

import { describe, expect, test, vi, afterEach } from "vitest";
import {
    convertWysiwyg,
    tryParseDraftRaw,
    isDraftJsRaw,
    wysiwygToHtml,
    wysiwygToEditableHtml,
} from "./wysiwygConversion";

afterEach(() => {
    vi.restoreAllMocks();
});

const draftRawJson = JSON.stringify({
    blocks: [
        {
            key: "a",
            text: "Hello world",
            type: "unstyled",
            depth: 0,
            inlineStyleRanges: [{ offset: 0, length: 5, style: "BOLD" }],
            entityRanges: [],
            data: {},
        },
    ],
    entityMap: {},
});

const missingFieldDraftRawJson = JSON.stringify({
    blocks: [{ text: "x", type: "unstyled" }],
    entityMap: {},
});

const genuinelyMalformedDraftRawJson = JSON.stringify({
    blocks: [
        { text: "x", type: "unstyled", inlineStyleRanges: "not-an-array" },
    ],
    entityMap: {},
});

describe("tryParseDraftRaw / isDraftJsRaw", () => {
    test("recognizes Draft.js raw JSON (object with a blocks array)", () => {
        expect(tryParseDraftRaw(draftRawJson)).toEqual(
            JSON.parse(draftRawJson)
        );
        expect(isDraftJsRaw(draftRawJson)).toBe(true);
    });

    test("rejects already-HTML/plain-text content", () => {
        expect(tryParseDraftRaw("<p>hi</p>")).toBeNull();
        expect(isDraftJsRaw("<p>hi</p>")).toBe(false);
    });

    test("rejects degenerate JSON (a bare quoted string/number) that isn't Draft.js-shaped", () => {
        expect(tryParseDraftRaw('"just a string"')).toBeNull();
        expect(tryParseDraftRaw("42")).toBeNull();
    });

    test("isDraftJsRaw is false for null/undefined/empty", () => {
        expect(isDraftJsRaw(null)).toBe(false);
        expect(isDraftJsRaw(undefined)).toBe(false);
        expect(isDraftJsRaw("")).toBe(false);
    });
});

describe("convertWysiwyg", () => {
    test("converts well-formed Draft.js raw JSON to HTML", () => {
        const result = convertWysiwyg(draftRawJson);
        expect(result.failed).toBe(false);
        expect(result.html).toContain("<strong>Hello</strong> world");
    });

    test("falls back to draft-js's own convertFromRaw/convertToRaw normalization for a block missing inlineStyleRanges", () => {
        const result = convertWysiwyg(missingFieldDraftRawJson);
        expect(result.failed).toBe(false);
        expect(result.html).toContain("x");
    });

    test("reports genuine failure (failed: true, html: null) when normalization still throws, and warns", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const result = convertWysiwyg(genuinelyMalformedDraftRawJson);
        expect(result).toEqual({ html: null, failed: true });
        expect(warnSpy).toHaveBeenCalled();
    });

    test("passes already-HTML content through unchanged", () => {
        expect(convertWysiwyg("<p>Already HTML</p>")).toEqual({
            html: "<p>Already HTML</p>",
            failed: false,
        });
    });

    test("returns an empty string for null/undefined/empty input", () => {
        expect(convertWysiwyg(null)).toEqual({ html: "", failed: false });
        expect(convertWysiwyg(undefined)).toEqual({ html: "", failed: false });
        expect(convertWysiwyg("")).toEqual({ html: "", failed: false });
    });
});

describe("wysiwygToHtml", () => {
    test("degrades to the raw string on genuine double-conversion-failure", () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        expect(wysiwygToHtml(genuinelyMalformedDraftRawJson)).toBe(
            genuinelyMalformedDraftRawJson
        );
    });
});

describe("wysiwygToEditableHtml", () => {
    test("returns null (not the raw JSON string) on genuine double-conversion-failure", () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        expect(
            wysiwygToEditableHtml(genuinelyMalformedDraftRawJson)
        ).toBeNull();
    });

    test("returns converted HTML on success", () => {
        expect(wysiwygToEditableHtml(draftRawJson)).toContain(
            "<strong>Hello</strong> world"
        );
    });
});
