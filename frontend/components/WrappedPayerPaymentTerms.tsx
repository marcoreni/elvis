import React, { forwardRef, useImperativeHandle, useState } from "react";
import { toast } from "react-toastify";
import PayerPaymentTerms from "./PayerPaymentTerms";
import type {
    PaymentMethod,
    PaymentScheduleOption,
    PaymentTerms,
} from "./PayerPaymentTerms";
import PayerPaymentTermsInfo from "./PayerPaymentTermsInfo";
import { MESSAGES } from "../tools/constants";
import RichTextViewer from "./common/RichTextViewer";
import { isEmpty } from "../tools/validators";
import type { StepZillaStepInstance } from "./utils/ui/StepZilla";
import type { User } from "./utils/entities";

type Payer = Pick<
    User,
    "id" | "first_name" | "last_name" | "identification_number"
>;

interface WrappedPayerPaymentTermsProps {
    user: Payer & { birthday?: string };
    family?: Payer[];
    initialSelectedPayers: number[];
    paymentTerms: PaymentTerms;
    availPaymentScheduleOptions: PaymentScheduleOption[];
    availPaymentMethods: PaymentMethod[];
    paymentStepDisplayText?: string | null;
    informationalStepOnly?: boolean;
    displayIdentificationNumber?: boolean;
    onChangeIdentificationNumber?: (user: Payer, value: string) => void;
    onChangePaymentTerms?: (paymentScheduleOptionsId: number) => void;
    onChangeDayForCollection?: (dayIndex: number | undefined) => void;
    onChangePaymentMethod?: (paymentMethodId: number) => void;
    onChangePayers?: (payers: number[], eventUser: Payer) => void;
}

// Computes once from `user.birthday` -- the class version only ever derived this in its
// constructor, from the initial props, and never recomputed it later.
function computeIsMinor(birthday?: string): boolean {
    if (!birthday) return false;
    const today = new Date();
    const birthdayThisYear = new Date(
        new Date(birthday).setFullYear(today.getFullYear())
    );
    const age =
        today.getFullYear() -
        new Date(birthday).getFullYear() -
        (today < birthdayThisYear ? 1 : 0);
    return age < 18;
}

// Converted off a class component to stay in step with the rest of this batch, but still exposes
// `isValidated()` via `useImperativeHandle` -- the wizard (Wizard.jsx, via StepZilla) calls this
// on the active step to gate its "Next" button, and StepZilla's own ref-attachment check was
// widened (utils/ui/StepZilla.tsx) to also recognize a `forwardRef`-wrapped function component,
// not just an ES6 class -- see docs/KnownIssues.md.
const WrappedPayerPaymentTerms = forwardRef<
    StepZillaStepInstance,
    WrappedPayerPaymentTermsProps
>(function WrappedPayerPaymentTerms(
    {
        user,
        family,
        initialSelectedPayers,
        paymentTerms: initialPaymentTerms,
        availPaymentScheduleOptions,
        availPaymentMethods,
        paymentStepDisplayText,
        informationalStepOnly,
        displayIdentificationNumber,
        onChangeIdentificationNumber,
        onChangePaymentTerms,
        onChangeDayForCollection,
        onChangePaymentMethod,
        onChangePayers,
    },
    ref
) {
    const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>(() => ({
        payment_schedule_options_id:
            initialPaymentTerms.payment_schedule_options_id,
        day_for_collection: initialPaymentTerms.day_for_collection,
        payment_method_id: initialPaymentTerms.payment_method_id,
    }));
    const [isMinor] = useState(() => computeIsMinor(user.birthday));

    useImperativeHandle(
        ref,
        () => ({
            isValidated() {
                if (initialSelectedPayers.length === 0) {
                    toast.error(MESSAGES.err_must_have_payer, {
                        autoClose: 3000,
                    });
                    return false;
                }

                if (displayIdentificationNumber) {
                    for (const familyMember of [...(family || []), user]) {
                        if (
                            initialSelectedPayers.includes(familyMember.id) &&
                            isMinor &&
                            isEmpty(
                                (user.identification_number || "").replaceAll(
                                    /[_ ]/g,
                                    ""
                                )
                            )
                        ) {
                            return false;
                        }
                    }
                }

                if (informationalStepOnly) return true;

                if (
                    availPaymentMethods.length === 0 ||
                    availPaymentScheduleOptions.length === 0
                ) {
                    return true; // ignore this step if no payment methods or payment schedule options
                }

                if (
                    paymentTerms.day_for_collection != null &&
                    !!paymentTerms.payment_schedule_options_id &&
                    !!paymentTerms.payment_method_id
                ) {
                    return true;
                }

                toast.error(MESSAGES.err_must_select_payment_terms, {
                    autoClose: 3000,
                });
                return false;
            },
        }),
        [
            initialSelectedPayers,
            displayIdentificationNumber,
            family,
            user,
            isMinor,
            informationalStepOnly,
            availPaymentMethods,
            availPaymentScheduleOptions,
            paymentTerms,
        ]
    );

    function handleChangePaymentTerms(paymentScheduleOptionsId: number) {
        setPaymentTerms((prev) => ({
            ...prev,
            payment_schedule_options_id: paymentScheduleOptionsId,
        }));
        onChangePaymentTerms && onChangePaymentTerms(paymentScheduleOptionsId);
    }

    function handleChangeDayForCollection(dayIndex: number | undefined) {
        setPaymentTerms((prev) => ({ ...prev, day_for_collection: dayIndex }));
        onChangeDayForCollection && onChangeDayForCollection(dayIndex);
    }

    function handleChangePaymentMethod(paymentMethodId: number) {
        setPaymentTerms((prev) => ({
            ...prev,
            payment_method_id: paymentMethodId,
        }));
        onChangePaymentMethod && onChangePaymentMethod(paymentMethodId);
    }

    function handleChangePayers(payers: number[], eventUser: Payer) {
        onChangePayers && onChangePayers(payers, eventUser);
    }

    return (
        <div className="application-form" style={{ margin: 0 }}>
            <div className="row">
                {paymentStepDisplayText && (
                    <RichTextViewer
                        className="alert alert-info w-100 pre-wrap"
                        style={{
                            border: "1px solid #0079BF",
                            borderRadius: "5px",
                            color: "#0079BF",
                        }}
                        wysiwygStrData={paymentStepDisplayText}
                    />
                )}
            </div>

            {informationalStepOnly ? (
                availPaymentScheduleOptions &&
                availPaymentScheduleOptions.length > 0 && (
                    <PayerPaymentTermsInfo
                        availPaymentScheduleOptions={
                            availPaymentScheduleOptions
                        }
                    />
                )
            ) : (
                <PayerPaymentTerms
                    user={user}
                    family={family || []}
                    initialSelectedPayers={initialSelectedPayers || []}
                    paymentTerms={initialPaymentTerms}
                    availPaymentScheduleOptions={availPaymentScheduleOptions}
                    availPaymentMethods={availPaymentMethods}
                    onChangePaymentTerms={handleChangePaymentTerms}
                    onChangeDayForCollection={handleChangeDayForCollection}
                    onChangePaymentMethod={handleChangePaymentMethod}
                    onChangePayers={handleChangePayers}
                    displayIdentificationNumber={displayIdentificationNumber}
                    onChangeIdentificationNumber={onChangeIdentificationNumber}
                    isMinor={isMinor}
                />
            )}
        </div>
    );
});

export default WrappedPayerPaymentTerms;
