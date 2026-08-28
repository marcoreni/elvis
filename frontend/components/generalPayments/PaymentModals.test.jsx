// i18n extraction test for the two generalPayments modals (i18n-06 payments lot 2a):
// BulkEditModal and MessageModal, both plain function components using useTranslation("payments")
// plus the shared common:actions.* keys.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import BulkEditModal from "./BulkEditModal";
import MessageModal from "./MessageModal";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("BulkEditModal", () => {
    test("French by default", async () => {
        await i18n.changeLanguage("fr");
        render(<BulkEditModal id="m" onChange={() => {}} onSubmit={() => {}} />);

        expect(screen.getByText("Modification d'échéances en masse")).toBeInTheDocument();
        expect(screen.getByText("Date d'échéance")).toBeInTheDocument();
        expect(screen.getByText("Annuler")).toBeInTheDocument();
        expect(screen.getByText("Enregistrer")).toBeInTheDocument();
    });

    test("English when active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<BulkEditModal id="m" onChange={() => {}} onSubmit={() => {}} />);

        await waitFor(() =>
            expect(screen.getByText("Bulk-edit due dates")).toBeInTheDocument()
        );
        expect(screen.getByText("Cancel")).toBeInTheDocument();
        expect(screen.getByText("Save")).toBeInTheDocument();
    });
});

describe("MessageModal", () => {
    const props = {
        id: "msg",
        onChange: () => {},
        onSend: () => {},
        message: { title: "", content: "" },
        recipients: "",
    };

    test("French by default", async () => {
        await i18n.changeLanguage("fr");
        render(<MessageModal {...props} />);

        expect(screen.getByText("Envoi d'un rappel")).toBeInTheDocument();
        expect(screen.getByText("Destinataire.s")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Votre titre ici...")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Votre message ici...")).toBeInTheDocument();
        expect(screen.getByText("Envoyer")).toBeInTheDocument();
    });

    test("English when active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<MessageModal {...props} />);

        await waitFor(() =>
            expect(screen.getByText("Send a reminder")).toBeInTheDocument()
        );
        expect(screen.getByText("Recipient(s)")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Your title here...")).toBeInTheDocument();
        expect(screen.getByText("Send")).toBeInTheDocument();
    });
});
