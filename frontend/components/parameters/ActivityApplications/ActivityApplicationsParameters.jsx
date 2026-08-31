import BaseParameters from "../BaseParameters";
import React from "react";
import {useTranslation} from "react-i18next";
import ApplicationStatusTable from "./ApplicationStatusTable";
import ConsentDocumentsList from "./ConsentDocumentsList";
import ApplicationParameters from "./ApplicationParameters";
import ApplicationStepParameters from "./ApplicationStepParameters";

export default function ActivityApplicationsParameters() {
    const {t} = useTranslation("parameters");

    return <BaseParameters
        tabsNames={[
            t("activityApplications.tabs.statuses"),
            t("activityApplications.tabs.consentDocuments"),
            t("activityApplications.tabs.applicationSettings"),
            t("activityApplications.tabs.applicationPath")
        ]}
        divObjects={[
            <ApplicationStatusTable />,
            <ConsentDocumentsList />,
            <ApplicationParameters />,
            <div>
                {/*Liste des messages modifiables dans les paramètres de parcours d'inscription (update or create)*/}
                <ApplicationStepParameters
                    key='pricing_info'
                    parameter_label='pricing_info_application'
                    desc={t("activityApplications.stepDesc.pricing")}
                />
                <hr></hr>
                <ApplicationStepParameters
                    key='availability_info'
                    parameter_label='availability_info_application'
                    desc={t("activityApplications.stepDesc.availability")}
                />
            </div>
        ]}
    />
}
