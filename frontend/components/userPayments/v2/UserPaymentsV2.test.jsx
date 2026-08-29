// i18n extraction test for userPayments/v2/UserPaymentsV2 (i18n-06 payments lot 2d). Function
// component; fetches on mount via tools/api, which is mocked to a no-op chain. PaymentTermsSettingModal
// is mocked (it also fetches). Assertions cover the synchronously-rendered headings + column labels.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import i18n from "../../../i18n";
import UserPaymentsV2 from "./UserPaymentsV2";

vi.mock("../../../tools/api", () => {
    const chain = {
        success: () => chain,
        error: () => chain,
        get: () => chain,
        patch: () => chain,
        post: () => chain,
    };
    return { set: () => chain };
});
vi.mock("./PaymentTermsSettingModal", () => ({
    default: ({ children }) => <button>{children}</button>,
}));

const props = {
    seasons: [{ id: 1, label: "2024-2025", start: "2024-09-01" }],
    user: { id: 3, full_name: "Léa Roy" },
    is_current_user: false,
};

beforeEach(() => localStorage.clear());
afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("userPayments/v2/UserPaymentsV2", () => {
    test("French strings by default", async () => {
        await i18n.changeLanguage("fr");
        render(<UserPaymentsV2 {...props} />);

        expect(
            screen.getByRole("heading", { name: "Règlements de Léa Roy" })
        ).toBeInTheDocument();
        expect(screen.getByText("Vos informations générales")).toBeInTheDocument();
        expect(screen.getByText("Vos modalités de paiement")).toBeInTheDocument();
        expect(screen.getByText("Activités")).toBeInTheDocument();
    });

    test("English strings when active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<UserPaymentsV2 {...props} />);

        await waitFor(() =>
            expect(
                screen.getByRole("heading", { name: "Payments for Léa Roy" })
            ).toBeInTheDocument()
        );
        expect(screen.getByText("Your general information")).toBeInTheDocument();
        expect(screen.getByText("Your payment terms")).toBeInTheDocument();
        expect(screen.getByText("Activities")).toBeInTheDocument();
    });
});
