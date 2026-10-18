import React, { useState } from "react";
import * as api from "../../../tools/api";
import swal from "sweetalert2";
import { useTranslation } from "react-i18next";

interface TeacherAvailabilitiesProps {
    defaultChecked?: boolean;
}

export default function TeacherAvailabilities({
    defaultChecked,
}: TeacherAvailabilitiesProps) {
    const { t } = useTranslation("parameters");
    const [checked, setChecked] = useState(defaultChecked || false);

    const onSubmit = () => {
        api.set()
            .success(() => {
                swal.fire({
                    title: t("shared.saveSuccess"),
                    icon: "success",
                });
            })
            .error(() => {
                swal.fire({
                    title: t("shared.saveError"),
                    icon: "error",
                });
            })
            .post(
                "/parameters/planning_parameters",
                {
                    show_availabilities: checked ? "1" : "0",
                },
                {}
            );
    };

    return (
        <div className="col-sm-6">
            <h3>{t("plannings.teacherAvailabilities.heading")}</h3>
            <div className="mb-sm-3 mt-3">
                <input
                    type="checkbox"
                    id="check"
                    checked={checked}
                    onChange={() => setChecked(!checked)}
                />
                &nbsp;
                <label className="ml-2 font-normal" htmlFor="check">
                    {t("plannings.teacherAvailabilities.checkboxLabel")}
                </label>
            </div>

            <div className="mt-3">
                <button
                    className="btn btn-success no-margin pull-right"
                    onClick={onSubmit}
                >
                    {t("shared.saveButton")}
                </button>
            </div>
        </div>
    );
}
