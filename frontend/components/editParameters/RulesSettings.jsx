import React, {useEffect, useState} from "react";
import DragAndDrop from "./DragAndDrop";
import {useForm} from "react-hook-form";
import {csrfToken} from "../utils";
import swal from "sweetalert2";
import {useTranslation} from "react-i18next";

export default function RulesSettings(props) {
    const {t} = useTranslation("parameters");
    //const [documentName, setPicture] = useState(props.document_url);
    const [documentCleared, setDocumentCleared] = useState(false);
    const {register, handleSubmit} = useForm();
    const [file, setFile] = useState(undefined);

    function onSubmit(data) {
        let formData = new FormData();

        swal({
            title: t("editParameters.rules.loadingTitle"),
            onOpen: () => swal.showLoading()
        });

        formData.append('selected', data.select);

        if (data.url !== "")
            formData.append('rules_url', data.url);

        if (file !== undefined)
            formData.append('pdf_file', file);

        formData.append('document_cleared', documentCleared);
        fetch('/parameters/rules_of_procedure', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-CSRF-TOKEN': csrfToken,
            },
            body: formData
        }).then(res => {
            if (res.ok) {
                res.json().then(json => {
                    swal({
                        type: "success",
                        title: t("editParameters.rules.saveSuccess")
                    });
                });
            } else {
                swal({
                    type: "error",
                    title: t("editParameters.rules.genericError")
                })
            }
        });
    }

    function onClearedFile() {
        setDocumentCleared(true);
    }


    function showCorrectDiv() {
        if (document.getElementById("format").value === "PDF") {
            document.getElementById("pdfDiv").style.display = "block";
            document.getElementById("urlDiv").style.display = "none";
        } else if (document.getElementById("format").value === "URL") {
            document.getElementById("pdfDiv").style.display = "none";
            document.getElementById("urlDiv").style.display = "block";
        } else {
            document.getElementById("pdfDiv").style.display = "none";
            document.getElementById("urlDiv").style.display = "none";
        }
    }

    useEffect(() => {
        showCorrectDiv();
    })

    return <form onSubmit={handleSubmit(onSubmit)}>

        <div className="row mb-5">
            <div className="col-xs-5 col-sm-4 col-md-3 col-xl-2">
                <label>{t("editParameters.rules.formatLabel")}</label>
                <select id="format" className="form-control" {...register("select")}
                        onChange={event => showCorrectDiv()} defaultValue={props.method}>
                    <option value="NIL">{t("editParameters.rules.formatNone")}</option>
                    <option value="URL">URL</option>
                    <option value="PDF">PDF</option>
                </select>
            </div>
        </div>

        <div id="urlDiv" className="row mb-5">
            <div className="col-xs-12 col-md-9 col-xl-6">
                <label>{t("editParameters.rules.urlLabel")}</label>
                <input className="form-control" type="text" defaultValue={props.rulesUrl} {...register("url")} />
            </div>
        </div>

        <div id="pdfDiv" className="row" style={{display: 'none'}}>
            <div className="col-xs-12 col-md-9 col-xl-6">
                <label>{t("editParameters.rules.pdfLabel")}</label>
                <DragAndDrop
                    documentUrl={props.rulesPdf}
                    file_url={props.file_url}
                    setFile={ f => {
                        setFile(f);
                        setDocumentCleared(false);
                    }}
                    acceptedTypes={"application/pdf"}
                    textDisplayed={t("editParameters.rules.dropPdfText")}
                    onClearedFile={onClearedFile}
                />
            </div>

        </div>

        <div className="row">
            <div className="col-xs-12 col-md-9 col-xl-6 text-right mt-3">
                <input type="submit" value={t("common:actions.save")} className="btn btn-primary"/>
            </div>
        </div>
    </form>

}