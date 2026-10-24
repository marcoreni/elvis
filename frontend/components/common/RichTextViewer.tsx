import React from "react";
import { sanitize } from "isomorphic-dompurify";

/**
 * Display rich-text HTML content, sanitized before being injected into the DOM.
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
    const html = wysiwygStrData ?? "";

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
