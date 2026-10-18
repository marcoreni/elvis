import BaseParameters from "../BaseParameters";
import EvaluationLevels from "./EvaluationLevels";
import React from "react";
import { useTranslation } from "react-i18next";
import EvaluationSlot from "./EvaluationSlot";

// Used to `extends BaseParameters` purely to seed its state.tabsNames/divObjects in the
// constructor -- now that BaseParameters is a function component (can't be `extends`ed), pass
// them as props directly, matching PlanningsParameters/ActivitiesParameters/etc.
export default function EvaluationsParameters() {
    const { t } = useTranslation("parameters");

    return (
        <BaseParameters
            tabsNames={[
                t("evaluations.tabs.levels"),
                t("evaluations.tabs.slot"),
            ]}
            divObjects={[
                <EvaluationLevels
                    urlListData="/parameters/evaluations_parameters/list_levels"
                    urlNew="/evaluation_level_ref/new"
                />,
                <EvaluationSlot />,
            ]}
        />
    );
}
