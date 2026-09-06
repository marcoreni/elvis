// Component test for the i18n extraction done on UserEdit (frontend i18n branch 05):
// - UserList/UserEdit are the first real consumers of the `users` i18next namespace, wired via
//   the `withTranslation()` HOC (frontend/i18n/index.js, docs/I18n.md).
// - LevelInfos/UserForm/Roles are out of scope for this extraction (they own their own strings,
//   not touched here), so they're mocked out to keep this test focused on strings that live
//   directly in UserEdit.jsx: the page title and the TabbedComponent tab headers.
// - Language switching uses the shared i18next singleton from frontend/i18n/index.js via
//   `i18n.changeLanguage(...)`: withTranslation()-wrapped components subscribe to that instance's
//   `languageChanged` event and re-render, no <I18nextProvider> needed since
//   frontend/i18n/index.js already calls `i18n.use(initReactI18next)`, which registers this
//   instance as react-i18next's default.

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../i18n";
import UserEdit from "./UserEdit";

vi.mock("./personalInfos/LevelInfos", () => ({default: () => <div>LevelInfos stub</div>}));
vi.mock("./userForm/UserForm", () => ({default: () => <div>UserForm stub</div>}));
vi.mock("./personalInfos/Roles", () => ({default: () => <div>Roles stub</div>}));

const user = {
    id: 1,
    last_name: "doe",
    first_name: "John",
    authentication_token: "test-token",
    addresses: [],
    telephones: [],
    family_links_with_user: [],
    consent_document_users: [],
};

function renderUserEdit(overrideProps = {}) {
    return render(
        <UserEdit
            user={user}
            currentUserIsAdmin
            current_user={{is_admin: true}}
            {...overrideProps}
        />
    );
}

describe("UserEdit", () => {
    afterEach(async () => {
        await i18n.changeLanguage("fr");
    });

    // The plain "renders the fr / renders the en" title + tab-header pair was a pure string-echo
    // and has been removed under the Phase 07 P0 checkpoint strategy (docs/I18n-Roadmap.md §P0).
    // The `users` area locale checkpoint lives in UserList.test.jsx; the conditional-tab
    // behaviour below is what is specific to this component.

    test("hides the evaluations/roles tabs for a non-admin, non-teacher current_user", async () => {
        await i18n.changeLanguage("fr");
        renderUserEdit({current_user: {is_admin: false, is_teacher: false}});

        expect(await screen.findByText("Coordonnées")).toBeInTheDocument();
        expect(screen.queryByText("Évaluations")).not.toBeInTheDocument();
        expect(screen.queryByText("Rôles")).not.toBeInTheDocument();
    });
});
