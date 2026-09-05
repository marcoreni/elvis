// i18n extraction test for ItemFormModal.jsx (frontend/components/common/baseDataTable/), a
// KnownIssues.md follow-up: this shared modal (used by BaseDataTable.jsx and, separately,
// userPayments/PaymentsSummary.jsx via its "CreateCouponModal" alias) had no useTranslation at
// all -- its updateTitle/createTitle fallback strings, "Annuler"/"Sauvegarder" buttons, and
// "Erreur(s) :" heading were all hardcoded French. Now reads them from useTranslation("common").
//
// The updateTitle/createTitle fallbacks are unreachable from every current call site (both
// BaseDataTable.jsx and PaymentsSummary.jsx always pass an explicit title), but are translated
// anyway as cheap insurance for a future caller that doesn't -- same reasoning as leaving the
// fallback branch itself in place.

// The "Erreur(s) :" test below renders the array branch, which calls `_.map`. That `_` used to be
// a bare undefined global in ItemFormModal.jsx: nothing imports lodash there, and this app's
// webpack ProvidePlugin (config/webpack/webpack.config.js) only provides `$`/`jQuery`, never `_`.
// So that branch threw ReferenceError in the real bundle. ItemFormModal.jsx now imports lodash
// itself; do NOT paper over a future regression here with a `global._` shim, or this test will
// pass against a bundle that crashes.

import React from "react";
import {render, screen, fireEvent, waitFor} from "@testing-library/react";
import i18n from "../../../i18n";
import ItemFormModal from "./ItemFormModal";

const FormContent = () => <div>form content</div>;

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("ItemFormModal — title fallback (unreachable from current call sites, translated anyway)", () => {
    test.each([
        ["fr", null, "Création"],
        ["fr", {id: 1}, "Mise à jour"],
        ["en", null, "Create"],
        ["en", {id: 1}, "Update"],
    ])("%s: falls back to the translated title when no updateTitle/createTitle prop is passed (item=%o)", async (lng, item, expected) => {
        await i18n.changeLanguage(lng);
        render(
            <ItemFormModal
                isOpen
                item={item}
                component={FormContent}
                onRequestClose={() => {}}
                onSubmit={() => Promise.resolve()}
            />,
        );

        expect(screen.getByRole("heading", {name: expected})).toBeInTheDocument();
    });
});

describe("ItemFormModal — buttons and error heading", () => {
    for (const lng of ["fr", "en"]) {
        test(`${lng}: Cancel/Save buttons are translated`, async () => {
            await i18n.changeLanguage(lng);
            const t = i18n.getFixedT(lng, "common");
            render(
                <ItemFormModal
                    isOpen
                    component={FormContent}
                    onRequestClose={() => {}}
                    onSubmit={() => Promise.resolve()}
                />,
            );

            expect(screen.getByText(t("actions.cancel"))).toBeInTheDocument();
            expect(screen.getByText(t("itemFormModal.saveButton"))).toBeInTheDocument();
        });

        test(`${lng}: a rejected onSubmit renders the translated "Erreur(s) :" heading`, async () => {
            await i18n.changeLanguage(lng);
            const t = i18n.getFixedT(lng, "common");
            render(
                <ItemFormModal
                    isOpen
                    component={FormContent}
                    onRequestClose={() => {}}
                    onSubmit={() => Promise.reject(["boom"])}
                />,
            );

            fireEvent.click(screen.getByText(t("itemFormModal.saveButton")));
            await waitFor(() => expect(screen.getByText(t("itemFormModal.errorsHeading"))).toBeInTheDocument());
            expect(screen.getByText("boom")).toBeInTheDocument();
        });
    }
});
