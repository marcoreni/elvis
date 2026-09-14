import { useState } from "react";
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
}: {
    sendRequest: {
        url: string;
        type: "get" | "post";
        data: api.RequestData;
        additionnalHeaders?: Record<string, string>;
    };
    text: string;
    className: string;
    textError: string;
    textSuccess: string;
    textNoData: string;
    user: {
        is_admin: boolean;
        is_teacher: boolean;
    };
}): JSX.Element {
    const { t } = useTranslation("users");
    const [resetLink, setResetLink] = useState(null);

    function handleResetPassword() {
        if (sendRequest.url === "/users/reset_password") {
            if (user?.is_admin || user?.is_teacher) {
                api.set()
                    .success(() =>
                        swal.fire({
                            title: t("users:passwordReset.btn.emailSent"),
                            text: "",
                            icon: "success",
                        })
                    )
                    .error(() =>
                        swal.fire({
                            title: t("users:passwordReset.btn.emailSendError"),
                            text: "",
                            icon: "error",
                        })
                    )
                    .post(
                        sendRequest.url,
                        { ...sendRequest.data, send_email: "true" },
                        sendRequest.additionnalHeaders
                    );
            } else {
                api.set()
                    .success((data) => {
                        if (!data?.reset_link) {
                            swal.fire({
                                title: t("users:passwordReset.btn.errorTitle"),
                                text: t("users:passwordReset.btn.linkGenError"),
                                icon: "error",
                            });
                            return;
                        }
                        setResetLink(data.reset_link);
                        showResetLinkPopup(data.reset_link);
                    })
                    .error(() => {
                        swal.fire({
                            title: t("users:passwordReset.btn.errorTitle"),
                            text: t("users:passwordReset.btn.userInfoError"),
                            icon: "error",
                        });
                    })
                    .post(
                        sendRequest.url,
                        sendRequest.data,
                        sendRequest.additionnalHeaders
                    );
            }
        } else {
            api.set()
                .success((data) => {
                    if ((!data || data.length === 0) && textNoData) {
                        swal.fire({
                            title: t("users:passwordReset.btn.errorTitle"),
                            text: textNoData,
                            icon: "error",
                        });
                        return;
                    }
                    swal.fire({
                        title: t("users:passwordReset.btn.successTitle"),
                        text: textSuccess,
                        icon: "success",
                    });
                })
                .error(() => {
                    swal.fire({
                        title: t("users:passwordReset.btn.errorTitle"),
                        text:
                            textError ||
                            t("users:passwordReset.btn.genericError"),
                        icon: "error",
                    });
                })
                [sendRequest.type](
                    sendRequest.url,
                    sendRequest.data,
                    sendRequest.additionnalHeaders
                );
        }
    }

    function showResetLinkPopup(link: string) {
        swal.fire({
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
                        swal.fire({
                            title: t("users:passwordReset.btn.linkCopied"),
                            text: "",
                            icon: "success",
                        })
                    )
                    .catch(() =>
                        swal.fire({
                            title: t("users:passwordReset.btn.copyError"),
                            text: "",
                            icon: "error",
                        })
                    );
            },
        }).then((result) => {
            if (result.dismiss === swal.DismissReason.cancel) {
                api.set()
                    .success(() =>
                        swal.fire({
                            title: t("users:passwordReset.btn.emailSent"),
                            text: "",
                            icon: "success",
                        })
                    )
                    .error(() =>
                        swal.fire({
                            title: t("users:passwordReset.btn.emailSendError"),
                            text: "",
                            icon: "error",
                        })
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
