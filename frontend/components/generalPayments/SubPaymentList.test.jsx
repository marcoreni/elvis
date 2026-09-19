// Smoke test for SubPaymentList's migration off react-table v6 onto TanStackGrid
// (docs/Modernization-Roadmap.md item 13 batch 4b). No prior test file existed for this
// component. Data is passed in via props (no fetch involved), so this mounts the real component
// and asserts the real mounted table renders every translated column header plus a real data row
// -- including the `payment_method_id` -> `paymentMethods` lookup accessor and the
// `showPagination={false}`/`filterable={false}`/`sortable={false}` table-wide overrides this
// batch consolidated onto TanStackGrid.

import React from "react";
import { render, screen } from "@testing-library/react";
import i18n from "../../i18n";
import SubPaymentList from "./SubPaymentList";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

const PAYMENT_METHODS = [{ id: 1, label: "Chèque" }];

const DATA = [
    {
        id: 1,
        payment_method_id: 1,
        reception_date: "2026-01-05",
        cashing_date: "2026-01-10",
        check_number: "12345",
        check_issuer_name: "Dupont",
        amount: 50,
        operation: "credit",
    },
];

describe("SubPaymentList", () => {
    test("renders the translated column headers and one real row in fr", async () => {
        await i18n.changeLanguage("fr");
        render(<SubPaymentList data={DATA} paymentMethods={PAYMENT_METHODS} />);

        for (const header of [
            "Mode de règlement",
            "Réception",
            "Encaissement",
            "N° du Chèque",
            "Émetteur du chèque",
            "Montant",
        ]) {
            expect(screen.getByText(header)).toBeInTheDocument();
        }

        expect(screen.getByText("Chèque")).toBeInTheDocument();
        expect(screen.getByText("05-01-2026")).toBeInTheDocument();
        expect(screen.getByText("10-01-2026")).toBeInTheDocument();
        expect(screen.getByText("12345")).toBeInTheDocument();
        expect(screen.getByText("Dupont")).toBeInTheDocument();
        expect(screen.getByText("(credit) 50 €")).toBeInTheDocument();
    });

    test("falls back to the unspecified/unknown translations in en when a row has no method/issuer", async () => {
        await i18n.changeLanguage("en");
        render(
            <SubPaymentList
                data={[{ id: 2, amount: 0, operation: "debit" }]}
                paymentMethods={PAYMENT_METHODS}
            />
        );

        expect(screen.getAllByText("Not specified")).toHaveLength(2);
        expect(screen.getByText("Unknown")).toBeInTheDocument();
        expect(screen.getByText("(debit) # €")).toBeInTheDocument();
    });

    test("showPagination={false}/filterable={false} hide the footer and filter inputs", async () => {
        await i18n.changeLanguage("fr");
        render(<SubPaymentList data={DATA} paymentMethods={PAYMENT_METHODS} />);

        expect(
            screen.queryByRole("button", { name: "Précédent" })
        ).not.toBeInTheDocument();
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
});
