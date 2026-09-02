import React, {Component, Fragment} from "react";
import * as api from "../../../tools/api";
import swal from "sweetalert2";
import PropTypes from "prop-types";
import {useTranslation} from "react-i18next";

export default function TeacherAvailabilities({defaultChecked})
{
    const {t} = useTranslation("parameters");
    const [checked, setChecked] = React.useState(defaultChecked || false);

    const onSubmit = () => {
        api.set()
            .success(() => {
                swal({
                    title: t("shared.saveSuccess"),
                    type: "success",
                });
            })
            .error(() => {
                swal({
                    title: t("shared.saveError"),
                    type: "error",
                });
            })
            .post("/parameters/planning_parameters", {
                show_availabilities: checked ? "1" : "0"
            }, {});
    }

    return <div className="col-sm-6">
        <h3>{t("plannings.teacherAvailabilities.heading")}</h3>
        <div className="mb-sm-3 mt-3">
            <input type="checkbox" id="check" checked={checked} onChange={() => setChecked(!checked)} />
            &nbsp;
            <label className="ml-2 font-normal" htmlFor="check">{t("plannings.teacherAvailabilities.checkboxLabel")}</label>
        </div>

        <div className="mt-3">
            <button className="btn btn-success no-margin pull-right" onClick={onSubmit}>{t("shared.saveButton")}</button>
        </div>
    </div>
}

TeacherAvailabilities.propTypes = {
    defaultChecked: PropTypes.bool,
        planningDefaultChecked: PropTypes.bool
}