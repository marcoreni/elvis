import React from "react";
import { Field } from "react-final-form";
import { useTranslation } from "react-i18next";
import { MESSAGES } from "../../tools/constants";

export default function InlineYesNoRadio({ label, ...fieldProps }) {
    const { t } = useTranslation("common");
    const yesId = fieldProps.name + "-yes";
    const noId = fieldProps.name + "-no";

    return (
        <div>
            <div className="yes-no-group">
                <label className="m-r-sm col-sm-4">{label}</label>
                <label className="yes-no-radio yes">
                    <Field
                        {...fieldProps}
                        id={yesId}
                        type="radio"
                        component="input"
                        value="true"
                    />
                    <label htmlFor={yesId}>{t("common:yesNo.yes")}</label>
                </label>
                <label className="yes-no-radio no">
                    <Field
                        {...fieldProps}
                        id={noId}
                        type="radio"
                        component="input"
                        value="false"
                    />
                    <label htmlFor={noId}>{t("common:yesNo.no")}</label>
                </label>
            </div>
            <Field
                name={fieldProps.name}
                subscription={{ touched: true, error: true }}
                render={({ meta: { touched, error } }) =>
                    touched && error ? (
                        <div className="text-danger text-center">
                            {MESSAGES[error]}
                        </div>
                    ) : null
                }
            />
        </div>
    );
}
