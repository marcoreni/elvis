import React, { Fragment } from "react";
import { Field } from "react-final-form";
import { useTranslation } from "react-i18next";
import {
    composeValidators,
    required,
    isPhoneNumber,
    isPostalCode,
} from "../../tools/validators";
import Input from "../common/Input";
import InputSelect from "../common/InputSelect";
import SelectSameAs from "./SelectSameAs";
import { toRawPhoneNumber, prettifyPhoneNumber } from "../../tools/format";

const phoneTypeValues = ["portable", "domicile", "travail"];

const familyHasPhones = family => {
    if (Array.isArray(family) && family.length > 0) {
        for (const member of family) {
            for (const tel of member.telephones) {
                if (tel.number !== null) return true;
            }
        }
    }
};

export const TelephoneFields = ({
    ignoreValidate,
    fields,
    setSameAs,
    family,
    currentUser,
}) => {
    const { t } = useTranslation("users");
    const phoneTypes = phoneTypeValues.map(value => ({
        value,
        label: t(`users:userForm.phoneTypes.${value}`),
    }));

    if (!Array.isArray(family)) {
        family = Object.values(family);
    }
    return fields.map((field, i) => (
        <Fragment key={field}>
            {Array.isArray(family) && family.length > 0 && (
                <SelectSameAs
                    family={family}
                    format={obj => {
                        if (Array.isArray(obj)) {
                            const tel = obj.find(
                                tel => tel && tel.label && tel.number
                            );
                            return tel != undefined
                                ? `${tel.label} : ${tel.number}`
                                : undefined;
                        }

                        return obj && obj.label && obj.number
                            ? `${obj.label} : ${obj.number}`
                            : undefined;
                    }}
                    accessor="telephones"
                    setSameAs={value => setSameAs(i, value)}
                    currentUser={currentUser}
                />
            )}

            <div className="row">
                <div className="col-xs-12 col-md-8 pr-0">
                    <Field
                        name={`${field}.number`}
                        label={t("users:userForm.fields.phone")}
                        render={Input}
                        validate={
                            !ignoreValidate &&
                            composeValidators(required, isPhoneNumber)
                        }
                        required
                        maxLength={14}
                        parse={prettifyPhoneNumber}
                        format={prettifyPhoneNumber}
                    />
                </div>

                <div className="col-xs-12 col-md-4">
                    <Field
                        name={`${field}.label`}
                        label={t("users:userForm.fields.phoneType")}
                        render={InputSelect}
                        validate={!ignoreValidate && required}
                        required
                        options={phoneTypes}
                    />
                </div>

                {fields.length > 1 ? (
                    <div className="col-xs text-right">
                        <button
                            className="btn btn-sm btn-warning"
                            onClick={() => fields.remove(i)}
                        >
                            <i className="fas fa-trash" />
                            {t("common:actions.delete")}
                        </button>
                    </div>
                ) : null}
            </div>
        </Fragment>
    ));
};

export const AddressFields = ({
    ignoreValidate,
    fields,
    setSameAs,
    family,
    currentUser,
}) => {
    const { t } = useTranslation("users");

    return fields.map((field, i) => (
        <div key={field}>
            {Array.isArray(family) && family.length > 0 && (
                <SelectSameAs
                    family={family}
                    format={obj => {
                        if (Array.isArray(obj)) {
                            const address = obj.find(
                                address =>
                                    address &&
                                    address.street_address &&
                                    address.postcode &&
                                    address.city
                            );
                            return address != undefined
                                ? `${address.street_address}, ${address.postcode} ${address.city}`
                                : undefined;
                        }

                        return obj &&
                            obj.street_address &&
                            obj.postcode &&
                            obj.city
                            ? `${obj.street_address}, ${obj.postcode} ${obj.city}`
                            : undefined;
                    }}
                    accessor="addresses"
                    setSameAs={value => setSameAs(i, value)}
                    currentUser={currentUser}
                />
            )}

            <div className="row  mb-4">
                <div className="col-xs-12 col-md-5 col-xl-6 pr-0">
                    <Field
                        label={t("users:userForm.fields.address")}
                        name={`${field}.street_address`}
                        render={Input}
                        validate={!ignoreValidate && required}
                        required
                    />
                </div>

                <div className="col-xs-12 col-md-2 col-sm-3 pr-0">
                    <Field
                        label={t("users:userForm.fields.postcode")}
                        name={`${field}.postcode`}
                        type="text"
                        render={Input}
                        validate={
                            !ignoreValidate &&
                            composeValidators(required, isPostalCode)
                        }
                        required
                    />
                </div>

                <div className="col-xs-12 col-sm-4 col-md-3 col-xl-2">
                    <Field
                        label={t("users:userForm.fields.city")}
                        name={`${field}.city`}
                        render={Input}
                        validate={!ignoreValidate && required}
                        required
                    />
                </div>
                {fields.length > 1 ? (
                    <div
                        className="col-sm-12 col-lg-2 text-right"
                        style={{ marginTop: "2rem!important" }}
                    >
                        <button
                            type="button"
                            className="btn btn-sm btn-warning"
                            onClick={() => fields.remove(i)}
                        >
                            <i className="fas fa-trash" />{" "}
                            {t("common:actions.delete")}
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    ));
};
