import React from "react";
import Modal from "react-modal";
import swal from "sweetalert2";
import { useTranslation } from "react-i18next";

export default function PluginActivationModal({
    isOpen,
    pluginID,
    activatedPlugins,
    onCancel,
    onClose,
    handleSaveAndRestart,
}) {
    const { t } = useTranslation("plugins");
    const isActivated = pluginID && activatedPlugins[pluginID] === true;
    const rollbackContainerStyle = {
        display: isActivated ? "none" : "flex",
        justifyContent: "flex-end", // Aligner à droite
        marginBottom: "3rem",
    };

    async function handleConfirm() {
        try {
            await handleSaveAndRestart();
            onClose();
        } catch (error) {
            console.error("Erreur lors de la confirmation:", error);
            swal.fire({
                title: t("activationModal.unexpectedErrorTitle"),
                text: t("activationModal.unexpectedErrorText"),
                icon: "error",
            });
            onCancel();
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            contentLabel={t("activationModal.ariaLabel")}
            className="position-relative"
        >
            <h2>
                {t("activationModal.confirmToggle", {
                    action: t(
                        isActivated
                            ? "activationModal.activate"
                            : "activationModal.deactivate"
                    ),
                })}
            </h2>
            <p>{t("activationModal.restartNotice")}</p>
            <div className="mt-5" style={rollbackContainerStyle}>
                <input
                    className="my-auto"
                    id="rollback"
                    name="rollback"
                    type="checkbox"
                />
                <label className="my-auto ml-2" htmlFor="rollback">
                    {t("activationModal.deleteData")}
                </label>
            </div>
            <div className="d-flex justify-content-between mt-5">
                <button className="btn" onClick={onCancel}>
                    {t("common:actions.cancel")}
                </button>
                <button className="btn btn-primary" onClick={handleConfirm}>
                    {t("common:actions.confirm")}
                </button>
            </div>
        </Modal>
    );
}
