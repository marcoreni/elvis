// Regression test for the undeclared-lodash-global fix (fix/undeclared-lodash-global): before that
// fix, `NamePicker` rendered its "existing users" list with `_.map(this.props.possibleMatches, ...)`,
// with no `import _ from "lodash"` in this file. Under jsdom (and in the real bundle) that threw
// `ReferenceError: _ is not defined` as soon as an admin's search returned at least one match.

import React from "react";
import { render, screen } from "@testing-library/react";
import NamePicker from "./NamePicker";

const baseProps = (overrides = {}) => ({
    user: { is_admin: true },
    infos: { last_name: "", first_name: "" },
    possibleMatches: [],
    handleSelectMatch: () => {},
    handleChangeInfos: () => {},
    inEdition: false,
    personSelection: "",
    validationState: null,
    ...overrides,
});

describe("NamePicker — _.map renders the existing-user matches without throwing", () => {
    test("renders one entry per possible match", () => {
        render(
            <NamePicker
                {...baseProps({
                    possibleMatches: [
                        {
                            id: 1,
                            first_name: "Jean",
                            last_name: "Dupont",
                            birthday: "2000-01-01",
                        },
                    ],
                })}
            />
        );

        // "Jean" / nbsp / "Dupont" are three sibling text nodes under the same <b> — match the
        // combined text with a regex rather than an exact string.
        expect(screen.getByText(/Jean\s*Dupont/)).toBeInTheDocument();
    });

    test("renders nothing when there are no possible matches", () => {
        render(<NamePicker {...baseProps({ possibleMatches: [] })} />);

        expect(screen.queryByText(/déja existants/)).not.toBeInTheDocument();
    });
});
