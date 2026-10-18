import React from "react";
import { sanitize } from "isomorphic-dompurify";
import { wysiwygToHtml } from "../../tools/wysiwygConversion";

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
 * @returns {React.JSX.Element}
 */
export default function RichTextViewer({
    wysiwygStrData,
    className,
    style,
}: {
    wysiwygStrData: string | null | undefined;
    className?: string;
    style?: React.CSSProperties;
}): React.JSX.Element {
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
