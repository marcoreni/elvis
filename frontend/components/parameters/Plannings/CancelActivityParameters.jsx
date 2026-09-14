import React, { Component, Fragment, useEffect } from "react";
import * as api from "../../../tools/api";
import swal from "sweetalert2";
import { useTranslation } from "react-i18next";

export default function CancelActivityParameters() {
    const { t } = useTranslation("parameters");
    const [hours, setHours] = React.useState(0);

    useEffect(() => {
        api.set()
            .success((data) => {
                setHours(data.hours);
            })
            .error(() => {
                swal.fire({
                    title: t("shared.loadParamsError"),
                    icon: "error",
                });
            })
            .get("/parameters/hours_before_cancelling_activity", {});
    }, []);

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
                "/parameters/hours_before_cancelling_activity",
                {
                    hours: hours,
                },
                {}
            );
    };

    const hoursEdit = (event) => {
        setHours(event.target.value);
    };

    return (
        <Fragment>
            <div className="row">
                <div className="col-md-5">
                    <h3>{t("plannings.cancelActivity.heading")}</h3>
                    <div className="form-group mb-3">
                        <input
                            type="text"
                            className="form-control"
                            id="hours"
                            value={hours}
                            onChange={hoursEdit}
                        />
                        <p className="mt-3">
                            {t("plannings.cancelActivity.hint")}
                        </p>
                    </div>

                    <button
                        className="btn btn-success pull-right mt-5"
                        onClick={onSubmit}
                    >
                        {t("common:actions.validate")}
                    </button>
                </div>
            </div>
        </Fragment>
    );
}
