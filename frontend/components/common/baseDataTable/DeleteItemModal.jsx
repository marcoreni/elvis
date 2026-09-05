import React, {useEffect, useState} from "react";
import Modal from "react-modal";
import {useTranslation} from "react-i18next";

export default function DeleteItemModal(props) {
    const {t} = useTranslation("common");
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        if (!props.isOpen) {
            setError(null);
        }
    }, [props.isOpen]);

    function handleDelete() {
        setError(null);
        setSubmitting(true);
        props.onDelete()
            .then(() => {
                setSubmitting(false);
                props.onRequestClose();
            })
            .catch(err => {
                setSubmitting(false);
                setError(err.message || t("deleteItemModal.genericError"));
            });
    }

    return (
        <Modal
            isOpen={props.isOpen}
            onRequestClose={props.onRequestClose}
            className="modal-dialog modal-sm"
        >
            <div className="modal-header">
                <h4 className="modal-title">{props.title || t("deleteItemModal.titleFallback")}</h4>
                <button type="button" className="close" onClick={props.onRequestClose}>
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>

            <div className="modal-body">
                {props.question || t("deleteItemModal.questionFallback")}
            </div>

            {error && <div className="alert alert-danger mt-3">{error}</div>}

            <div style={{padding: 20, display: "flex", justifyContent: "flex-end", gap: "20px"}}>
                <div>
                    <button
                        type="reset" className="btn btn-block"
                        onClick={props.onRequestClose}
                        disabled={submitting}
                    >
                        {t("actions.cancel")}
                    </button>
                </div>
                <div>
                    <button
                        type="submit"
                        className="btn btn-danger btn-block"
                        onClick={handleDelete}
                        disabled={submitting}
                    >
                        {t("actions.delete")}
                        &nbsp;
                        {submitting ?
                            <i className="fas fa-circle-notch fa-spin"></i>
                            :
                            ""}
                    </button>
                </div>
            </div>
        </Modal>
    )
}