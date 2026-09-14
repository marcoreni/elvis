import React from "react";
import { useTranslation } from "react-i18next";
import * as api from "../../tools/api";
import swal from "sweetalert2";

const BtnResendEmail = ({ user_id }) => {
    const { t } = useTranslation("users");

    const resendEmail = () => {
        api.set()
            .success((data) => {
                if (!data || data.length === 0) {
                    swal.fire({
                        title: t("users:resendEmail.errorTitle"),
                        icon: "error",
                        text: t("users:resendEmail.alreadyConfigured"),
                    });
                    return;
                }

                swal.fire({
                    title: t("users:resendEmail.sentTitle"),
                    icon: "success",
                    text: t("users:resendEmail.sentText"),
                });
            })
            .error((res) => {
                swal.fire({
                    title: t("users:resendEmail.errorTitle"),
                    icon: "error",
                    text: t("users:resendEmail.errorText"),
                });
            })
            .post(`/users/resend_confirmation`, { ids: [user_id] });
    };

    return (
        <button onClick={resendEmail} className="btn btn-warning btn-block">
            {t("users:resendEmail.button")}
        </button>
    );
};

export default BtnResendEmail;
