// i18n extraction test for DeleteItemModal.jsx (frontend/components/common/baseDataTable/), a
// KnownIssues.md follow-up: this shared modal (BaseDataTable.jsx's only importer, always passing
// both `title`/`question`) had no useTranslation at all -- its title/question fallback strings,
// "Annuler"/"Supprimer" buttons, and generic delete-error message were all hardcoded French.
// Now reads them from useTranslation("common"), reusing the existing common:actions.{cancel,delete}
// for the two buttons.
//
// The title/question fallbacks are unreachable from the current (only) call site, but are
// translated anyway as cheap insurance for a future caller that doesn't pass them.

import React from "react";
import {render, screen, fireEvent, waitFor} from "@testing-library/react";
import i18n from "../../../i18n";
import DeleteItemModal from "./DeleteItemModal";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("DeleteItemModal — title/question fallback (unreachable from the current call site, translated anyway)", () => {
    test.each(["fr", "en"])("%s: falls back to the translated title/question when neither prop is passed", async lng => {
        await i18n.changeLanguage(lng);
        const t = i18n.getFixedT(lng, "common");
        render(<DeleteItemModal isOpen onRequestClose={() => {}} onDelete={() => Promise.resolve()} />);

        expect(screen.getByRole("heading", {name: t("deleteItemModal.titleFallback")})).toBeInTheDocument();
        expect(screen.getByText(t("deleteItemModal.questionFallback"))).toBeInTheDocument();
    });
});

describe("DeleteItemModal — buttons reuse common:actions.{cancel,delete}", () => {
    test.each(["fr", "en"])("%s: Cancel/Delete buttons are translated", async lng => {
        await i18n.changeLanguage(lng);
        const t = i18n.getFixedT(lng, "common");
        render(<DeleteItemModal isOpen onRequestClose={() => {}} onDelete={() => Promise.resolve()} />);

        expect(screen.getByText(t("actions.cancel"))).toBeInTheDocument();
        expect(screen.getByText(t("actions.delete"))).toBeInTheDocument();
    });
});

describe("DeleteItemModal — generic delete-error fallback", () => {
    test.each(["fr", "en"])("%s: a rejection with no .message renders the translated generic error", async lng => {
        await i18n.changeLanguage(lng);
        const t = i18n.getFixedT(lng, "common");
        render(<DeleteItemModal isOpen onRequestClose={() => {}} onDelete={() => Promise.reject({})} />);

        fireEvent.click(screen.getByText(t("actions.delete")));
        await waitFor(() => expect(screen.getByText(t("deleteItemModal.genericError"))).toBeInTheDocument());
    });

    test("a rejection WITH .message renders that message verbatim, not the generic fallback", async () => {
        await i18n.changeLanguage("fr");
        render(
            <DeleteItemModal
                isOpen
                onRequestClose={() => {}}
                onDelete={() => Promise.reject({message: "Conflit détecté"})}
            />,
        );

        fireEvent.click(screen.getByText(i18n.getFixedT("fr", "common")("actions.delete")));
        await waitFor(() => expect(screen.getByText("Conflit détecté")).toBeInTheDocument());
    });
});
