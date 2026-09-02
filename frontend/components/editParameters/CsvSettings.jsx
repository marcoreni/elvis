import React, {useState} from 'react';
import {useForm} from "react-hook-form";
import {csrfToken} from "../utils";
import swal from "sweetalert2";
import {useTranslation} from "react-i18next";

export default function CsvSettings(props) {
    const {t} = useTranslation("parameters");
    const {register, formState: {errors}, handleSubmit} = useForm();

    function onSubmit(data) {
        fetch('/parameters/csv_export', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-CSRF-TOKEN': csrfToken,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                csv_settings: {
                    col_sep: data.colSep,
                    encoding: data.encoding
                }
            })
        }).then(response => {
            if (response.ok) {
                swal({
                    title: t("editParameters.csv.saveSuccessTitle"),
                    text: t("editParameters.settingsApplied"),
                    icon: 'success'
                });
            } else {
                swal({
                    title: t("shared.errorTitle"),
                    text: t("shared.genericError"),
                    icon: 'error'
                });
            }
        });
    }

    return <form onSubmit={handleSubmit(onSubmit)}>
        <div className="col-md-6 col-xs-12">
            <div>
                <label>{t("editParameters.csv.sepLabel")}</label>
                <input className="form-control" type="text" {...register("colSep", {required: true})}
                       defaultValue={props.csv_settings.col_sep}/>
                <p className="text-danger">{errors.col_sep && t("editParameters.csv.sepRequired")}</p>
            </div>

            <div>
                <label>{t("editParameters.csv.encodingLabel")}</label>
                <select className="form-control" type="select" {...register("encoding", {required: true})}
                        defaultValue={props.csv_settings.encoding}>
                    <option value="UTF-8">UTF-8</option>
                    <option value="ISO-8859-15">ISO-8859-15</option>
                    <option value="windows-1252">Windows-1252</option>
                </select>
                <p className="text-danger">{errors.encoding && t("editParameters.csv.encodingRequired")}</p>
            </div>

            <div className="text-right mt-5">
                <input type="submit" value={t("common:actions.save")} className="btn btn-primary text-white"/>
            </div>
        </div>

    </form>
}