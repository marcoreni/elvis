// Component test for ValidationErrorList.tsx -- new coverage (none existed before this
// PureComponent -> React.memo'd function conversion). Currently unreferenced by any real call
// site in the app, but it's still part of the public component surface.

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import ValidationErrorList from "./ValidationErrorList";
import { MESSAGES } from "../../tools/constants";

describe("ValidationErrorList", () => {
    test("renders nothing when there is no error", () => {
        const { container } = render(<ValidationErrorList />);
        expect(container).toBeEmptyDOMElement();
    });

    test("renders the resolved message for a single error code", () => {
        render(<ValidationErrorList error="err_required" />);
        expect(
            screen.getByText(MESSAGES.err_required as string)
        ).toBeInTheDocument();
    });

    test("renders the resolved message for each code in an array of errors", () => {
        render(
            <ValidationErrorList error={["err_required", "err_is_invalid"]} />
        );
        expect(
            screen.getByText(MESSAGES.err_required as string)
        ).toBeInTheDocument();
        expect(
            screen.getByText(MESSAGES.err_is_invalid as string)
        ).toBeInTheDocument();
    });
});
