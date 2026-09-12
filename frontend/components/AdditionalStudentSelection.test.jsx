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

    test("numbers each additional student's label with a numeric index, not a string-concatenated one", () => {
        // Regression test for the `key + 1` string-concat bug: `key` is the object key from
        // `_.map(this.props.additionalStudents, ...)`, i.e. a string ("0", "1", ...). Without
        // `parseInt(key, 10)`, `key + 1` string-concatenates ("0" + 1 => "01", "1" + 1 => "11")
        // instead of incrementing numerically.
        const props = {
            family: [{ id: 1, first_name: "Jean", last_name: "Dupont" }],
            additionalStudents: {
                0: [null, 1],
                1: [null, 1],
            },
            handleChangeAdditionalStudent: () => {},
        };

        render(<ChildSelection {...props} />);

        expect(
            screen.getByText("Élève pour l'Éveil n° 1")
        ).toBeInTheDocument();
        expect(
            screen.getByText("Élève pour l'Éveil n° 2")
        ).toBeInTheDocument();
        expect(
            screen.queryByText(/n° 01/)
        ).not.toBeInTheDocument();
        expect(
            screen.queryByText(/n° 11/)
        ).not.toBeInTheDocument();
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
