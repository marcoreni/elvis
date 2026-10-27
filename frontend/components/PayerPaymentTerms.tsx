import React, { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ToggleButtonGroup from "./ToggleButtonGroup";
import Checkbox from "./common/Checkbox";
import { isEmpty } from "../tools/validators";
import Input from "./common/Input";
import type { User } from "./utils/entities";

// A "payer" is either the applicant or one of their family members -- both are plain Users as
// far as this component cares (id/name for display, identification_number for the Belgian
// national-ID step).
type Payer = Pick<
    User,
    "id" | "first_name" | "last_name" | "identification_number"
>;

export interface PaymentTerms {
    payment_schedule_options_id?: number;
    day_for_collection?: number;
    payment_method_id?: number;
}

export interface PaymentScheduleOption {
    id: number;
    label: string;
    payments_number: number;
    payments_months: number[];
    available_payments_days: number[];
}

export interface PaymentMethod {
    id: number;
    label: string;
}

interface PayersListEditorProps {
    user: Payer;
    selectedPayers: number[];
    family: Payer[];
    onAddPayer: (user: Payer) => void;
    onRemovePayer: (user: Payer) => void;
    displayIdentificationNumber?: boolean;
    onChangeIdentificationNumber?: (user: Payer, value: string) => void;
    isMinor?: boolean;
}

function PayersListEditor({
    user,
    selectedPayers,
    family,
    onAddPayer,
    onRemovePayer,
    displayIdentificationNumber,
    onChangeIdentificationNumber,
    isMinor,
}: PayersListEditorProps) {
    const { t } = useTranslation("payments");
    const family_with_user = [...family, user];
    return (
        <Fragment>
            {family_with_user.map((user) => {
                const isSelected = selectedPayers.includes(user.id);

                return (
                    <div className="row" key={user.id}>
                        <div className="col-xs-12 col-md-auto">
                            <Checkbox
                                id={user.id}
                                name="payer_id"
                                label={`${user.first_name} ${user.last_name}`}
                                input={{
                                    checked: isSelected,
                                    onChange: () => {
                                        if (isSelected) {
                                            onRemovePayer(user);
                                        } else {
                                            onAddPayer(user);
                                        }
                                    },
                                }}
                            />
                        </div>

                        {displayIdentificationNumber &&
                            isSelected &&
                            isMinor && (
                                <div className="col-xs-12 col-md">
                                    <label
                                        className="small"
                                        style={{ color: "#003E5C" }}
                                    >
                                        {t("terms.payer.identificationNumber")}
                                    </label>
                                    <Input
                                        name={`identification_number_${user.id}`}
                                        type="text"
                                        className="form-control"
                                        placeholder="85 07 30 033 28"
                                        mask="## ## ## ### ##"
                                        htmlOptions={{
                                            value: user.identification_number,
                                            onChange: (
                                                e: React.ChangeEvent<HTMLInputElement>
                                            ) =>
                                                onChangeIdentificationNumber &&
                                                onChangeIdentificationNumber(
                                                    user,
                                                    e.target.value
                                                ),
                                        }}
                                        meta={{
                                            error:
                                                isMinor &&
                                                isSelected &&
                                                isEmpty(
                                                    (
                                                        user.identification_number ||
                                                        ""
                                                    ).replaceAll(/[_ ]/g, "")
                                                )
                                                    ? "err_required"
                                                    : null,
                                            touched: true,
                                        }}
                                    />
                                </div>
                            )}
                    </div>
                );
            })}
        </Fragment>
    );
}

export interface PayerPaymentTermsProps {
    user: Payer;
    family: Payer[];
    initialSelectedPayers: number[];
    paymentTerms: PaymentTerms;
    availPaymentScheduleOptions: PaymentScheduleOption[];
    availPaymentMethods: PaymentMethod[];
    onChangePaymentTerms?: (paymentScheduleOptionsId: number) => void;
    onChangeDayForCollection?: (dayIndex: number | undefined) => void;
    onChangePaymentMethod?: (paymentMethodId: number) => void;
    onChangePayers?: (payers: number[], eventUser: Payer) => void;
    displayIdentificationNumber?: boolean;
    onChangeIdentificationNumber?: (user: Payer, value: string) => void;
    isMinor?: boolean;
}

export default function PayerPaymentTerms({
    user,
    family,
    initialSelectedPayers,
    paymentTerms,
    availPaymentScheduleOptions,
    availPaymentMethods,
    onChangePaymentTerms,
    onChangeDayForCollection,
    onChangePaymentMethod,
    onChangePayers,
    displayIdentificationNumber,
    onChangeIdentificationNumber,
    isMinor,
}: PayerPaymentTermsProps) {
    const { t } = useTranslation("payments");

    const [scheduleOptionChanged, setScheduleOptionChanged] = useState(
        paymentTerms.day_for_collection === undefined
    );
    const [selectedPaymentTermsId, setSelectedPaymentTermsId] = useState(
        paymentTerms.payment_schedule_options_id || 0
    );
    const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(
        paymentTerms.payment_method_id || 0
    );
    const [selectedDaysForCollection, setSelectedDaysForCollection] = useState(
        paymentTerms.day_for_collection !== undefined
            ? [paymentTerms.day_for_collection]
            : []
    );
    const [selectedPayers, setSelectedPayers] = useState(initialSelectedPayers);

    const selectedPaymentTerms = getSelectedPaymentTerms();
    const availableChoices = selectedPaymentTerms
        ? selectedPaymentTerms.available_payments_days.length
        : 0;

    function getSelectedPaymentTerms(id = selectedPaymentTermsId) {
        return availPaymentScheduleOptions.find((item) => item.id === id);
    }

    function handleScheduleOptionChange(
        e: React.ChangeEvent<HTMLSelectElement>
    ) {
        setScheduleOptionChanged(true);
        paymentTerms.payment_schedule_options_id = parseInt(e.target.value);
        setSelectedPaymentTermsId(paymentTerms.payment_schedule_options_id);
        onChangePaymentTerms &&
            onChangePaymentTerms(paymentTerms.payment_schedule_options_id);
    }

    function handleSelectMethodChange(e: React.ChangeEvent<HTMLSelectElement>) {
        paymentTerms.payment_method_id = parseInt(e.target.value);
        setSelectedPaymentMethodId(paymentTerms.payment_method_id);
        onChangePaymentMethod &&
            onChangePaymentMethod(paymentTerms.payment_method_id);
    }

    function handleDayChange(selectedDaysList: number[]) {
        paymentTerms.day_for_collection = selectedDaysList[0];
        onChangeDayForCollection &&
            onChangeDayForCollection(paymentTerms.day_for_collection);
    }

    function handleAddPayer(newSelectedPayers: Payer) {
        const payers = Array.from(
            new Set([...selectedPayers, newSelectedPayers.id])
        );
        setSelectedPayers(payers);
        onChangePayers && onChangePayers(payers, newSelectedPayers);
    }

    function handleRemovePayer(newSelectedPayers: Payer) {
        const payers = selectedPayers.filter(
            (payer) => payer !== newSelectedPayers.id
        );
        setSelectedPayers(payers);
        onChangePayers && onChangePayers(payers, newSelectedPayers);
    }

    useEffect(() => {
        if (!scheduleOptionChanged) return;

        if (selectedPaymentTerms) {
            if (availableChoices === 1) {
                setSelectedDaysForCollection([0]);
                handleDayChange([0]);
            } else {
                setSelectedDaysForCollection([]);
                handleDayChange([]);
            }
        }
        setScheduleOptionChanged(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPaymentTermsId, availableChoices]);

    return (
        <div className="row mt-4">
            {availPaymentMethods.length > 0 &&
            availPaymentScheduleOptions.length > 0 ? (
                <Fragment>
                    <div className="d-sm-inline-flex justify-content-between w-100">
                        <div className="col-md-6 p-0">
                            <div className="form-group">
                                <h3
                                    className="mb-4"
                                    style={{ color: "#8AA4B1" }}
                                >
                                    {t("terms.payer.paymentTerms")}
                                </h3>
                                <select
                                    className="form-control"
                                    name="payment_schedule_options_id"
                                    onChange={handleScheduleOptionChange}
                                    value={selectedPaymentTermsId}
                                    style={{ borderRadius: "8px", border: "0" }}
                                >
                                    <option key={-1} value="0">
                                        {t("terms.payer.chooseOption")}
                                    </option>
                                    {availPaymentScheduleOptions.map((apt) => (
                                        <option key={apt.id} value={apt.id}>
                                            {apt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {selectedPaymentTerms && (
                            <div className="col-md-5 p-0">
                                <div className="form-group">
                                    <h3
                                        className="m-2"
                                        style={{ color: "#8AA4B1" }}
                                    >
                                        {t("terms.payer.paymentDate")}
                                    </h3>
                                    <ToggleButtonGroup
                                        selected={selectedDaysForCollection}
                                        childrenContent={selectedPaymentTerms.available_payments_days.map(
                                            (day) => (
                                                <span key={day}> {day} </span>
                                            )
                                        )}
                                        onChange={handleDayChange}
                                        buttonClasses="p-0"
                                        buttonStyles={{
                                            height: "35px",
                                            width: "35px",
                                            borderRadius: "8px",
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="row ml-1 mb-4">
                        <div className="col-md-6 p-0 pr-3">
                            <h3 style={{ color: "#8AA4B1" }}>
                                {t("terms.payer.paymentMethods")}
                            </h3>
                            <select
                                className="form-control"
                                name="payment_method_id"
                                onChange={handleSelectMethodChange}
                                value={selectedPaymentMethodId}
                                style={{ borderRadius: "8px", border: "0" }}
                            >
                                <option key={-1} value="0">
                                    {t("terms.payer.chooseOption")}
                                </option>
                                {availPaymentMethods.map((apm) => (
                                    <option key={apm.id} value={apm.id}>
                                        {apm.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </Fragment>
            ) : (
                ""
            )}

            <div className="row ml-1">
                <div className="form-group m-t-md">
                    <h3 style={{ color: "#8AA4B1" }}>
                        {t("terms.payer.payers")}
                    </h3>
                    <PayersListEditor
                        user={user}
                        selectedPayers={selectedPayers}
                        family={family}
                        onAddPayer={handleAddPayer}
                        onRemovePayer={handleRemovePayer}
                        displayIdentificationNumber={
                            displayIdentificationNumber
                        }
                        onChangeIdentificationNumber={
                            onChangeIdentificationNumber
                        }
                        isMinor={isMinor}
                    />
                </div>
            </div>
        </div>
    );
}
