import React from "react";
import { useTranslation } from "react-i18next";

export default function BulkEditModal({ id, onChange, onSubmit, }) {
    const { t } = useTranslation("payments");

    return <div className="modal inmodal"
        id={id}
        tabIndex="-1"
        role="dialog">
        <div className="modal-dialog">
            <div className="modal-content animated">
                <div className="modal-header">
                    <h2>{t("general.bulkEdit.title")}</h2>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <label htmlFor="bulk-due-date">{t("general.bulkEdit.dueDateLabel")}</label>
                        <input
                            onChange={e => onChange(e.target.name, e.target.value)}
                            className="form-control"
                            id="bulk-due-date"
                            name="previsional_date"
                            type="date"/>
                    </div>
                </div>
                <div className="modal-footer flex flex-space-between-justified">
                    <button
                        type="button"
                        className="btn"
                        data-dismiss="modal">
                        <i className="fas fa-times m-r-sm"></i>
                        {t("common:actions.cancel")}
                    </button>
                    <button
                        onClick={onSubmit}
                        className="btn btn-primary"
                        data-dismiss="modal">
                        <i className="fas fa-save m-r-sm"></i>
                        {t("common:actions.save")}
                </button>
                </div>
            </div>
        </div>
    </div>;
}
