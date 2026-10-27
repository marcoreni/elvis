// Regression coverage for the consent-doc pre-fill fix (docs/KnownIssues.md's
// "UserForm.jsx never pre-fills a user's existing consent-doc answers"). formattedInitialValues
// used to only format YES_NO_FIELDS, never building the `consent_docs.id_<N>.agreement` key
// ConsentDocItem's Field/AlertYesNoRadio read for pre-fill -- so a user re-opening their profile
// always saw every consent checkbox/radio unanswered, even if they'd already answered it.
//
// GeneralInfos/ContactInfos/HandicapInfos/Payers are heavy, unrelated form sections (national-ID
// masking, family member management, etc. -- each already covered by its own test file) stubbed
// out here so this file can focus on the consent-doc section alone, same approach as
// Planning.test.jsx stubbing Calendar/ActivityDetailsModal.

import React from "react";
import { render, screen } from "@testing-library/react";

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
});
