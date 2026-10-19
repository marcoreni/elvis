import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import "@testing-library/jest-dom/vitest";
import RichTextViewer from "./RichTextViewer";

describe("RichTextViewer", () => {
    test("renders an HTML string", () => {
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
