// Regression test for the undeclared-lodash-global fix (fix/undeclared-lodash-global): before that
// fix, `ChildSelection`'s render path called both `_.chain(...).map(...).value()` (building the
// parent <option>s) and `_.map(this.props.additionalStudents, ...)` (one row per additional
// student), with no `import _ from "lodash"` in this file. Under jsdom (and in the real bundle)
// that threw `ReferenceError: _ is not defined` on mount.

import React from "react";
import { render, screen } from "@testing-library/react";
import i18n from "../i18n"; // registers the default i18next instance so withTranslation resolves real strings
import ChildSelection from "./AdditionalStudentSelection";

beforeAll(() => i18n.changeLanguage("fr"));

describe("ChildSelection (AdditionalStudentSelection) — _.chain/_.map render without throwing", () => {
    test("renders a parent <option> (via _.chain) for each additional student row (via _.map)", () => {
        const props = {
            family: [{ id: 1, first_name: "Jean", last_name: "Dupont" }],
            additionalStudents: { 0: [null, 1] },
            handleChangeAdditionalStudent: () => {},
        };

        render(<ChildSelection {...props} />);

        expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
        expect(screen.getByText(/Élève pour l'Éveil/)).toBeInTheDocument();
    });

    test("renders nothing extra when there are no additional students", () => {
        const props = {
            family: [{ id: 1, first_name: "Jean", last_name: "Dupont" }],
            additionalStudents: {},
            handleChangeAdditionalStudent: () => {},
        };

        render(<ChildSelection {...props} />);

        expect(
            screen.queryByText(/Élève pour l'Éveil/)
        ).not.toBeInTheDocument();
    });
});
