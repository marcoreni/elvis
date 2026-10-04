import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import "@testing-library/jest-dom/vitest";
import RichTextViewer from "./RichTextViewer";

// RichTextViewer must keep rendering the OLD Draft.js raw-JSON format (written by the
// react-draft-wysiwyg editor it replaces) as well as the new TipTap HTML format, since the
// one-time DB migration from the former to the latter (Phase 4d) runs manually per environment
// and isn't guaranteed to have happened yet wherever this component is deployed.
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

describe("RichTextViewer", () => {
    test("renders Draft.js raw JSON as the equivalent HTML", () => {
        const { container } = render(
            <RichTextViewer
                wysiwygStrData={draftRawJson}
                className=""
                style={{}}
            />
        );

        expect(container.querySelector("strong")).toHaveTextContent("Hello");
        expect(container.querySelector("p")).toHaveTextContent("Hello world");
    });

    test("degrades gracefully instead of throwing on malformed Draft.js JSON", () => {
        // Well-formed Draft.js shape (has a `blocks` array) but a block
        // missing `inlineStyleRanges` -- draftjs-to-html throws a TypeError
        // on this (confirmed directly: "Cannot read properties of
        // undefined (reading 'length')"). A throw during render would
        // unmount the whole island, not just garble the text.
        const malformed = JSON.stringify({
            blocks: [{ text: "x", type: "unstyled" }],
            entityMap: {},
        });

        expect(() =>
            render(
                <RichTextViewer
                    wysiwygStrData={malformed}
                    className=""
                    style={{}}
                />
            )
        ).not.toThrow();
    });

    test("renders an already-HTML string directly", () => {
        const html = "<p>Already <em>HTML</em> content</p>";
        const { container } = render(
            <RichTextViewer wysiwygStrData={html} className="" style={{}} />
        );

        expect(container.querySelector("em")).toHaveTextContent("HTML");
        expect(container.querySelector("p")).toHaveTextContent(
            "Already HTML content"
        );
    });

    test("sanitizes unsafe HTML", () => {
        const unsafe = "<p>safe</p><script>window.pwned = true;</script>";
        const { container } = render(
            <RichTextViewer wysiwygStrData={unsafe} className="" style={{}} />
        );

        expect(container.querySelector("script")).toBeNull();
        expect(container.textContent).toContain("safe");
    });

    test("keeps the target attribute on links (ADD_ATTR config)", () => {
        const html =
            '<p><a href="https://example.com" target="_blank">link</a></p>';
        const { container } = render(
            <RichTextViewer wysiwygStrData={html} className="" style={{}} />
        );

        expect(container.querySelector("a")).toHaveAttribute(
            "target",
            "_blank"
        );
    });

    test("renders an empty wrapper for null data, without throwing", () => {
        const { container } = render(
            <RichTextViewer wysiwygStrData={null} className="" style={{}} />
        );

        expect(
            container.querySelector(".wysiwyg-viewer")
        ).toBeEmptyDOMElement();
    });

    test("renders an empty wrapper for an empty string, without throwing", () => {
        const { container } = render(
            <RichTextViewer wysiwygStrData="" className="" style={{}} />
        );

        expect(
            container.querySelector(".wysiwyg-viewer")
        ).toBeEmptyDOMElement();
    });

    test("applies the given className alongside the base wysiwyg-viewer class", () => {
        const { container } = render(
            <RichTextViewer
                wysiwygStrData="<p>x</p>"
                className="col-11 p-0"
                style={{}}
            />
        );

        expect(container.querySelector(".wysiwyg-viewer")).toHaveClass(
            "col-11",
            "p-0"
        );
    });
});
