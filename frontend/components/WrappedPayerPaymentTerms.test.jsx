// Phase 4c: WrappedPayerPaymentTerms swapped its `paymentStepDisplayText` viewer from the old
// Draft.js-based `WysiwygViewer` to `RichTextViewer` -- a pure prop-compatible swap (same
// `wysiwygStrData`/`className`/`style` props), so this just confirms the content still renders.
// `PayerPaymentTerms`/`PayerPaymentTermsInfo` are irrelevant to that and stubbed to `() => null`.

import React from "react";
import { render, screen } from "@testing-library/react";
import WrappedPayerPaymentTerms from "./WrappedPayerPaymentTerms";

vi.mock("./PayerPaymentTerms", () => ({ default: () => null }));
vi.mock("./PayerPaymentTermsInfo", () => ({ default: () => null }));

const baseProps = {
    user: {},
    family: [],
    initialSelectedPayers: [1],
    paymentTerms: {},
    availPaymentScheduleOptions: [],
    availPaymentMethods: [],
    informationalStepOnly: true,
};

test("renders paymentStepDisplayText (plain HTML) through RichTextViewer", () => {
    render(
        <WrappedPayerPaymentTerms
            {...baseProps}
            paymentStepDisplayText="<p>Please pay on time</p>"
        />
    );

    expect(screen.getByText("Please pay on time")).toBeInTheDocument();
});

test("renders paymentStepDisplayText (legacy Draft.js JSON) through RichTextViewer", () => {
    const draftRawJson = JSON.stringify({
        blocks: [
            {
                key: "a",
                text: "Legacy content",
                type: "unstyled",
                depth: 0,
                inlineStyleRanges: [],
                entityRanges: [],
                data: {},
            },
        ],
        entityMap: {},
    });

    render(
        <WrappedPayerPaymentTerms
            {...baseProps}
            paymentStepDisplayText={draftRawJson}
        />
    );

    expect(screen.getByText("Legacy content")).toBeInTheDocument();
});

test("renders nothing extra when paymentStepDisplayText is absent", () => {
    const { container } = render(
        <WrappedPayerPaymentTerms
            {...baseProps}
            paymentStepDisplayText={null}
        />
    );

    expect(container.querySelector(".wysiwyg-viewer")).toBeNull();
});
