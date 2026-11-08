import { Fragment, useState } from "react";
import type { JSX } from "react";
import * as api from "../../tools/api";
import swal from "sweetalert2";
import { useTranslation } from "react-i18next";

/**
 * Component for the "show formules" parameter (mounted at
 * app/views/parameters/formules_parameters_edit.html.erb).
 */
export default function FormulesParameters({
    show_formules,
}: {
    show_formules: boolean;
}): JSX.Element {
    const { t } = useTranslation("parameters");
    const [showFormules, setShowFormules] = useState(show_formules);

    function onSubmit() {
        swal.showLoading();

        api.set()
            .success((data) => {
                if (data.success) {
                    swal.fire({
                        title: t("shared.saveSuccessTitle"),
                        text: t("editParameters.formules.saveSuccessText"),
                        icon: "success",
                    });

                    window.location.reload();
                } else {
                    swal.fire({
                        title: t("shared.errorTitle"),
                        text: t("editParameters.formules.saveErrorText"),
                        icon: "error",
                    });
                }
            })
            .error(() => {
                swal.fire({
                    title: t("shared.errorTitle"),
                    text: t("editParameters.formules.saveErrorText"),
                    icon: "error",
                });
            })
            .post(
                "/parameters/formules",
                {
                    show_formules: showFormules,
                },
                {}
            );
    }

    return (
        <Fragment>
            <div className="mb-sm-3 mt-3">
                <input
                    type="checkbox"
                    id="showFormulesCheck"
                    checked={showFormules}
                    onChange={() => setShowFormules(!showFormules)}
                />
                &nbsp;
                <label className="ml-2 font-normal" htmlFor="showFormulesCheck">
                    {t("editParameters.formules.checkboxLabel")}
                </label>
            </div>

            <button
                className="btn btn-success no-margin pull-right"
                onClick={onSubmit}
            >
                {t("shared.saveButton")}
            </button>
        </Fragment>
    );
}
