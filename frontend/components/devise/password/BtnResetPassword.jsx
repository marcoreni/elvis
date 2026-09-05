import React, { useState } from "react";
import PropTypes from "prop-types";
import swal from "sweetalert2";
import * as api from "../../../tools/api";

export default function BtnResetPassword({
                                             sendRequest,
                                             text,
                                             className,
                                             textError,
                                             textSuccess,
                                             textNoData,
                                             user
                                         }) {
    const [resetLink, setResetLink] = useState(null);

    function handleResetPassword() {
        if (sendRequest.url === "/users/reset_password") {
            if (user?.is_admin || user?.is_teacher) {
                api.set()
                    .success(() => swal("Email envoyé !", "", "success"))
                    .error(() => swal("Erreur lors de l'envoi de l'email.", "", "error"))
                    .post(sendRequest.url, { ...sendRequest.data, send_email: "true" }, sendRequest.additionnalHeaders);
            } else {
                api.set()
                    .success((data) => {
                        if (!data?.reset_link) {
                            swal("Erreur", "Erreur lors de la génération du lien", "error");
                            return;
                        }
                        setResetLink(data.reset_link);
                        showResetLinkPopup(data.reset_link);
                    })
                    .error(() => {
                        swal("Erreur", "Impossible de récupérer les informations de l'utilisateur", "error");
                    })
                    .post(sendRequest.url, sendRequest.data, sendRequest.additionnalHeaders);
            }
        } else {
            api.set()
                .success((data) => {
                    if ((!data || data.length === 0) && textNoData) {
                        swal("Erreur", textNoData, "error");
                        return;
                    }
                    swal("Succès", textSuccess, "success");
                })
                .error(() => {
                    swal("Erreur", textError || "Une erreur est survenue.", "error");
                })
                [sendRequest.type](sendRequest.url, sendRequest.data, sendRequest.additionnalHeaders);
        }
    }

    function showResetLinkPopup(link) {
        swal({
            title: "Lien de réinitialisation",
            html: `
                <input id="reset-link" class="swal2-input" value="${link}" readonly>
            `,
            showCancelButton: true,
            cancelButtonText: "Envoyer par mail",
            confirmButtonText: "Copier",
            preConfirm: () => {
                navigator.clipboard.writeText(link)
                    .then(() => swal("Lien copié !", "", "success"))
                    .catch(() => swal("Erreur lors de la copie", "", "error"));
            }
        }).then((result) => {
            if (result.dismiss === swal.DismissReason.cancel) {
                api.set()
                    .success(() => swal("Email envoyé !", "", "success"))
                    .error(() => swal("Erreur lors de l'envoi de l'email.", "", "error"))
                    .post(sendRequest.url, { ...sendRequest.data, send_email: "true" }, sendRequest.additionnalHeaders);
            }
        });
    }

    return (
        <button onClick={handleResetPassword} className={className}>
            {text}
        </button>
    );
}

BtnResetPassword.propTypes = {
    sendRequest: PropTypes.shape({
        type: PropTypes.string.isRequired,
        url: PropTypes.string.isRequired,
        data: PropTypes.object,
        additionnalHeaders: PropTypes.object,
    }),
    text: PropTypes.string.isRequired,
    className: PropTypes.string.isRequired,
    textError: PropTypes.string,
    textSuccess: PropTypes.string,
    textNoData: PropTypes.string,
    user: PropTypes.shape({
        is_admin: PropTypes.bool,
        is_teacher: PropTypes.bool,
    }),
};
