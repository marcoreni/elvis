import React from "react";
import moment from "moment";
import { useTranslation } from "react-i18next";

const PauseDetailModal = ({
                              pauseInterval,
                              closeModal,
                              onDelete,
                          }) => {
    const { t } = useTranslation("planning");

    if (!pauseInterval) {
        if (closeModal) {
            setTimeout(() => closeModal(), 0);
        }
        return null;
    }


    const formatTimeIfValid = (dateValue) => {
        try {
            if (dateValue && moment(dateValue).isValid()) {
                return moment(dateValue).format("HH[h]mm");
            }
            return t("pauseDetailModal.notDefined");
        } catch (error) {
            console.error("Erreur de formatage de date:", error);
            return t("pauseDetailModal.notDefined");
        }
    };

    const startTime = formatTimeIfValid(pauseInterval.start);
    const endTime = formatTimeIfValid(pauseInterval.end);

    return (
        <div>
            <h3>{t("pauseDetailModal.title")}</h3>
            <hr/>

            <p>
                {t("pauseDetailModal.start")} <b>{startTime}</b><br/>
                {t("pauseDetailModal.end")} <b>{endTime}</b>
            </p>

            {pauseInterval.comment && (
                <div className="alert alert-info">
                    <strong>{t("pauseDetailModal.comment")}</strong><br/>
                    {pauseInterval.comment.content}
                </div>
            )}

            <hr/>

            <div className="flex flex-space-between-justified">
                <button className="btn" onClick={closeModal} type="button">
                    <i className="fas fa-times m-r-sm"/>
                    {t("common.close")}
                </button>

                {pauseInterval.id && (
                    <button
                        className="btn btn-warning"
                        onClick={() => {
                            onDelete(pauseInterval.id);
                        }}
                        type="button"
                    >
                        <i className="fas fa-trash m-r-sm" />
                        {t("pauseDetailModal.deletePause")}
                    </button>
                )}
            </div>
        </div>
    );
};

export default PauseDetailModal;