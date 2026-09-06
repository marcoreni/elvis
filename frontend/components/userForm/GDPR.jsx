import React from "react";
import { Field } from "react-final-form";
import { Trans, useTranslation } from "react-i18next";
import { agreement } from "../../tools/validators";
import AlertCheckbox from "../common/AlertCheckbox";

const GDPR = ({ shouldCheckGdpr, ignoreValidate, schoolName }) => {
    const { t } = useTranslation("users");

    return (
        <div>
            <Field
                id="GDPR"
                name="checked_gdpr"
                type="checkbox"
                alertType="info"
                component={AlertCheckbox}
                ignoreValidate={ignoreValidate}
                text={
                    <Trans
                        t={t}
                        i18nKey="users:consent.gdpr"
                        values={{ schoolName }}
                        components={{ cgu: <a href="/cgu" /> }}
                    />
                }
            />
        </div>
    );
};

export default GDPR;
