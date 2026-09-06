import React from "react";
import { useTranslation } from "react-i18next";
import AlertYesNoRadio from "../common/AlertYesNoRadio";

const ImageRight = ({ ignoreValidate, schoolName }) => {
    const { t } = useTranslation("users");

    return (
        <AlertYesNoRadio
            name="checked_image_right"
            alertType="info"
            ignoreValidate={ignoreValidate}
            text={t("users:consent.imageRight", { schoolName })}
        />
    );
};

export default ImageRight;
