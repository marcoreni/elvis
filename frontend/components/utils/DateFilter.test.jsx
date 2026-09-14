// Regression test for the undeclared-lodash-global fix (fix/undeclared-lodash-global): before that
// fix, `RangedSelect` called `_.range(props.min, props.max)` with no `import _ from "lodash"` in
// this file, relying on a global `_` the webpack config never actually provides. Under jsdom (and
// in the real bundle) that threw `ReferenceError: _ is not defined` on every render.

import React from "react";
import { render, screen } from "@testing-library/react";
import { RangedSelect } from "./DateFilter";

describe("RangedSelect — _.range builds the option list without throwing", () => {
    test("renders one <option> per value in [min, max)", () => {
        render(<RangedSelect min={1} max={4} name="d" placeholder="Jour" onChange={() => {}} />);

        expect(screen.getByRole("option", { name: "1" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "2" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "3" })).toBeInTheDocument();
        expect(screen.queryByRole("option", { name: "4" })).not.toBeInTheDocument();
    });

    test("throws its own explicit guard (not a lodash ReferenceError) when min/max are not numbers", () => {
        // React's dev-mode error path re-dispatches a render throw through a real DOM event
        // (invokeGuardedCallbackDev) purely so devtools can capture a native stack trace -- it
        // does this in addition to, not instead of, letting the error propagate to this test's own
        // `toThrow()`. Left unhandled, jsdom surfaces that second copy as console noise (and, under
        // some schedulings, as a suite-level "Uncaught Exception"). Both are silenced for the
        // duration of this one intentional-throw test only.
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        const onWindowError = (event) => event.preventDefault();
        window.addEventListener("error", onWindowError);

        try {
            expect(() =>
                render(<RangedSelect min="1" max={4} name="d" onChange={() => {}} />)
            ).toThrow("the arguments need to be integers");
        } finally {
            window.removeEventListener("error", onWindowError);
            consoleError.mockRestore();
        }
    });
});
