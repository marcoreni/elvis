import React, {Fragment, useState} from "react";
import Modal from "react-modal";
import {Field, Form} from "react-final-form";
import Input from "../../common/Input";
import InputSelect from "../../common/InputSelect";
import Checkbox from "../../common/Checkbox";
import DragAndDrop from "../../editParameters/DragAndDrop";
import {useTranslation} from "react-i18next";

export default function ConsentDocumentModal({document, isOpen, isFetching, onRequestClose, onSubmit}) {
    const {t} = useTranslation("parameters");
    const required = value => (value ? undefined : t("activityApplications.consentModal.requiredError"))
    const [file, setFile] = useState(undefined);
    const [fileHasChanged, setFileHasChanged] = useState(false);

    function handleSubmit(values) {
        onSubmit(values, file, fileHasChanged);
    }


    if(document===null && fileHasChanged)
        setFileHasChanged(false);

    return isOpen ?
        <Modal
            isOpen={isOpen}
            onRequestClose={onRequestClose}
            contentLabel={t("activityApplications.consentModal.title")}
        >
            <div className="modal-header">
                <h3 className="modal-title">{t("activityApplications.consentModal.title")}</h3>
                <button type="button"
                        className="close"
                        aria-label={t("common:actions.close")}
                        onClick={onRequestClose}>
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>

            <div className="modal-body">

                <Form
                    onSubmit={handleSubmit}
                    initialValues={document}
                    render={({handleSubmit, values}) =>

                        <form onSubmit={handleSubmit}>
                            <Field
                                id="title"
                                label={t("activityApplications.consentModal.titleLabel")}
                                htmlOptions={{
                                    placeholder: t("activityApplications.consentModal.titlePlaceholder"),
                                }}
                                name="title"
                                type="text"
                                required
                                validate={required}
                                render={Input}
                            />

                            <Field
                                id="content"
                                label={t("activityApplications.consentModal.contentLabel")}
                                htmlOptions={{
                                    placeholder: t("activityApplications.consentModal.contentPlaceholder"),
                                }}
                                name="content"
                                isArea={true}
                                validate={required}
                                required
                                render={Input}
                            />
                            <span style={{top: "-15px", position: "relative"}} className="small" >
                                {t("activityApplications.consentModal.schoolNameHint")}
                            </span>

                            <Field
                                id="attached_file"
                                name="attached_file"
                                render={(props) => <DragAndDrop
                                    file_url={values.attached_file_url}
                                    fileLabel={t("activityApplications.consentModal.attachedFileLabel")}
                                    fileTitle={values.title}
                                    setFile={f => {
                                        setFile(f);
                                        setFileHasChanged(true);
                                    }}
                                    acceptedTypes={"application/pdf"}
                                    textDisplayed={t("activityApplications.consentModal.dropPdfText")}
                                />}
                            />


                            <Field
                                id="expected_answer"
                                label={t("activityApplications.consentModal.consentCheckboxLabel")}
                                name="expected_answer"
                                checked="expected_answer"
                                type="checkbox"
                                render={Checkbox}
                                extraTitle={t("activityApplications.consentModal.consentExtraTitle")}
                            />

                            <div style={{padding: 20, display: "flex", justifyContent: "flex-end", gap: "20px"}}>

                                <button type="reset"
                                        className="btn btn-secondary"
                                        onClick={onRequestClose}>
                                    {t("common:actions.cancel")}
                                </button>

                                <button
                                    type="submit"
                                    className="btn btn-primary">
                                    {t("common:actions.save")}
                                    {isFetching &&
                                        <span>&nbsp;<i className="fas fa-circle-notch fa-spin"></i></span>
                                    }
                                </button>
                            </div>

                        </form>
                    }>

                </Form>

            </div>

        </Modal>
        :
        null;

}