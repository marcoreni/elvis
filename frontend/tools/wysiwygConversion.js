// Deliberate deviation from this repo's "new files are TypeScript + functional" default: this
// module must be loadable both (a) by Rspack/Vitest via an ESM `import` from .tsx/.jsx, and
// (b) by a bare `node` process with no build step (see frontend/tools/wysiwygConversionCli.js,
// invoked directly by a Rails rake task). CommonJS + JSDoc types satisfies both with zero new
// dependencies: `tsconfig.json` has `allowJs: true` + `esModuleInterop: true` so a .tsx file can
// `import` this, and bare `node` can `require()` it since package.json has no "type": "module".
// Do not convert this to ESM/.ts -- that would break requirement (b).
//
// This logic was moved verbatim out of RichTextViewer.tsx (Phase 4b/4c) -- behavior must not
// change. See RichTextViewer.tsx for the component that still owns sanitization.

const draftToHtml = require("draftjs-to-html");
const { convertFromRaw, convertToRaw } = require("draft-js");

/**
 * Convert a `Parameter`-row string to HTML, handling the Draft.js-JSON / plain-HTML transition:
 * if `wysiwygStrData` parses as Draft.js raw JSON, it is converted to HTML via
 * `draftjs-to-html`; otherwise it is treated as already being HTML (or plain text, which is
 * valid HTML too) and returned as-is.
 * @param {string | null | undefined} wysiwygStrData
 * @returns {{ html: string, failed: false } | { html: null, failed: true }}
 */
function convertWysiwyg(wysiwygStrData) {
    if (!wysiwygStrData) {
        return { html: "", failed: false };
    }

    const draftRaw = tryParseDraftRaw(wysiwygStrData);
    if (draftRaw) {
        try {
            return { html: draftToHtml(draftRaw), failed: false };
        } catch (e) {
            // Well-formed Draft.js JSON shape (has a `blocks` array) but
            // missing/malformed enough internally (e.g. a block missing
            // `inlineStyleRanges`) to make draftjs-to-html throw directly.
            // The old WysiwygViewer never hit this: it always ran raw JSON
            // through draft-js's own convertFromRaw/convertToRaw first,
            // which normalizes missing fields (e.g. fills in `[]` for a
            // missing inlineStyleRanges) -- do the same before giving up.
            try {
                return {
                    html: draftToHtml(convertToRaw(convertFromRaw(draftRaw))),
                    failed: false,
                };
            } catch (e2) {
                // Both draft-js's own normalization and draftjs-to-html
                // still failed -- genuinely malformed content, not just a
                // missing-field shape draft-js tolerates. Unlike
                // tryParseDraftRaw's catch below (expected control flow for
                // "this isn't Draft.js JSON at all"), reaching this is
                // unexpected, so it's worth a log rather than failing
                // silently.
                // eslint-disable-next-line no-console
                console.warn(
                    "wysiwygConversion: failed to render Draft.js content, even after normalizing via convertFromRaw/convertToRaw",
                    e2
                );
                return { html: null, failed: true };
            }
        }
    }

    // Not Draft.js JSON: already HTML (or plain text, which is valid HTML too).
    return { html: wysiwygStrData, failed: false };
}

// Draft.js's own raw-content shape is `{ blocks: [...], entityMap: {...} }`.
// Checking for it (rather than just "did JSON.parse succeed") matters
// because plain HTML can itself be valid JSON input to JSON.parse in
// degenerate cases (e.g. a bare quoted string or number), which would
// otherwise be misdetected as Draft.js content.
/**
 * @param {string} value
 * @returns {{ blocks: unknown[] } | null}
 */
function tryParseDraftRaw(value) {
    try {
        const parsed = JSON.parse(value);
        if (
            parsed &&
            typeof parsed === "object" &&
            Array.isArray(parsed.blocks)
        ) {
            return parsed;
        }
        return null;
    } catch (e) {
        return null;
    }
}

/**
 * Detector wrapping `tryParseDraftRaw`: does `value` parse as Draft.js raw-content JSON? Additive
 * -- does not affect `convertWysiwyg`'s own behavior. Used by the Ruby bridge (via the CLI) to
 * distinguish "not Draft.js JSON, skip" from "was Draft.js JSON, html below is the conversion"
 * without re-implementing the detection logic on the Ruby side.
 * @param {string | null | undefined} value
 * @returns {boolean}
 */
function isDraftJsRaw(value) {
    if (!value) {
        return false;
    }
    return tryParseDraftRaw(value) !== null;
}

/**
 * Convert a `Parameter`-row string to HTML, handling the Draft.js-JSON / plain-HTML transition
 * described above. Exported so editor call sites (TipTapEditor-based) can convert existing
 * content the same way before loading it, without duplicating the format-detection logic here.
 *
 * On genuine double-conversion-failure (see `convertWysiwyg` above), this degrades to showing the
 * raw string rather than crashing -- correct for a read-only *viewer*, but NOT safe to reuse as-is
 * for an editable surface (saving would permanently overwrite the row with that raw string).
 * Editor call sites must use `wysiwygToEditableHtml` instead, which surfaces that failure as
 * `null` so the caller can show an error instead of loading it.
 * @param {string | null | undefined} wysiwygStrData
 * @returns {string}
 */
function wysiwygToHtml(wysiwygStrData) {
    const result = convertWysiwyg(wysiwygStrData);
    return result.failed ? wysiwygStrData : result.html;
}

/**
 * Same conversion as `wysiwygToHtml`, for editor call sites: returns `null` on genuine
 * double-conversion-failure instead of the raw (Draft.js JSON) string, so the caller can refuse
 * to load it into an editable, savable surface rather than risk the user's first keystroke
 * permanently overwriting the row with mangled JSON-as-text.
 * @param {string | null | undefined} wysiwygStrData
 * @returns {string | null}
 */
function wysiwygToEditableHtml(wysiwygStrData) {
    const result = convertWysiwyg(wysiwygStrData);
    return result.failed ? null : result.html;
}

module.exports = {
    convertWysiwyg,
    tryParseDraftRaw,
    isDraftJsRaw,
    wysiwygToHtml,
    wysiwygToEditableHtml,
};
