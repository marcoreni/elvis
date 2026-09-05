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
        expect(() =>
            render(<RangedSelect min="1" max={4} name="d" onChange={() => {}} />)
        ).toThrow("the arguments need to be integers");
    });
});
