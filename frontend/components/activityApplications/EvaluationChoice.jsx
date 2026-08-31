import React from "react";
import { useTranslation } from "react-i18next";

import ItemPreferences from "./ItemPreferences";

export default function EvaluationChoice({ data, activityRefs, noIntervalMessage, ...prefsProps }) {
    const { t } = useTranslation("activityApplications");
    const noInterval = noIntervalMessage ?? t("evaluationChoice.noIntervalMessage");
    const choices = data.map(({refId, timeInterval, teacher}) => {
        const ref = activityRefs.find(ref => ref.id == refId);

        return (
            <div key={refId}>
                <h4>{t("evaluationChoice.forKind", { kind: ref.kind })}</h4>
                {
                    timeInterval ? <ItemPreferences
                    sortable={false}
                    showDate
                    items={[{...timeInterval, teacher}]}
                    {...prefsProps} /> :
                    <p className="text-danger font-bold">
                        {noInterval}
                    </p>
                }
            </div>
        );
    });

    return <div className="ibox">
        <div className="ibox-title">
            <h4>{t("evaluationChoice.selectedSlots")}</h4>
        </div>
        <div className="ibox-content">
            {choices}
        </div>
    </div>
};