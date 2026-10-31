// Regression coverage for the consent-doc pre-fill fix. `tools/obj.js`'s infosFromUser already
// builds the `consent_docs.id_<N>.agreement` key ConsentDocItem's Field/AlertYesNoRadio read for
// pre-fill, but gets the value wrong: it reads `expected_answer` off the consent_document_user
// (which never has that column), so it always falls through to `has_consented.toString()` -- a
// checkbox doc explicitly answered "false" pre-filled the STRING "false", and `!!"false"` is
// `true` in JS, so an explicit refusal rendered as checked (see docs/KnownIssues.md's entry on
// `obj.js`'s broken expected_answer/.toString() logic -- pre-existing, not fixed here).
// UserForm.jsx now recomputes that key itself using the real `expected_answer` off its own
// `consent_docs` prop, correctly distinguishing checkbox vs. yes/no-radio docs and leaving a
// never-answered doc's key unset entirely (not coerced to a falsy value) -- both so it renders as
// unanswered rather than a false "no", and so it doesn't make UsersController#update create a
// `has_consented: nil` row that would crash this same re-fetch next time.
//
// GeneralInfos/ContactInfos/HandicapInfos/Payers are heavy, unrelated form sections (national-ID
// masking, family member management, etc. -- each already covered by its own test file) stubbed
// out here so this file can focus on the consent-doc section alone, same approach as
// Planning.test.jsx stubbing Calendar/ActivityDetailsModal.

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("./GeneralInfos", () => ({
    default: () => <div data-testid="general-infos-stub" />,
}));
vi.mock("./ContactInfos", () => ({
    default: () => <div data-testid="contact-infos-stub" />,
}));
vi.mock("./HandicapInfos", () => ({
    default: () => <div data-testid="handicap-infos-stub" />,
}));
vi.mock("./Payers", () => ({
    default: () => <div data-testid="payers-stub" />,
}));

import UserForm from "./UserForm";

const CHECKBOX_DOC = {
    id: 1,
    title: "Règlement intérieur",
    content: "Je consens au règlement",
    expected_answer: true,
};

const RADIO_DOC = {
    id: 2,
    title: "Droit à l'image",
    content: "Autorisez-vous la diffusion de votre image ?",
    expected_answer: false,
};

function renderUserForm({ consentDocumentUsers, consentDocs } = {}) {
    render(
        <UserForm
            initialValues={{
                id: 1,
                first_name: "Jean",
                last_name: "Dupont",
                consent_document_users: consentDocumentUsers || [],
            }}
            consent_docs={consentDocs || [CHECKBOX_DOC, RADIO_DOC]}
            schoolName="My School"
            hidePayers={true}
            displaySubmit={false}
            onSubmit={() => {}}
        />
    );
}

describe("UserForm consent-doc pre-fill", () => {
    test("a previously consented checkbox-type doc renders pre-checked", () => {
        renderUserForm({
            consentDocumentUsers: [
                { consent_document_id: 1, has_consented: true },
            ],
        });

        const checkbox = screen.getByRole("checkbox", { hidden: true });
        expect(checkbox).toBeChecked();
    });

    test("a previously answered yes/no doc renders with the matching radio selected", () => {
        renderUserForm({
            consentDocumentUsers: [
                { consent_document_id: 2, has_consented: true },
            ],
        });

        const radios = screen.getAllByRole("radio", { hidden: true });
        expect(radios).toHaveLength(2);
        const [yes, no] = radios;
        expect(yes).toBeChecked();
        expect(no).not.toBeChecked();
    });

    test("a yes/no doc previously answered 'no' renders the 'no' radio selected, not unanswered", () => {
        renderUserForm({
            consentDocumentUsers: [
                { consent_document_id: 2, has_consented: false },
            ],
        });

        const [yes, no] = screen.getAllByRole("radio", { hidden: true });
        expect(yes).not.toBeChecked();
        expect(no).toBeChecked();
    });

    test("a doc never answered (no consent_document_users entry) renders unanswered, not falsely 'no'", () => {
        renderUserForm({ consentDocumentUsers: [] });

        const checkbox = screen.getByRole("checkbox", { hidden: true });
        expect(checkbox).not.toBeChecked();

        // Unanswered must be distinguishable from an explicit "no": neither radio selected,
        // whereas an explicit "no" (tested above) selects the second radio.
        const [yes, no] = screen.getAllByRole("radio", { hidden: true });
        expect(yes).not.toBeChecked();
        expect(no).not.toBeChecked();
    });

    test("does not mutate the shared initialValues.consent_docs object during render", () => {
        // Simulates obj.js's infosFromUser already having built this key -- both real call
        // sites (UserEdit.jsx, Wizard.jsx) pass the SAME object as both `initialValues` and
        // their own component state, so writing into it during render would mutate the
        // parent's state. `agreement: true` deliberately disagrees with the real
        // has_consented: false below -- the recomputed value differs from what's already
        // there, so an in-place write (mutating the shared object instead of a copy) would
        // be directly observable as this object changing after render.
        const sharedConsentDocs = { id_1: { agreement: true } };
        const snapshotBefore = JSON.parse(JSON.stringify(sharedConsentDocs));

        render(
            <UserForm
                initialValues={{
                    id: 1,
                    first_name: "Jean",
                    consent_document_users: [
                        { consent_document_id: 1, has_consented: false },
                    ],
                    consent_docs: sharedConsentDocs,
                }}
                consent_docs={[CHECKBOX_DOC, RADIO_DOC]}
                schoolName="My School"
                hidePayers={true}
                displaySubmit={false}
                onSubmit={() => {}}
            />
        );

        expect(sharedConsentDocs).toEqual(snapshotBefore);
    });

    test("an unanswered doc is never submitted, so UsersController#update can't create a has_consented: nil row", () => {
        // UserForm.jsx's own validate() skips all consent/payer/rules checks when the acting
        // user is_admin (see validate()'s early return) -- the real path an admin editing
        // someone else's profile can hit without ever answering every doc.
        const onSubmit = vi.fn();
        render(
            <UserForm
                initialValues={{
                    id: 1,
                    first_name: "Jean",
                    consent_document_users: [
                        { consent_document_id: 1, has_consented: true },
                    ],
                }}
                consent_docs={[CHECKBOX_DOC, RADIO_DOC]}
                schoolName="My School"
                hidePayers={true}
                displaySubmit={true}
                user={{ is_admin: true }}
                onSubmit={onSubmit}
            />
        );

        fireEvent.click(screen.getByRole("button", { name: /.*/ }));

        expect(onSubmit).toHaveBeenCalledTimes(1);
        const submitted = onSubmit.mock.calls[0][0];
        expect(submitted.consent_docs.id_1).toEqual({ agreement: true });
        expect(submitted.consent_docs.id_2).toBeUndefined();
    });
});
