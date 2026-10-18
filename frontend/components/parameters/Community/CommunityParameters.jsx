import React from "react";
import { useTranslation } from "react-i18next";
import MergeUsers from "../../scripts/mergeUsers/MergeUsers";
import BaseParameters from "../BaseParameters";

// Used to `extends BaseParameters` purely to seed its state.tabsNames/divObjects in the
// constructor -- now that BaseParameters is a function component (can't be `extends`ed), pass
// them as props directly, matching PlanningsParameters/ActivitiesParameters/etc.
export default function CommunityParameters({ season }) {
    const { t } = useTranslation("parameters");

    return (
        <BaseParameters
            tabsNames={[t("community.tabs.mergeUsers")]}
            divObjects={[<MergeUsers season={season} />]}
        />
    );
}
