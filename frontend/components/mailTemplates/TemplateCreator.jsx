import React, { Fragment, useRef } from "react";
import { Field, Form } from "react-final-form";
import { useTranslation } from "react-i18next";
import { required } from "../../tools/validators";
import Input from "../common/Input";
import { csrfToken } from "../utils";
import swal from "sweetalert2";
import { EmailEditor } from "react-email-editor";

export default function TemplateCreator() {
    const { t } = useTranslation("parameters");
    const emailEditorRef = useRef();

    const onSubmit = values => {
        try {
            emailEditorRef.current.editor.exportHtml(data => {
                fetch(`/notification_templates/`, {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "X-CSRF-Token": csrfToken,
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        name: values.name,
                        path: values.path,
                        html: data.html,
                        json: data.design,
                    }),
                })
                    .then(response => {
                        if (!response.ok)
                            swal(
                                t("parameters:mailTemplates.toasts.errorTitle"),
                                t(
                                    "parameters:mailTemplates.toasts.routingError"
                                ),
                                "error"
                            );

                        return response.json();
                    })
                    .then(json => {
                        swal(
                            t("parameters:mailTemplates.toasts.successTitle"),
                            t("parameters:mailTemplates.toasts.created"),
                            "success"
                        ).then(() => {
                            window.location.href = "/notification_templates";
                        });
                    });
            });
        } catch (error) {
            swal(
                t("parameters:mailTemplates.toasts.errorTitle"),
                error.message,
                "error"
            );
        }
    };

    return (
        <Fragment>
            <div className="row wrapper border-bottom white-bg page-heading">
                <h1>{t("parameters:mailTemplates.createTitle")}</h1>
            </div>

            <div className="col-sm-12">
                <div className="col-12">
                    <div className="form-group">
                        <Form
                            onSubmit={onSubmit}
                            render={({ handleSubmit }) => (
                                <form onSubmit={handleSubmit} className="p-lg">
                                    <div className="d-inline-flex row justify-content-center">
                                        <div className="pl-4">
                                            <Field
                                                label={t(
                                                    "parameters:mailTemplates.nameLabel"
                                                )}
                                                name="name"
                                                type="text"
                                                validate={required}
                                                required
                                                render={Input}
                                            />
                                        </div>

                                        <div className="pl-4">
                                            <Field
                                                label={t(
                                                    "parameters:mailTemplates.pathLabel"
                                                )}
                                                name="path"
                                                type="text"
                                                validate={required}
                                                required
                                                render={Input}
                                            />
                                        </div>
                                    </div>

                                    <EmailEditor
                                        ref={emailEditorRef}
                                        // onLoad={onLoad}
                                        // onReady={onReady}
                                    />

                                    <div className="text-center mt-3">
                                        <button
                                            type="submit"
                                            className="btn btn-primary btn-lg btn-block"
                                        >
                                            {t("common:actions.validate")}
                                        </button>
                                    </div>
                                </form>
                            )}
                        />
                    </div>
                    <a
                        href="/notification_templates"
                        className="btn btn-primary mt-4 ml-5"
                    >
                        {t("parameters:mailTemplates.backToEdit")}
                    </a>
                </div>
            </div>
        </Fragment>
    );
}
