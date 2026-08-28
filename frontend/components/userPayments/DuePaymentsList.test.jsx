// i18n extraction test for userPayments/DuePaymentsList (i18n-06 payments lot 2c-ii). Class
// component, columns + four modals built in render(). Assertions target strings that are unique
// in the tree (the dropdown items, the create-schedule modal labels, the modal titles).

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../../i18n";
import DuePaymentsList from "./DuePaymentsList";

const props = {
    data: [],
    paymentMethods: [],
    statuses: [],
    itemsForPayment: [],
    payer: { id: 1 },
    adhesionEnabled: false,
    isStudentView: false,
};

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("userPayments/DuePaymentsList", () => {
    test("French by default", async () => {
        await i18n.changeLanguage("fr");
        render(<DuePaymentsList {...props} />);

        expect(screen.getByRole("heading", { name: /Échéancier/ })).toBeInTheDocument();
        expect(screen.getByText("Actions échéancier")).toBeInTheDocument();
        expect(screen.getByText("Créer l’échéancier")).toBeInTheDocument();
        expect(screen.getByText("Générer les règlements")).toBeInTheDocument();
        expect(screen.getByText("Nombre d’échéances")).toBeInTheDocument();
        expect(screen.getByText("Date de la première échéance")).toBeInTheDocument();
        expect(screen.getByText("Nouvel échéancier")).toBeInTheDocument();
    });

    test("English when active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<DuePaymentsList {...props} />);

        await waitFor(() =>
            expect(screen.getByText("Schedule actions")).toBeInTheDocument()
        );
        expect(screen.getByText("Create the schedule")).toBeInTheDocument();
        expect(screen.getByText("Generate the payments")).toBeInTheDocument();
        expect(screen.getByText("Number of due dates")).toBeInTheDocument();
        expect(screen.getByText("First due date")).toBeInTheDocument();
        expect(screen.getByText("New schedule")).toBeInTheDocument();
    });
});
