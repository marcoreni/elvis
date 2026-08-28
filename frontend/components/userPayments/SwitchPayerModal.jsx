import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { optionMapper, USER_OPTIONS } from "../utils";

export default function SwitchPayerModal({ payer, payers, onSubmit }) {
    const { t } = useTranslation("payments");
    const [newPayerId, setNewPayerId] = useState("");

    const payersOptions = payer && payers
        .filter(p => p.id !== payer.id)
        .map(optionMapper(USER_OPTIONS));

    return <div className="modal" id="switch-payer-modal">
        <div className="modal-dialog">
            <div className="modal-content">
                <div className="modal-header">
                    <div className="flex flex-space-between-justified flex-center-aligned p">
                        <h2 className="modal-title">{t("userPayments.switchPayer.title")}</h2>
                        <button
                            type="button"
                            className="close"
                            style={{fontSize:"2em"}}
                            data-dismiss="modal"
                            aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <hr/>
                </div>
                <div className="modal-body">
                    {payer && <div>
                        <h4>{t("userPayments.switchPayer.replacePayerBy", { name: `${payer.first_name} ${payer.last_name}` })}</h4>
                        <select
                            className="form-control"
                            onChange={e => setNewPayerId(e.target.value)}
                            value={newPayerId}>
                            <option value="">{t("userPayments.switchPayer.choosePlaceholder")}</option>
                            {payersOptions}
                        </select>
                    </div>}
                </div>
                <div className="modal-footer">
                    <button
                        onClick={() => onSubmit(newPayerId)}
                        disabled={!newPayerId}
                        className="btn btn-primary pull-right">
                        {t("common:actions.confirm")}
                    </button>
                </div>
            </div>
        </div>
    </div>;
}
