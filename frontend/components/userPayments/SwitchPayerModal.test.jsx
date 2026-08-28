// i18n extraction test for SwitchPayerModal (i18n-06 payments lot 2c-i). Plain function
// component using useTranslation("payments") + the shared common:actions.confirm key.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import SwitchPayerModal from "./SwitchPayerModal";

const props = {
    payer: { id: 1, first_name: "Jean", last_name: "Dupont" },
    payers: [{ id: 2, first_name: "Marie", last_name: "Martin" }],
    onSubmit: () => {},
};

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("SwitchPayerModal", () => {
    test("French by default", async () => {
        await i18n.changeLanguage("fr");
        render(<SwitchPayerModal {...props} />);

        expect(screen.getByText("Changement de payeur")).toBeInTheDocument();
        expect(screen.getByText("Remplacer le payeur Jean Dupont par")).toBeInTheDocument();
        expect(screen.getByText("CHOISISSEZ LE NOUVEAU PAYEUR")).toBeInTheDocument();
        expect(screen.getByText("Confirmer")).toBeInTheDocument();
    });

    test("English when active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<SwitchPayerModal {...props} />);

        await waitFor(() =>
            expect(screen.getByText("Change payer")).toBeInTheDocument()
        );
        expect(screen.getByText("Replace payer Jean Dupont with")).toBeInTheDocument();
        expect(screen.getByText("CHOOSE THE NEW PAYER")).toBeInTheDocument();
        expect(screen.getByText("Confirm")).toBeInTheDocument();
    });
});
