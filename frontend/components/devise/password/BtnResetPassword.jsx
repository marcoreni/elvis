import React, { useState } from "react";
import PropTypes from "prop-types";
import swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import * as api from "../../../tools/api";

export default function BtnResetPassword({
    sendRequest,
    text,
    className,
    textError,
    textSuccess,
    textNoData,
    user,
}) {
    const { t } = useTranslation("users");
    const [resetLink, setResetLink] = useState(null);

    function handleResetPassword() {
        if (sendRequest.url === "/users/reset_password") {
            if (user?.is_admin || user?.is_teacher) {
                api.set()
                    .success(() =>
                        swal(
                            t("users:passwordReset.btn.emailSent"),
                            "",
                            "success"
                        )
                    )
                    .error(() =>
                        swal(
                            t("users:passwordReset.btn.emailSendError"),
                            "",
                            "error"
                        )
                    )
                    .post(
                        sendRequest.url,
                        { ...sendRequest.data, send_email: "true" },
                        sendRequest.additionnalHeaders
                    );
            } else {
                api.set()
                    .success(data => {
                        if (!data?.reset_link) {
                            swal(
                                t("users:passwordReset.btn.errorTitle"),
                                t("users:passwordReset.btn.linkGenError"),
                                "error"
                            );
                            return;
                        }
                        setResetLink(data.reset_link);
                        showResetLinkPopup(data.reset_link);
                    })
                    .error(() => {
                        swal(
                            t("users:passwordReset.btn.errorTitle"),
                            t("users:passwordReset.btn.userInfoError"),
                            "error"
                        );
                    })
                    .post(
                        sendRequest.url,
                        sendRequest.data,
                        sendRequest.additionnalHeaders
                    );
            }
        } else {
            api.set()
                .success(data => {
                    if ((!data || data.length === 0) && textNoData) {
                        swal(
                            t("users:passwordReset.btn.errorTitle"),
                            textNoData,
                            "error"
                        );
                        return;
                    }
                    swal(
                        t("users:passwordReset.btn.successTitle"),
                        textSuccess,
                        "success"
                    );
                })
                .error(() => {
                    swal(
                        t("users:passwordReset.btn.errorTitle"),
                        textError || t("users:passwordReset.btn.genericError"),
                        "error"
                    );
                })
                [sendRequest.type](
                    sendRequest.url,
                    sendRequest.data,
                    sendRequest.additionnalHeaders
                );
        }
    }

    function showResetLinkPopup(link) {
        swal({
            title: t("users:passwordReset.btn.resetLinkTitle"),
            html: `
                <input id="reset-link" class="swal2-input" value="${link}" readonly>
            `,
            showCancelButton: true,
            cancelButtonText: t("users:passwordReset.btn.sendByMail"),
            confirmButtonText: t("users:passwordReset.btn.copy"),
            preConfirm: () => {
                navigator.clipboard
                    .writeText(link)
                    .then(() =>
                        swal(
                            t("users:passwordReset.btn.linkCopied"),
                            "",
                            "success"
                        )
                    )
                    .catch(() =>
                        swal(
                            t("users:passwordReset.btn.copyError"),
                            "",
                            "error"
                        )
                    );
            },
        }).then(result => {
            if (result.dismiss === swal.DismissReason.cancel) {
                api.set()
                    .success(() =>
                        swal(
                            t("users:passwordReset.btn.emailSent"),
                            "",
                            "success"
                        )
                    )
                    .error(() =>
                        swal(
                            t("users:passwordReset.btn.emailSendError"),
                            "",
                            "error"
                        )
                    )
                    .post(
                        sendRequest.url,
                        { ...sendRequest.data, send_email: "true" },
                        sendRequest.additionnalHeaders
                    );
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
