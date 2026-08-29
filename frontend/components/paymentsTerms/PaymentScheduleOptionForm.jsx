import React, { Fragment, useState } from "react";
import ToggleButtonGroup from "../ToggleButtonGroup";
import { MONTHS } from "../../tools/constants";
import swal from "sweetalert2";
import { toast } from "react-toastify";
import * as api from "../../tools/api";
import { PAYMENT_SCHEDULE_OPTIONS_PAYMENTS_NUMBERS } from "../advancedSearch/utils";
import { useTranslation } from "react-i18next";

export default function PaymentScheduleOptionForm({ paymentScheduleOption, action, return_url, method, pricingCategories }) {
    const { t } = useTranslation("payments");
    if (paymentScheduleOption) {
        if (!PAYMENT_SCHEDULE_OPTIONS_PAYMENTS_NUMBERS.map(opt => opt.nb).includes(paymentScheduleOption.payments_number)) {
            paymentScheduleOption.other_payments_number = paymentScheduleOption.payments_number;
            paymentScheduleOption.payments_number = 0;
        }
    }

    const [statedPaymentScheduleOption, setStatedPaymentScheduleOption] = useState(paymentScheduleOption || {});

    const onMonthSelected = selected => {

        const effectivePaymentsNumber = statedPaymentScheduleOption.payments_number === 0 ?
            statedPaymentScheduleOption.other_payments_number || 12
            :
            statedPaymentScheduleOption.payments_number;

        if (selected.length <= effectivePaymentsNumber) {
            const newStatedPaymentScheduleOption = { ...statedPaymentScheduleOption };

            newStatedPaymentScheduleOption.payments_months = selected;
            setStatedPaymentScheduleOption(newStatedPaymentScheduleOption);

            return true;
        }

        return false;
    };

    const onDayForCollectionAdd = () => {
        swal({
            title: t("terms.optionForm.addDayTitle"),
            text: t("terms.optionForm.addDayPrompt"),
            input: "number",
            showCancelButton: true,
            confirmButtonText: t("common:actions.add"),
            cancelButtonText: t("common:actions.cancel"),
            inputValidator: (value) => {
                if (!value) {
                    return t("terms.optionForm.addDayEmpty");
                } else if (value < 1 || value > 31) {
                    return t("terms.optionForm.addDayInvalid");
                }
            },
        }).then((result) => {
            if (result.value) {
                const newStatedPaymentScheduleOption = { ...statedPaymentScheduleOption };

                newStatedPaymentScheduleOption.available_payments_days = newStatedPaymentScheduleOption.available_payments_days || [];
                newStatedPaymentScheduleOption.available_payments_days.push(parseInt(result.value));
                setStatedPaymentScheduleOption(newStatedPaymentScheduleOption);
            }
        });
    };

    /**
     * @param {FormDataEvent<HTMLFormElement>} e
     */
    const submit = (e) => {
        if ((statedPaymentScheduleOption.available_payments_days || []).length === 0) {
            toast.error(t("terms.optionForm.needOneDay"), {
                autoClose: 3000,
            });
            return;
        }

        if ((statedPaymentScheduleOption.payments_months || []).length !== (statedPaymentScheduleOption.payments_number || parseInt(statedPaymentScheduleOption.other_payments_number))) {
            toast.error(t("terms.optionForm.needMonthPerDue"), {
                autoClose: 3000,
            });
            return;
        }

        const valueToSend = {
            payment_schedule_option: {
                ...statedPaymentScheduleOption,
                payments_number: statedPaymentScheduleOption.payments_number === 0 ? statedPaymentScheduleOption.other_payments_number : statedPaymentScheduleOption.payments_number,
                other_payments_number: undefined,
            },
        };

        console.log("valueToSend", valueToSend);

        const apiAction = api.set()
            .success(res => {
                window.location = return_url;
            })
            .error(res => {
                swal({
                    title: t("general.reminder.errorTitle"),
                    text: res.error,
                    type: "error",
                    confirmButtonText: t("terms.optionForm.close"),
                });
            });

        method = method == "delete" ? "del" : method || "post";

        apiAction[method](action, valueToSend);
    };

    return <Fragment>
        <div className="row wrapper border-bottom white-bg page-heading m-b-md">
            <h2>
                {statedPaymentScheduleOption.id ? t("terms.optionForm.editTitle", { label: paymentScheduleOption.label }) : t("terms.optionForm.addTitle")}
            </h2>
        </div>

        <form
            onSubmit={e => {
                e.preventDefault();
                submit(e);
            }}
        >
            <div className="row mb-3">
                <div className={"col-md-12"}>
                    <h4>{t("terms.optionForm.nameLabel")} <span className={"text-danger"}>*</span></h4>
                    <input
                        type={"text"}
                        className={"form-control"}
                        value={statedPaymentScheduleOption.label}
                        required
                        onChange={e => setStatedPaymentScheduleOption({
                            ...statedPaymentScheduleOption,
                            label: e.target.value,
                        })}
                    />
                </div>
            </div>

            <div className="row mb-3">
                <div className={"col-md-12"}>
                    <h4>{t("terms.optionForm.numberOfDues")} <span className={"text-danger"}>*</span></h4>

                    <select
                        className="custom-select form-control"
                        required
                        value={statedPaymentScheduleOption.payments_number}
                        onChange={e => setStatedPaymentScheduleOption({
                            ...statedPaymentScheduleOption,
                            payments_number: parseInt(e.target.value),
                        })}
                    >
                        <option key={null} value={null}></option>
                        {PAYMENT_SCHEDULE_OPTIONS_PAYMENTS_NUMBERS.map(opt => <option key={opt.nb} value={opt.nb}>{opt.label}</option>)}
                        <option key={0} value={0}>{t("terms.optionForm.other")}</option>
                    </select>
                </div>
            </div>

            {statedPaymentScheduleOption.payments_number === 0 && <div className="row mb-3">
                <div className={"col-md-12"}>
                    <h4>{t("terms.optionForm.other")} <span className={"text-danger"}>*</span></h4>
                    <input
                        type={"number"}
                        min={1}
                        max={12}
                        className={"form-control"}
                        value={statedPaymentScheduleOption.other_payments_number}
                        onChange={e => setStatedPaymentScheduleOption({
                            ...statedPaymentScheduleOption,
                            other_payments_number: e.target.value,
                        })}
                    />
                </div>
            </div>}

            <div className="row mb-5">
                <div className={"col-md-12"}>
                    <h4>{t("terms.optionForm.associatedPricing")} </h4>
                    <small>{t("terms.optionForm.associatedPricingHelp")}</small>

                    <select
                        className="custom-select form-control"
                        value={statedPaymentScheduleOption.pricing_category_id}
                        onChange={e => setStatedPaymentScheduleOption({
                            ...statedPaymentScheduleOption,
                            pricing_category_id: parseInt(e.target.value),
                        })}
                    >
                        <option key={0} value={null}>{t("terms.optionForm.none")}</option>
                        {pricingCategories.map(pricingCategory => <option key={pricingCategory.id} value={pricingCategory.id}>{pricingCategory.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="row">
                <div className={"col-md-12"}>
                    <h4>{t("terms.optionForm.selectMonths")}</h4>

                    <ToggleButtonGroup
                        maxSelected={statedPaymentScheduleOption.payments_number === 0 ? statedPaymentScheduleOption.other_payments_number || 12 : statedPaymentScheduleOption.payments_number}
                        onChange={onMonthSelected}
                        selected={statedPaymentScheduleOption.payments_months || []}
                        childrenContent={MONTHS.map((month, i) => renderMonthInGroup(month))}
                        buttonStyles={{
                            width: "100px",
                            height: "75px",
                            backgroundColor: "white",
                        }}
                    />
                </div>
            </div>

            <div className={"row mt-5"}>
                <div className={"col-md-12"}>
                    <h4>{t("terms.optionForm.collectionDay")}</h4>
                </div>

                <div className={"col-md-12 mt-3"}>
                    {t("terms.optionForm.collectionDayHelp")}
                </div>

                <div className={"col-md-12 mt-3 text-right"}>
                    <button className={"btn btn-primary"} onClick={onDayForCollectionAdd} type={"button"}>
                        <i className={"fa fa-plus"} /> {t("terms.optionForm.addDayTitle")}
                    </button>
                </div>
            </div>

            <div className="row mt-2">
                {statedPaymentScheduleOption && statedPaymentScheduleOption.available_payments_days && statedPaymentScheduleOption.available_payments_days.sort((a, b) => a - b).map((day, i) =>
                    <div key={i} className={"col-sm-12"}>
                        <DayForCollectionItem day={day} onDelete={day => setStatedPaymentScheduleOption({
                            ...statedPaymentScheduleOption,
                            available_payments_days: statedPaymentScheduleOption.available_payments_days.filter(d => d !== day),
                        })} />
                    </div>)}
            </div>

            <div className="row mt-4">
                <div className={"col-md-12 text-right"}>
                    <button type="submit" className={"btn btn-primary"}>
                        {t("common:actions.save")}
                    </button>
                </div>
            </div>
        </form>
    </Fragment>;
}

function renderMonthInGroup(month) {
    return <div className="d-block">
        <i className="w-100 fas fa-calendar-alt" />
        <span className="d-block w-100 text-center">{month}</span>
    </div>;
}

function DayForCollectionItem({ day, onDelete }) {
    return <div className="row bg-white mx-0 my-3">
        <div className="col-sm-11 btn-lg">
            <strong>{day}</strong>
        </div>

        <div className="col-sm-1 text-right btn btn-lg" onClick={() => onDelete(day)}>
            <i className="fas fa-times" />
        </div>
    </div>;
}