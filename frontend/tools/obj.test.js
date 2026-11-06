// Regression coverage for infosFromUser's consent_docs derivation (docs/KnownIssues.md's
// "tools/obj.js's infosFromUser mis-derives a consent doc's agreement type"). The real bug this
// guards against: a has_consented: null row (reachable before UserForm.jsx's own fix -- see git
// history) used to crash here with `TypeError: Cannot read properties of null (reading
// 'toString')`, taking down the whole UserEdit/Wizard island on page load.

import { infosFromUser } from "./obj";

function makeUser(consentDocumentUsers) {
    return {
        addresses: [],
        telephones: [],
        consent_document_users: consentDocumentUsers,
    };
}

describe("infosFromUser consent_docs derivation", () => {
    test("a has_consented: null row (an existing unanswered doc) does not throw, and is left unanswered", () => {
        const user = makeUser([
            { consent_document_id: 1, has_consented: null },
        ]);

        let infos;
        expect(() => {
            infos = infosFromUser(user);
        }).not.toThrow();

        expect(infos.consent_docs.id_1.agreement).toBeUndefined();
    });

    test('has_consented: false still derives the string "false" (pre-existing, not changed by this fix)', () => {
        const user = makeUser([
            { consent_document_id: 1, has_consented: false },
        ]);

        const infos = infosFromUser(user);

        expect(infos.consent_docs.id_1.agreement).toBe("false");
    });

    test('has_consented: true derives the string "true"', () => {
        const user = makeUser([
            { consent_document_id: 1, has_consented: true },
        ]);

        const infos = infosFromUser(user);

        expect(infos.consent_docs.id_1.agreement).toBe("true");
    });

    test("no consent_document_users produces an empty consent_docs object", () => {
        const user = makeUser([]);

        const infos = infosFromUser(user);

        expect(infos.consent_docs).toEqual({});
    });
});
