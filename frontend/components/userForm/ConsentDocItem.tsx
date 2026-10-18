import React, { Fragment, useEffect, useRef } from "react";
import { Field } from "react-final-form";
import AlertCheckbox from "../common/AlertCheckbox";
import AlertYesNoRadio from "../common/AlertYesNoRadio";

// Not one of entities.ts's serializer-backed entities (consent docs aren't their own entity
// there) -- a local shape matching exactly what this component reads.
interface ConsentDoc {
    id: number;
    title: string;
    content?: string;
    expected_answer: boolean;
    attached_file_url?: string;
}

interface ConsentDocItemProps {
    docItem: ConsentDoc;
    schoolName: string;
}

export default function ConsentDocItem({
    docItem,
    schoolName,
}: ConsentDocItemProps) {
    // Always call the hook (Rules of Hooks) -- `span` itself stays conditional exactly as before:
    // undefined when there's an attached file (no ref needed), the ref object otherwise.
    const spanRef = useRef<HTMLSpanElement>(null);
    const span = docItem.attached_file_url ? undefined : spanRef;

    useEffect(() => {
        if (span && span.current) {
            span.current.innerHTML = (docItem.content ?? "")
                .replaceAll(/https?:\/\/[^\s]+/g, function (match) {
                    return `<a target="_blank" href="${match}">${match}</a>`;
                })
                .replaceAll("{schoolName}", schoolName);
        }
    }, [span]);

    const text = (
        <React.Fragment>
            {docItem.attached_file_url ? (
                <Fragment>
                    <span
                        className="font-weight-bold"
                        style={{ color: "rgb(0, 51, 74)" }}
                    >
                        {docItem.content}
                    </span>{" "}
                    &nbsp;
                    <a href={docItem.attached_file_url} target="_blank">
                        {docItem.title}
                    </a>
                </Fragment>
            ) : (
                <span
                    ref={span}
                    style={{ color: "rgb(0, 51, 74)" }}
                    className="font-weight-bold small"
                ></span>
            )}
        </React.Fragment>
    );

    return (
        <Fragment>
            {docItem.expected_answer ? (
                <Fragment>
                    {/* checkbox case. AlertCheckbox also destructures `alertType` for its
                        `alert-${alertType}` class (see common/AlertCheckbox.jsx); every other
                        real Field+AlertCheckbox call site (GDPR.jsx) passes "info" -- this one
                        was missing it too (same `alert-undefined` bug as the AlertYesNoRadio
                        branch below), just not caught by tsc since <Field component={...}> is
                        typed loosely enough not to flag it. Fixed to match. */}
                    <Field
                        name={`consent_docs[id_${docItem.id}].agreement`}
                        type="checkbox"
                        alertType="info"
                        component={AlertCheckbox}
                        required
                        ignoreValidate={false}
                        text={text}
                    />
                </Fragment>
            ) : (
                <Fragment>
                    {/* yes - no case */}
                    {/* AlertYesNoRadio destructures `alertType` for its `alert-${alertType}`
                        class (see common/AlertYesNoRadio.jsx) and every other real call site
                        (NewsLetter.jsx, ImageRight.jsx) passes "info" -- this call was missing
                        it (rendering a bare `alert-undefined` class), surfaced here once
                        TypeScript inferred AlertYesNoRadio's untyped destructured params as
                        required. Fixed to match the established convention. */}
                    <AlertYesNoRadio
                        name={`consent_docs[id_${docItem.id}].agreement`}
                        alertType="info"
                        ignoreValidate={true}
                        text={text}
                    />
                </Fragment>
            )}
        </Fragment>
    );
}
