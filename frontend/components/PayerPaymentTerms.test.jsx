// i18n extraction test for PayerPaymentTerms + PayerPaymentTermsInfo (i18n-06 payments lot 2d).
// Both are plain function components using useTranslation("payments").

import React, { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../i18n";
import PayerPaymentTerms from "./PayerPaymentTerms";
import PayerPaymentTermsInfo from "./PayerPaymentTermsInfo";

// @react-input/mask needs real ticks between keystrokes to validate the input's
// selection state (it polls via setTimeout while focused) -- userEvent.type's
// default zero-delay firing races that and only the first character "sticks".
const TYPE_OPTIONS = { delay: 10 };

// The identification-number field is controlled by the parent (`user.identification_number`
// passed back through `onChangeIdentificationNumber`), so the harness needs to actually hold
// that state and feed it back in, like the real caller does, instead of a static prop.
function ControlledPayerPaymentTerms(props) {
    const [identificationNumber, setIdentificationNumber] = useState(
        props.user.identification_number
    );
    return (
        <PayerPaymentTerms
            {...props}
            user={{
                ...props.user,
                identification_number: identificationNumber,
            }}
            onChangeIdentificationNumber={(user, value) =>
                setIdentificationNumber(value)
            }
        />
    );
}

const scheduleOptions = [
    {
        id: 1,
        label: "Mensuel",
        available_payments_days: [5, 15],
        payments_number: 10,
        payments_months: [],
        available_payments_days: [5],
    },
];

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("PayerPaymentTerms", () => {
    const props = {
        user: { id: 1, first_name: "Ana", last_name: "Blin" },
        family: [],
        initialSelectedPayers: [],
        paymentTerms: {},
        availPaymentScheduleOptions: scheduleOptions,
        availPaymentMethods: [{ id: 1, label: "Chèque" }],
    };

    test("French headings by default", async () => {
        await i18n.changeLanguage("fr");
        render(<PayerPaymentTerms {...props} />);

        expect(screen.getByText("Modalités de paiement")).toBeInTheDocument();
        expect(screen.getByText("Moyens de paiement")).toBeInTheDocument();
        expect(screen.getByText("Payeur(s)")).toBeInTheDocument();
        expect(
            screen.getAllByText("Choisissez une option").length
        ).toBeGreaterThan(0);
    });

    test("English headings when active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<PayerPaymentTerms {...props} />);

        await waitFor(() =>
            expect(screen.getByText("Payment terms")).toBeInTheDocument()
        );
        expect(screen.getByText("Payment methods")).toBeInTheDocument();
        expect(screen.getByText("Payer(s)")).toBeInTheDocument();
    });
});

// Coverage for the Belgian national-ID masked field (react-input-mask -> @react-input/mask
// migration). Only rendered for a selected, minor payer when displayIdentificationNumber is set.
describe("PayerPaymentTerms identification number mask", () => {
    const minorProps = {
        user: {
            id: 1,
            first_name: "Ana",
            last_name: "Blin",
            identification_number: "",
        },
        family: [],
        initialSelectedPayers: [1],
        paymentTerms: {},
        availPaymentScheduleOptions: [],
        availPaymentMethods: [],
        displayIdentificationNumber: true,
        isMinor: true,
    };

    beforeEach(async () => {
        await i18n.changeLanguage("fr");
    });

    test("a fully blank field is flagged required", () => {
        render(<ControlledPayerPaymentTerms {...minorProps} />);

        expect(
            screen.getByText("Cette information est requise.")
        ).toBeInTheDocument();
    });

    test("typing any digit clears the required error", async () => {
        render(<ControlledPayerPaymentTerms {...minorProps} />);

        const input = screen.getByPlaceholderText("85 07 30 033 28");
        await userEvent.type(input, "8", TYPE_OPTIONS);

        expect(
            screen.queryByText("Cette information est requise.")
        ).not.toBeInTheDocument();
    });

    test("typing a full national ID formats it with the mask's literal spaces", async () => {
        render(<ControlledPayerPaymentTerms {...minorProps} />);

        const input = screen.getByPlaceholderText("85 07 30 033 28");
        await userEvent.type(input, "85073003328", TYPE_OPTIONS);

        expect(input.value).toBe("85 07 30 033 28");
    });

    test("not displayed for a non-minor payer", () => {
        render(<ControlledPayerPaymentTerms {...minorProps} isMinor={false} />);

        expect(
            screen.queryByPlaceholderText("85 07 30 033 28")
        ).not.toBeInTheDocument();
    });
});

describe("PayerPaymentTermsInfo", () => {
    test("French, pluralised option word", async () => {
        await i18n.changeLanguage("fr");
        render(
            <PayerPaymentTermsInfo
                availPaymentScheduleOptions={scheduleOptions}
            />
        );

        expect(screen.getByText("Type de paiement")).toBeInTheDocument();
        expect(
            screen.getByText(
                "Nous proposons 1 option d'échéancier de paiement :"
            )
        ).toBeInTheDocument();
    });

    test("English", async () => {
        await i18n.changeLanguage("en");
        render(
            <PayerPaymentTermsInfo
                availPaymentScheduleOptions={[
                    scheduleOptions[0],
                    { ...scheduleOptions[0], id: 2 },
                ]}
            />
        );

        await waitFor(() =>
            expect(screen.getByText("Payment type")).toBeInTheDocument()
        );
        expect(
            screen.getByText("We offer 2 payment-schedule options:")
        ).toBeInTheDocument();
    });
});
