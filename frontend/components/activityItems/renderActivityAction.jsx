import React from "react";

function renderActivityAction(actionLabel, t) {
    const K = "activityApplications:activityItems.badges";

    switch (actionLabel) {
        case "Proposition acceptée":
            return (
                <React.Fragment>
                    <div className="badge badge-pill badge-success text-white">
                        <i className="fas fa-check-circle mr-2" />
                        {t(`${K}.proposalAccepted`)}
                    </div>
                </React.Fragment>
            );
        case "Cours proposé":
            return (
                <React.Fragment>
                    <div className="badge badge-pill badge-info text-white">
                        <i className="fas fa-info-circle mr-2" />
                        {t(`${K}.courseProposed`)}
                    </div>
                </React.Fragment>
            );
        case "Proposition refusée":
            return (
                <React.Fragment>
                    <div className="badge badge-pill badge-danger text-white">
                        <i className="fas fa-times-circle mr-2" />
                        {t(`${K}.proposalRefused`)}
                    </div>
                </React.Fragment>
            );
        case "Traitée":
            return (
                <React.Fragment>
                    <div className="badge badge-pill badge-success text-white">
                        <i className="fas fa-check-circle mr-2" />
                        {t(`${K}.courseAssigned`)}
                    </div>
                </React.Fragment>
            );
        case "En traitement":
            return (
                <React.Fragment>
                    <div
                        className="badge badge-pill badge-secondary text-white"
                        style={{ backgroundColor: "#676a6c" }}
                    >
                        <i className="fas fa-hourglass mr-2" />
                        {t(`${K}.pendingTreatment`)}
                    </div>
                </React.Fragment>
            );
        case "Arrêt":
            return (
                <React.Fragment>
                    <div
                        className="badge badge-pill badge-danger text-white"
                        style={{ backgroundColor: "#ff6f3c" }}
                    >
                        <i className="fas fa-times-circle mr-2" />
                        {t(`${K}.stopped`)}
                    </div>
                </React.Fragment>
            );
        case "Current":
            return (
                <React.Fragment>
                    <div className="badge badge-pill badge-success text-white">
                        <i className="fas fa-check-circle mr-2" />
                        {t(`${K}.current`)}
                    </div>
                </React.Fragment>
            );
        case "En cours de traitement":
            return (
                <React.Fragment>
                    <div
                        className="badge badge-pill badge-info text-white"
                        style={{ backgroundColor: "#676a6c" }}
                    >
                        <i className="fas fa-hourglass mr-2" />
                        {t(`${K}.inProgress`)}
                    </div>
                </React.Fragment>
            );
        case "Unsatisfied":
            return (
                <React.Fragment>
                    <div className="badge badge-pill badge-danger text-white">
                        <i className="fas  fa-times-circle mr-2" />
                        {t(`${K}.unsatisfied`)}
                    </div>
                </React.Fragment>
            );
        case "Sur liste d'attente":
            return (
                <React.Fragment>
                    <div className="badge badge-pill badge-info text-white">
                        <i className="fas fa-hourglass mr-2" />
                        {t(`${K}.waitlist`)}
                    </div>
                </React.Fragment>
            );
        default:
            return (
                <React.Fragment>
                    <div
                        className="badge badge-pill badge-secondary text-white"
                        style={{ backgroundColor: "#676a6c" }}
                    >
                        <i className="fas fa-hourglass mr-2" />
                        {t(`${K}.pendingTreatment`)}
                    </div>
                </React.Fragment>
            );
    }
}

export default renderActivityAction;
