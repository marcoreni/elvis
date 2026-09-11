import React from "react";
import { Field } from "react-final-form";
import { useTranslation } from "react-i18next";

const HandicapInfos = () => {
    const { t } = useTranslation("users");

    return (
        <div className="mb-4">
            <h3 style={{ color: "#8AA4B1" }}>
                {t("users:handicapInfos.title")}
            </h3>

            <Field
                name="handicap_description"
                component="textarea"
                className="form-control primary"
                placeholder={t("users:handicapInfos.placeholder")}
                style={{ borderRadius: "8px", height: "100px" }}
            />
        </div>
    );
};

export default HandicapInfos;
