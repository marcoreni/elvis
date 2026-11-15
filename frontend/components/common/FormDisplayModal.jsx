import React from "react";
import Modal from "react-modal";
import { useTranslation } from "react-i18next";
import EvaluationForm from "../evaluation/EvaluationForm";

export default function QuestionnaireModal({
    header,
    isOpen = false,
    loading = false,
    className = "col-lg-4 col-xs-12",
    onRequestClose,
    ...formProps
}) {
    const { t } = useTranslation();
    const resolvedHeader = header ?? (
        <h1>{t("questionnaireModal.defaultTitle")}</h1>
    );
    return (
        <Modal
            isOpen={isOpen}
            className={className}
            ariaHideApp={false}
            onRequestClose={onRequestClose}
        >
            <div className="loader-wrap">
                {loading && (
                    <div className="loader">
                        {t("questionnaireModal.loading")}
                    </div>
                )}
                <div className={"ibox " + (loading ? "loading" : "")}>
                    {resolvedHeader}
                    <div className="ibox-content">
                        {loading || <EvaluationForm {...formProps} />}
                    </div>
                </div>
                <div className="ibox-footer flex flex-space-between-justified m-t">
                    <button
                        className="btn"
                        style={{ marginRight: "auto" }}
                        type="button"
                        onClick={onRequestClose}
                    >
                        <i className="fas fa-times m-r-sm"></i>
                        {t("actions.close")}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
