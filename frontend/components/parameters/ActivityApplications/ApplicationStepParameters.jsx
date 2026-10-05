import React, { Fragment, useEffect, useState } from "react";
import * as api from "../../../tools/api";
import swal from "sweetalert2";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import TipTapEditor from "../../common/TipTapEditor";
import { wysiwygToHtml } from "../../common/RichTextViewer";

export default function ApplicationStepParameters({ parameter_label, desc }) {
    const { t } = useTranslation("parameters");
    const [displayText, setDisplayText] = useState("");
    const [visibilityActivated, setVisibilityActivated] = useState(false);
    const [init, setInit] = useState(true);

    useEffect(() => {
        api.set()
            .success((res) => {
                setVisibilityActivated(res.activated);
                setInit(false);

                if (res.display_text !== null) {
                    setDisplayText(wysiwygToHtml(res.display_text));
                }
            })
            .error((err) => {
                swal.fire({
                    title: t("activityApplications.stepParams.loadError"),
                    text: err.error,
                    icon: "error",
                });
            })
            .get(
                `activity_application_parameters/get_application_step_parameters/${parameter_label}`,
                {}
            );
    }, []);

    useEffect(() => {
        if (!init) {
            api.set()
                .error((res) => {
                    swal.fire({
                        title: t("activityApplications.stepParams.saveError"),
                        text: res.error,
                        icon: "error",
                    });
                })
                .post(
                    "activity_application_parameters/change_activated_param",
                    {
                        parameter_label: parameter_label,
                        activated: visibilityActivated,
                    }
                );
        }
    }, [visibilityActivated]);

    const onSaveDisplayText = () => {
        api.set()
            .success((res) => {
                toast.success(t("activityApplications.stepParams.saveSuccess"));
            })
            .error((res) => {
                swal.fire({
                    title: t("activityApplications.stepParams.saveError"),
                    text: res.error,
                    icon: "error",
                });
            })
            .post("activity_application_parameters/change_display_text_param", {
                parameter_label: parameter_label,
                display_text: displayText,
            });
    };

    return (
        <div className="m-3">
            <div className="mb-5">
                <h3>{desc}</h3>
                <div className="checkbox checkbox-primary">
                    <input
                        type="checkbox"
                        id={`${parameter_label}.paymentScheduleOptionsActivated`}
                        className=""
                        checked={visibilityActivated}
                        onChange={(e) =>
                            setVisibilityActivated(e.target.checked)
                        }
                    />
                    <label
                        htmlFor={`${parameter_label}.paymentScheduleOptionsActivated`}
                    >
                        {t("activityApplications.stepParams.showTextLabel")}
                    </label>
                </div>
            </div>

            <div>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        onSaveDisplayText();
                    }}
                >
                    <div className="form-group mb-5">
                        <TipTapEditor
                            value={displayText}
                            onChange={setDisplayText}
                        />
                    </div>

                    <div className="text-right">
                        <button className="btn btn-primary" type="submit">
                            {t("common:actions.save")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
