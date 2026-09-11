// Regression test for the undeclared-lodash-global fix (fix/undeclared-lodash-global): before that
// fix, `FamilyMemberUser` rendered its "existing users" list with
// `_.map(this.props.infos.possibleMatches, ...)`, with no `import _ from "lodash"` in this file.
// Under jsdom (and in the real bundle) that threw `ReferenceError: _ is not defined` as soon as
// the family-member search returned at least one match. Same shape as NamePicker.test.jsx: the
// `_.map` sits behind a `possibleMatches.length > 0` guard, so only the non-empty case reaches it.

import React from "react";
import { render, screen } from "@testing-library/react";
import FamilyMemberUser from "./FamilyMemberUser";

const baseProps = (overrides = {}) => ({
    idx: 0,
    orig: { first_name: "Marie", last_name: "Martin" },
    infos: { first_name: "", last_name: "", possibleMatches: [], ...overrides },
    handleSelectParentMatch: () => {},
    handleChangeMemberInfos: () => {},
    handleAddEmptyPhoneNumber: () => {},
    handleUpdatePhoneInfos: () => {},
    handleDeleteFamilyMemberPhoneNumber: () => {},
});

describe("FamilyMemberUser — _.map renders the existing-user matches without throwing", () => {
    test("renders one entry per possible match", () => {
        render(
            <FamilyMemberUser
                {...baseProps({
                    possibleMatches: [
                        {
                            id: 1,
                            first_name: "Jean",
                            last_name: "Dupont",
                            adherent_number: 42,
                        },
                    ],
                })}
            />
        );

        // "Jean" / nbsp / "Dupont" are three sibling text nodes under the same <b> — match the
        // combined text with a regex rather than an exact string.
        expect(screen.getByText(/Jean\s*Dupont/)).toBeInTheDocument();
        expect(screen.getByText(/déja existants/)).toBeInTheDocument();
    });

    test("renders nothing when there are no possible matches", () => {
        render(<FamilyMemberUser {...baseProps()} />);

        expect(screen.queryByText(/déja existants/)).not.toBeInTheDocument();
    });
});
