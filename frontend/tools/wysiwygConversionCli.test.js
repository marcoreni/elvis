// Contract coverage for wysiwygConversionCli.js, run exactly as the Rails rake task will: a bare
// `node` child process fed the raw value on stdin, parsing stdout as one JSON object. See that
// file's header comment for the full seam contract this pins.

import { describe, expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, "wysiwygConversionCli.js");

function runCli(input) {
    try {
        const stdout = execFileSync("node", [cliPath], {
            input,
            encoding: "utf8",
        });
        return { stdout, status: 0 };
    } catch (err) {
        return { stdout: err.stdout, status: err.status };
    }
}

describe("wysiwygConversionCli", () => {
    test("already-HTML input: isDraftJs false, html unchanged, exit 0", () => {
        const input = "<p>Already migrated <em>HTML</em> content.</p>";
        const { stdout, status } = runCli(input);

        expect(status).toBe(0);
        expect(JSON.parse(stdout)).toEqual({
            isDraftJs: false,
            html: input,
            failed: false,
        });
    });

    test("well-formed Draft.js raw JSON: isDraftJs true, converted html, exit 0", () => {
        const input = JSON.stringify({
            blocks: [
                {
                    key: "a",
                    text: "Hello world",
                    type: "unstyled",
                    depth: 0,
                    inlineStyleRanges: [],
                    entityRanges: [],
                    data: {},
                },
            ],
            entityMap: {},
        });
        const { stdout, status } = runCli(input);

        expect(status).toBe(0);
        const parsed = JSON.parse(stdout);
        expect(parsed.isDraftJs).toBe(true);
        expect(parsed.failed).toBe(false);
        expect(parsed.html).toContain("Hello world");
    });

    test("Draft.js-shaped but unrecoverably malformed: {isDraftJs: true, failed: true}, exit 0", () => {
        const input = JSON.stringify({
            blocks: [
                {
                    key: "b1",
                    text: "broken",
                    type: "unstyled",
                    depth: 0,
                    inlineStyleRanges: "not-an-array",
                    entityRanges: [],
                    data: {},
                },
            ],
            entityMap: {},
        });
        const { stdout, status } = runCli(input);

        expect(status).toBe(0);
        expect(JSON.parse(stdout)).toEqual({ isDraftJs: true, failed: true });
    });

    // Draft.js-shaped and recoverable: draftjs-to-html throws directly on a block missing
    // `inlineStyleRanges` (confirmed: "Cannot read properties of undefined (reading 'length')"),
    // but convertFromRaw/convertToRaw normalizes it (fills in `[]`) before a second attempt
    // succeeds -- see wysiwygConversion.js's convertWysiwyg fallback. The jsdom-based
    // wysiwygConversion.test.js covers this same input, but draft-js is a browser-oriented
    // library, so that proves nothing about this bare, DOM-less `node` child process, which is
    // where the rake task actually runs this fallback.
    test("Draft.js JSON recoverable only via the convertFromRaw/convertToRaw fallback: isDraftJs true, converted html, exit 0", () => {
        const input = JSON.stringify({
            blocks: [{ text: "x", type: "unstyled" }],
            entityMap: {},
        });
        const { stdout, status } = runCli(input);

        expect(status).toBe(0);
        const parsed = JSON.parse(stdout);
        expect(parsed.isDraftJs).toBe(true);
        expect(parsed.failed).toBe(false);
        expect(parsed.html).toContain("x");
    });

    // Regression test: a prior version of this CLI wrote stdout then immediately called
    // process.exit(0). When stdout is a pipe (exactly what Ruby's Open3.capture3 gives it,
    // and what execFileSync's `input` option also uses), that write is asynchronous -- so
    // process.exit() could terminate the process before the write flushed, silently truncating
    // output past the pipe buffer (observed: exactly 65536 bytes) while still exiting 0. A unit
    // test calling the module's functions directly can't catch this -- it only manifests when
    // stdout is an actual pipe and the payload is big enough to outrun a single flush.
    test("a converted payload larger than the pipe buffer (64KB) still round-trips to valid JSON, exit 0", () => {
        const bigText = "A".repeat(100000);
        const input = JSON.stringify({
            blocks: [
                {
                    key: "a1",
                    text: bigText,
                    type: "unstyled",
                    depth: 0,
                    inlineStyleRanges: [],
                    entityRanges: [],
                    data: {},
                },
            ],
            entityMap: {},
        });
        const { stdout, status } = runCli(input);

        expect(status).toBe(0);
        expect(stdout.length).toBeGreaterThan(65536);
        const parsed = JSON.parse(stdout);
        expect(parsed.isDraftJs).toBe(true);
        expect(parsed.failed).toBe(false);
        expect(parsed.html).toContain(bigText);
    });
});
