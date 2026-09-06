import React, { Fragment } from "react";
import { useState } from "react";
import Modal from "react-modal";
import { useTranslation } from "react-i18next";
import * as api from "../../tools/api";
import swal from "sweetalert2";

export default function EditApplication(props) {
    const { t } = useTranslation("activityApplications");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(
        false
    );
    const [editInput, setEditInput] = useState("");

    function handleCloseEditModal() {
        setIsEditModalOpen(!isEditModalOpen);
    }

    function handleCloseConfirmationModal() {
        setIsConfirmationModalOpen(!isConfirmationModalOpen);
    }

    return (
        <Fragment>
            <button
                className="btn text-white btn-sm"
                style={{
                    backgroundColor: "#00334A",
                    borderRadius: "8px",
                    fontWeight: "bold",
                }}
                onClick={() => handleCloseEditModal()}
            >
                {t(
                    "activityApplications:activityItems.editApplication.comment"
                )}
            </button>

            <Modal
                isOpen={isEditModalOpen}
                onRequestClose={() => handleCloseEditModal()}
                className="modal-sm"
                ariaHideApp={false}
                contentLabel={t(
                    "activityApplications:activityItems.editApplication.editContentLabel"
                )}
                style={{
                    content: {
                        width: "700px",
                    },
                }}
            >
                <div className="m-5">
                    <h2
                        className="modal-header mb-3"
                        style={{ color: "#00334A", textAlign: "left" }}
                    >
                        {t(
                            "activityApplications:activityItems.editApplication.addCommentTitle"
                        )}
                    </h2>
                    <div className="content" style={{ height: "200px" }}>
                        <textarea
                            id="editInput"
                            name="editInput"
                            style={{ width: "100%", height: "100%" }}
                            wrap="soft"
                            onChange={e => setEditInput(e.target.value)}
                            placeholder={t(
                                "activityApplications:activityItems.editApplication.placeholder"
                            )}
                        ></textarea>
                    </div>
                    <div className="d-flex justify-content-end mt-5">
                        <button
                            className="btn btn-primary text-white"
                            onClick={() => {
                                if (editInput === "") {
                                    swal({
                                        title: t(
                                            "activityApplications:activityItems.editApplication.emptyError"
                                        ),
                                        icon: "info",
                                        confirmButtonColor: "#00334A",
                                        confirmButtonText: t(
                                            "activityApplications:activityItems.editApplication.ok"
                                        ),
                                    });
                                    return;
                                }

                                props.handleProcessModifyApplication(editInput);
                                handleCloseEditModal();
                                handleCloseConfirmationModal();
                            }}
                        >
                            {t(
                                "activityApplications:activityItems.editApplication.submit"
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={isConfirmationModalOpen}
                onRequestClose={() => handleCloseConfirmationModal()}
                className="modal-sm"
                ariaHideApp={false}
                contentLabel={t(
                    "activityApplications:activityItems.editApplication.successContentLabel"
                )}
                style={{
                    content: {
                        width: "700px",
                    },
                }}
            >
                <div className="m-5">
                    <h2
                        className="modal-header mb-3"
                        style={{ color: "#00334A", textAlign: "left" }}
                    >
                        {t(
                            "activityApplications:activityItems.editApplication.successTitle"
                        )}
                    </h2>
                    <p className="h4 mb-5">
                        {t(
                            "activityApplications:activityItems.editApplication.successBody"
                        )}
                    </p>
                    <div className="d-flex justify-content-end mt-5">
                        <button
                            className="btn text-white"
                            style={{
                                backgroundColor: "#00334A",
                                borderRadius: "8px",
                                fontWeight: "bold",
                            }}
                            onClick={() => handleCloseConfirmationModal()}
                        >
                            {t(
                                "activityApplications:activityItems.viewMyRequests"
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </Fragment>
    );
}
