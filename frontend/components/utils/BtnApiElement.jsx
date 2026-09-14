import React from "react";
import * as api from "../../tools/api";
import swal from "sweetalert2";
import PropTypes from "prop-types";

export default function BtnApiElement({
    sendRequest,
    text,
    className,
    textError,
    textSuccess,
    textNoData,
}) {
    function onClick() {
        api.set()
            .success((data) => {
                if ((!data || data.length === 0) && textNoData) {
                    swal.fire({
                        title: "error",
                        icon: "error",
                        text: textNoData,
                    });
                    return;
                }

                swal.fire({
                    title: "Email envoyé",
                    icon: "success",
                    text: textSuccess,
                });
            })
            .error((res) => {
                swal.fire({
                    title: "error",
                    icon: "error",
                    text: textError || "Une erreur est survenue.",
                });
            })
            [sendRequest.type](
                sendRequest.url,
                sendRequest.data,
                sendRequest.additionnalHeaders
            );
    }

    return (
        <button onClick={onClick} className={className}>
            {text}
        </button>
    );
}

BtnApiElement.propTypes = {
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
};
