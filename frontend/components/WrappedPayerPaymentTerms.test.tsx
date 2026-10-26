// Phase 4c: WrappedPayerPaymentTerms swapped its `paymentStepDisplayText` viewer from the old
// Draft.js-based `WysiwygViewer` to `RichTextViewer` -- a pure prop-compatible swap (same
// `wysiwygStrData`/`className`/`style` props), so the first two tests just confirm the content
// still renders.
//
// jsx-to-tsx batch 3 converted this off a class component to a forwardRef function component --
// `isValidated()` (called by the wizard through StepZilla, see utils/ui/StepZilla.tsx) is now
// exposed via `useImperativeHandle` instead of being a plain instance method. The tests below
// exercise that contract directly through a ref, and the `PayerPaymentTerms` stub exposes buttons
// for its 3 "onChange*" callbacks so the payment-terms-completeness branch of isValidated() can
// actually be driven to true.

import React, { createRef } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import WrappedPayerPaymentTerms from "./WrappedPayerPaymentTerms";
import StepZilla from "./utils/ui/StepZilla";
import type { StepZillaStepInstance } from "./utils/ui/StepZilla";

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));

vi.mock("react-toastify", () => ({ toast: { error: toastError } }));

vi.mock("./PayerPaymentTerms", () => ({
    default: ({
        onChangePaymentTerms,
        onChangeDayForCollection,
        onChangePaymentMethod,
    }: {
        onChangePaymentTerms?: (id: number) => void;
        onChangeDayForCollection?: (day: number) => void;
        onChangePaymentMethod?: (id: number) => void;
    }) => (
        <div>
            <button
                onClick={() => onChangePaymentTerms && onChangePaymentTerms(5)}
            >
                set-terms
            </button>
            <button
                onClick={() =>
                    onChangeDayForCollection && onChangeDayForCollection(2)
                }
            >
                set-day
            </button>
            <button
                onClick={() =>
                    onChangePaymentMethod && onChangePaymentMethod(7)
                }
            >
                set-method
            </button>
        </div>
    ),
}));
vi.mock("./PayerPaymentTermsInfo", () => ({
    default: () => <div>info-stub</div>,
}));

const user = { id: 1, first_name: "Ana", last_name: "Blin" };

const baseProps = {
    user,
    family: [],
    initialSelectedPayers: [1],
    paymentTerms: {},
    availPaymentScheduleOptions: [],
    availPaymentMethods: [],
    informationalStepOnly: true,
};

afterEach(() => {
    toastError.mockClear();
});

test("renders paymentStepDisplayText (plain HTML) through RichTextViewer", () => {
    render(
        <WrappedPayerPaymentTerms
            {...baseProps}
            paymentStepDisplayText="<p>Please pay on time</p>"
        />
    );

    expect(screen.getByText("Please pay on time")).toBeInTheDocument();
});

test("renders nothing extra when paymentStepDisplayText is absent", () => {
    const { container } = render(
        <WrappedPayerPaymentTerms
            {...baseProps}
            paymentStepDisplayText={null}
        />
    );

    expect(container.querySelector(".wysiwyg-viewer")).toBeNull();
});

test("renders PayerPaymentTermsInfo when informationalStepOnly and options exist", () => {
    render(
        <WrappedPayerPaymentTerms
            {...baseProps}
            informationalStepOnly
            availPaymentScheduleOptions={[{ id: 1, label: "Mensuel" }] as never}
        />
    );

    expect(screen.getByText("info-stub")).toBeInTheDocument();
});

test("exposes isValidated() via ref (class-era contract preserved under forwardRef)", () => {
    const ref = createRef<StepZillaStepInstance>();
    render(
        <WrappedPayerPaymentTerms
            {...baseProps}
            initialSelectedPayers={[]}
            ref={ref}
        />
    );

    // No payer selected -> invalid, with the "must have a payer" toast.
    expect(ref.current?.isValidated?.()).toBe(false);
    expect(toastError).toHaveBeenCalledTimes(1);
});

test("isValidated() is true outright when informationalStepOnly, regardless of payment terms", () => {
    const ref = createRef<StepZillaStepInstance>();
    render(
        <WrappedPayerPaymentTerms
            {...baseProps}
            informationalStepOnly
            ref={ref}
        />
    );

    expect(ref.current?.isValidated?.()).toBe(true);
});

test("isValidated() is true when there are no payment methods/schedule options to choose", () => {
    const ref = createRef<StepZillaStepInstance>();
    render(
        <WrappedPayerPaymentTerms
            {...baseProps}
            informationalStepOnly={false}
            availPaymentMethods={[]}
            availPaymentScheduleOptions={[]}
            ref={ref}
        />
    );

    expect(ref.current?.isValidated?.()).toBe(true);
});

test("isValidated() requires terms/day/method to be chosen once options exist, and reflects live edits", async () => {
    const ref = createRef<StepZillaStepInstance>();
    render(
        <WrappedPayerPaymentTerms
            {...baseProps}
            informationalStepOnly={false}
            availPaymentMethods={[{ id: 7, label: "Chèque" }]}
            availPaymentScheduleOptions={[{ id: 5, label: "Mensuel" }] as never}
            ref={ref}
        />
    );

    expect(ref.current?.isValidated?.()).toBe(false);
    expect(toastError).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ autoClose: 3000 })
    );

    await userEvent.click(screen.getByText("set-terms"));
    await userEvent.click(screen.getByText("set-day"));
    await userEvent.click(screen.getByText("set-method"));

    expect(ref.current?.isValidated?.()).toBe(true);
});

test("isValidated() blocks a minor payer with a missing identification number", () => {
    const ref = createRef<StepZillaStepInstance>();
    render(
        <WrappedPayerPaymentTerms
            {...baseProps}
            user={{
                ...user,
                birthday: "2015-01-01",
                identification_number: "",
            }}
            informationalStepOnly
            displayIdentificationNumber
            ref={ref}
        />
    );

    expect(ref.current?.isValidated?.()).toBe(false);
});

// Coverage gap closed per code-reviewer: `isValidated()` is proven in isolation above (via a
// direct ref), and `StepZilla.test.jsx` separately proves its ref-attachment check works for a
// generic forwardRef step -- but nothing tied the 2 halves together through the real wizard
// mechanism. This mounts `WrappedPayerPaymentTerms` as an actual `StepZilla` step and drives the
// "Next" button, the same path `Wizard.jsx` uses.
describe("WrappedPayerPaymentTerms as a real StepZilla step", () => {
    test("StepZilla's Next button is blocked while no payer is selected, and proceeds once one is", async () => {
        const steps = () => [
            {
                name: "Paiement",
                component: (
                    <WrappedPayerPaymentTerms
                        {...baseProps}
                        informationalStepOnly={false}
                        initialSelectedPayers={[]}
                        availPaymentMethods={[]}
                        availPaymentScheduleOptions={[]}
                    />
                ),
            },
            { name: "Suivant", component: <div>Next step reached</div> },
        ];

        const { rerender } = render(<StepZilla steps={steps()} />);

        await userEvent.click(screen.getByText("Next"));
        await waitFor(() => expect(toastError).toHaveBeenCalled());
        expect(screen.queryByText("Next step reached")).not.toBeInTheDocument();

        rerender(
            <StepZilla
                steps={[
                    {
                        name: "Paiement",
                        component: (
                            <WrappedPayerPaymentTerms
                                {...baseProps}
                                informationalStepOnly={false}
                                initialSelectedPayers={[1]}
                                availPaymentMethods={[]}
                                availPaymentScheduleOptions={[]}
                            />
                        ),
                    },
                    {
                        name: "Suivant",
                        component: <div>Next step reached</div>,
                    },
                ]}
            />
        );

        await userEvent.click(screen.getByText("Next"));
        await waitFor(() =>
            expect(screen.getByText("Next step reached")).toBeInTheDocument()
        );
    });
});
