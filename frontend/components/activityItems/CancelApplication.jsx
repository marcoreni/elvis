import React, { Fragment } from "react";
import { useState } from "react";
import swal from "sweetalert2";
import Modal from "react-modal";
import { useTranslation } from "react-i18next";
import * as api from "../../tools/api";

export default function CancelApplication({ activityApplicationId }) {
    const { t } = useTranslation("activityApplications");
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    function handleModal(witchModal) {
        if (witchModal === "success") {
            setIsSuccessModalOpen(!isSuccessModalOpen);
        } else if (witchModal === "confirm") {
            setIsConfirmModalOpen(!isConfirmModalOpen);
        }
    }

    function handleProcessCancelApplication() {
        api.set()
            .useLoading()
            .success(() => {
                handleModal("confirm");
                handleModal("success");
            })
            .error(() => {
                swal({
                    title: t(
                        "activityApplications:activityItems.cancelApplication.error"
                    ),
                    type: "error",
                }).then(() => handleModal("confirm"));
            })
            .del(`/destroy/activity_application/${activityApplicationId}`, {});
    }

    return (
        <Fragment>
            <button
                className="btn btn-sm mr-2"
                style={{
                    color: "#00334A",
                    borderRadius: "8px",
                    fontWeight: "bold",
                }}
                onClick={() => {
                    handleModal("confirm");
                }}
            >
                {t("common:actions.cancel")}
            </button>

            <Modal
                isOpen={isConfirmModalOpen}
                onRequestClose={() => handleModal("confirm")}
                className="modal-xl"
                ariaHideApp={false}
                contentLabel={t(
                    "activityApplications:activityItems.cancelApplication.confirmContentLabel"
                )}
                style={{
                    content: {
                        width: "700px", // Agrandir la modal à 700px
                    },
                }}
            >
                <div className="m-5">
                    <h2
                        className="modal-header mb-3"
                        style={{ color: "#00334A", textAlign: "left" }}
                    >
                        {t(
                            "activityApplications:activityItems.cancelApplication.confirmTitle"
                        )}
                    </h2>

                    <div className="d-flex justify-content-end mt-5 btn-secondary">
                        <button
                            className="btn mr-2"
                            style={{
                                borderRadius: "8px",
                                fontWeight: "bold",
                            }}
                            onClick={() => {
                                handleModal("confirm");
                            }}
                        >
                            {t("activityApplications:activityItems.no")}
                        </button>

                        <button
                            className="btn text-white"
                            style={{
                                backgroundColor: "#00334A",
                                borderRadius: "8px",
                                fontWeight: "bold",
                            }}
                            onClick={() => {
                                handleProcessCancelApplication();
                            }}
                        >
                            {t("activityApplications:activityItems.yes")}
                        </button>
                    </div>
                </div>
            </Modal>

            {/** Modal de success */}
            <Modal
                isOpen={isSuccessModalOpen}
                onRequestClose={() => {
                    handleModal("success");
                    window.location.reload();
                }}
                className="modal-xl"
                ariaHideApp={false}
                contentLabel={t(
                    "activityApplications:activityItems.cancelApplication.canceledContentLabel"
                )}
                style={{
                    content: {
                        width: "700px", // Agrandir la modal à 700px
                    },
                }}
            >
                <div className="m-5">
                    <h2
                        className="modal-header mb-3"
                        style={{ color: "#00334A", textAlign: "left" }}
                    >
                        {t(
                            "activityApplications:activityItems.cancelApplication.canceledTitle"
                        )}
                    </h2>
                    <p className="h4 mb-5">
                        {t(
                            "activityApplications:activityItems.cancelApplication.canceledBody"
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
                            onClick={() => {
                                handleModal("success");
                                window.location.reload();
                            }}
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
