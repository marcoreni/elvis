import React from "react";
import _ from "lodash";
import { useTranslation } from "react-i18next";

const ActivitiesApplicationsDashboard = ({
    adherentCount,
    applicationCount,
    processedApplicationsCount,
    processingApplicationsCount,
}) => {
    const { t } = useTranslation("activityApplications");
    return (
        <div className="m-b-sm signup-widget-list">
            <Widget
                title={t("activityApplications:dashboard.totalMembersRequests")}
                value={`${adherentCount} / ${applicationCount}`}
                small={true}
            />
            <Widget
                title={t("activityApplications:dashboard.awaitingProcessing")}
                value={
                    applicationCount -
                    processedApplicationsCount -
                    processingApplicationsCount
                }
                icon="clock"
            />
            <Widget
                title={t("activityApplications:dashboard.inProcessing")}
                value={processingApplicationsCount}
                icon="hourglass-half"
            />
            <Widget
                title={t("activityApplications:dashboard.processedRequests")}
                value={processedApplicationsCount}
                icon="check"
            />
        </div>
    );
};

const Widget = ({ title, value, icon, small = false }) => (
    <section className={`widget signup-widget white-bg ${small ? "" : ""}`}>
        <h1 className="widget-title">{title}</h1>
        <div className="widget-content">
            <h2 className="font-bold">{value}</h2>
            {icon && <i className={`fas fa-${icon} fa-2x`} />}
        </div>
    </section>
);

export default ActivitiesApplicationsDashboard;
