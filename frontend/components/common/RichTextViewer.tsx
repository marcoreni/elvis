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
    const html = toHtml(wysiwygStrData);

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

function toHtml(wysiwygStrData: string | null | undefined): string {
    if (!wysiwygStrData) {
        return "";
    }

    const draftRaw = tryParseDraftRaw(wysiwygStrData);
    if (draftRaw) {
        try {
            return draftToHtml(draftRaw);
        } catch (e) {
            // Well-formed Draft.js JSON shape (has a `blocks` array) but
            // missing/malformed enough internally (e.g. a block missing
            // `inlineStyleRanges`) to make draftjs-to-html throw directly.
            // The old WysiwygViewer never hit this: it always ran raw JSON
            // through draft-js's own convertFromRaw/convertToRaw first,
            // which normalizes missing fields (e.g. fills in `[]` for a
            // missing inlineStyleRanges) -- do the same before giving up.
            try {
                return draftToHtml(convertToRaw(convertFromRaw(draftRaw)));
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
                return wysiwygStrData;
            }
        }
    }

    // Not Draft.js JSON: already HTML (or plain text, which is valid HTML too).
    return wysiwygStrData;
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
