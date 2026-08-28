import React from "react";
import { useTranslation } from "react-i18next";

export default function MessageModal({ id, onChange, onSend, message, recipients, }) {
    const { t } = useTranslation("payments");

    return <div className="modal inmodal"
        id={id}
        tabIndex="-1"
        role="dialog">
        <div className="modal-dialog">
            <div className="modal-content animated">
                <div className="modal-header">
                    <h2>{t("general.message.title")}</h2>
                </div>
                <div className="modal-body">
                    <h3>{t("general.message.titleLabel")}</h3>
                    <input
                        type="text"
                        name="title"
                        className="form-control"
                        size="60"
                        placeholder={t("general.message.titlePlaceholder")}
                        onChange={onChange}
                        value={message.title}/>
                    <h3>{t("general.message.recipientsLabel")}</h3>
                    <p>{recipients}</p>
                    <h3>{t("general.message.messageLabel")}</h3>
                    <textarea
                        resizable="false"
                        className="form-control"
                        cols="60"
                        rows="4"
                        placeholder={t("general.message.messagePlaceholder")}
                        name="content"
                        onChange={onChange}
                        value={message.content}>
                    </textarea>

                    {/*<h3>Envoi par</h3>*/}
                    <div className="flex">
                        <input
                            type="hidden"
                            name="isEmail"
                            id="emailSelectRadio"
                            value="email"
                            checked={true}
                            readOnly={true}
                        />
                    {/*    <div className="form-check m-r">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                name="isEmail"
                                id="emailSelectRadio"
                                value="email"
                                onChange={onChange}
                                checked={message.isEmail || true} />
                            <label className="form-check-label" htmlFor="emailSelectRadio">
                                    Email
                            </label>
                        </div>*/}
                        {/*<div className="form-check">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                name="isSMS"
                                id="smsSelectRadio"
                                value="sms"
                                disabled
                                onChange={onChange}
                                value={message.isSMS} />
                            <label className="form-check-label" htmlFor="emailSelectRadio">
                                SMS
                            </label>
                        </div>*/}
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
                        onClick={onSend}
                        className="btn btn-primary"
                        data-dismiss="modal">
                        <i className="fas fa-paper-plane m-r-sm"></i>
                        {t("general.message.send")}
                </button>
                </div>
            </div>
        </div>
    </div>;
}
