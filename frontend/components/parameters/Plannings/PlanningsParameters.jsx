import BaseParameters from "../BaseParameters";
import React from "react";
import {useTranslation} from "react-i18next";
import TeacherAvailabilities from "./TeacherAvailabilities";
import SchoolAvailabilities from "./SchoolAvailabilities";
import CancelActivityParameters from "./CancelActivityParameters";
import PlanningDisplayParameters from "./PlanningDisplayParameters";

export default function PlanningsParameters({planningId, auth_token, seasons, availabilityChecked})
{
    const {t} = useTranslation("parameters");

    return <BaseParameters
        tabsNames={[
            t("plannings.tabs.schoolAvailability"),
            t("plannings.tabs.teachers"),
            t("plannings.tabs.cancelActivity"),
            t("plannings.tabs.displaySettings")
        ]}
        divObjects={[
            <SchoolAvailabilities planningId={planningId} authToken={auth_token} seasons={seasons} />,
            <TeacherAvailabilities defaultChecked={availabilityChecked} />,
            <CancelActivityParameters />,
            <PlanningDisplayParameters />
        ]}
    />
}
