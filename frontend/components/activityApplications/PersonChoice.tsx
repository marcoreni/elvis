import React from "react";
import { useTranslation } from "react-i18next";

interface PersonChoiceProps {
    personSelection?: "myself" | "other" | null;
    handleSelectPerson: (person: "myself" | "other") => void;
}

const PersonChoice = ({
    personSelection,
    handleSelectPerson,
}: PersonChoiceProps) => {
    const { t } = useTranslation("activityApplications");

    return (
        <div className="row">
            <div className="col-lg-4 col-lg-offset-4">
                <div className="ibox">
                    <div className="ibox-title">
                        <h3>{t("activityApplications:personChoice.title")}</h3>
                    </div>
                    <div className="ibox-content person_selection_container">
                        <div
                            className={`person_selection ${
                                personSelection == "myself" ? "selected" : null
                            }`}
                            onClick={() => handleSelectPerson("myself")}
                        >
                            <p>
                                {t("activityApplications:personChoice.myself")}
                            </p>
                        </div>
                        <div
                            className={`person_selection ${
                                personSelection == "other" ? "selected" : null
                            }`}
                            onClick={() => handleSelectPerson("other")}
                        >
                            <p>
                                {t("activityApplications:personChoice.other")}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PersonChoice;
