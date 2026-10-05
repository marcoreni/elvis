import React from "react";
import draftToHtml from "draftjs-to-html";
import { convertFromRaw, convertToRaw } from "draft-js";
import { sanitize } from "isomorphic-dompurify";

/**
 * Display rich-text content as sanitized HTML.
 *
 * Transition support: the `Parameter` rows feeding this component currently
 * hold Draft.js raw-content JSON (written by the old `react-draft-wysiwyg`
 * editor). A later, separate migration will convert those rows to plain
 * HTML, but it runs manually per environment -- so until every environment
 * has been migrated, this component may receive either format and must
 * render both correctly: if `wysiwygStrData` parses as Draft.js raw JSON, it
 * is converted to HTML via `draftjs-to-html` (same as the old
 * `WysiwygViewer`); otherwise it is treated as already being HTML (or plain
 * text) and rendered as-is. Either way, the result is sanitized before
 * being injected into the DOM.
 * @returns {JSX.Element}
 */
export default function RichTextViewer({
    wysiwygStrData,
    className,
    style,
}: {
    wysiwygStrData: string | null | undefined;
    className?: string;
    style?: React.CSSProperties;
}): JSX.Element {
    const html = wysiwygToHtml(wysiwygStrData);

    // ne pas mettre la configuration de sanitize en props, ce serait une faille de sécurité
    const sanitizedHtml = sanitize(html, { ADD_ATTR: ["target"] });

    return (
        <div
            className={`wysiwyg-viewer ${className ?? ""}`}
            style={style}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        ></div>
    );
}

/**
 * Convert a `Parameter`-row string to HTML, handling the Draft.js-JSON /
 * plain-HTML transition described above. Exported so editor call sites
 * (TipTapEditor-based) can convert existing content the same way before
 * loading it, without duplicating the format-detection logic here.
 *
 * On genuine double-conversion-failure (see `convertWysiwyg` below), this
 * degrades to showing the raw string rather than crashing -- correct for a
 * read-only *viewer*, but NOT safe to reuse as-is for an editable surface
 * (saving would permanently overwrite the row with that raw string). Editor
 * call sites must use `wysiwygToEditableHtml` instead, which surfaces that
 * failure as `null` so the caller can show an error instead of loading it.
 */
export function wysiwygToHtml(
    wysiwygStrData: string | null | undefined
): string {
    const result = convertWysiwyg(wysiwygStrData);
    return result.failed ? (wysiwygStrData as string) : result.html;
}

/**
 * Same conversion as `wysiwygToHtml`, for editor call sites: returns `null`
 * on genuine double-conversion-failure instead of the raw (Draft.js JSON)
 * string, so the caller can refuse to load it into an editable, savable
 * surface rather than risk the user's first keystroke permanently
 * overwriting the row with mangled JSON-as-text.
 */
export function wysiwygToEditableHtml(
    wysiwygStrData: string | null | undefined
): string | null {
    const result = convertWysiwyg(wysiwygStrData);
    return result.failed ? null : result.html;
}

function convertWysiwyg(
    wysiwygStrData: string | null | undefined
): { html: string; failed: false } | { html: null; failed: true } {
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
                    "RichTextViewer: failed to render Draft.js content, even after normalizing via convertFromRaw/convertToRaw",
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
function tryParseDraftRaw(value: string): { blocks: unknown[] } | null {
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
