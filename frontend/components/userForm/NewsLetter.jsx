import React from "react";
import { useTranslation } from "react-i18next";
import AlertYesNoRadio from "../common/AlertYesNoRadio";

const NewsLetter = ({ ignoreValidate, schoolName }) => {
    const { t } = useTranslation("users");

    return (
        <AlertYesNoRadio
            name="checked_newsletter"
            alertType="info"
            ignoreValidate={ignoreValidate}
            text={t("users:consent.newsletter", { schoolName })}
        />
    );
};

export default NewsLetter;
