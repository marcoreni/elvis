import React, { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import * as api from "../../tools/api";
import { redirectTo } from "../../tools/url";
import swal from "sweetalert2";
import Modal from "react-modal";
import { Field, Form } from "react-final-form";
import Input from "../common/Input";
import AlertCheckbox from "../common/AlertCheckbox";

const CreateOrganizationModal = ({ urlRedirect }) => {
    const { t } = useTranslation("users");
    const [isOpen, setIsOpen] = useState(false);

    const onSubmit = e => {
        api.set()
            .success(() => {
                redirectTo(urlRedirect);
                swal({
                    type: "success",
                    title: t("users:organizationModal.created"),
                });
            })
            .error(msg => {
                swal({
                    type: "error",
                    title: t("users:organizationModal.errorTitle"),
                    text: msg.message,
                });
            })
            .post("/organizations/", { organization: e });
    };
    const validate = e => {
        const errors = {};
        if (
            e.organization_name === undefined ||
            (e.organization_name && e.organization_name.trim().length < 1)
        )
            errors.organization_name = t(
                "users:organizationModal.errFieldEmpty"
            );

        if (
            e.organization_reg_number &&
            !/^W[0-9]{9}$/.test(e.organization_reg_number) &&
            !/^[0-9]{14}$/.test(e.organization_reg_number)
        )
            errors.organization_reg_number = t(
                "users:organizationModal.errRegNumber"
            );

        if (e.openInputTVA)
            if (
                e.organization_tax_id &&
                !/^FR[0-9]{11}$/.test(e.organization_tax_id)
            )
                errors.organization_tax_id = t(
                    "users:organizationModal.errTaxId"
                );
        return errors;
    };

    return (
        <Fragment>
            <div className="col-sm-1">
                <button
                    className="btn"
                    data-tippy-content={t(
                        "users:organizationModal.createTooltip"
                    )}
                    type="button"
                    onClick={() => setIsOpen(true)}
                >
                    +
                </button>
            </div>

            <Modal
                ariaHideApp={false}
                onRequestClose={() => setIsOpen(false)}
                style={MODAL_STYLE}
                isOpen={isOpen}
            >
                {
                    <div>
                        <div className="flex flex-space-between-justified">
                            <h2>{t("users:organizationModal.title")}</h2>
                        </div>
                        <div className="row m-b-md">
                            <Form
                                onSubmit={onSubmit}
                                validate={validate}
                                render={({
                                    handleSubmit,
                                    form: { getState },
                                }) => (
                                    <section>
                                        <form onSubmit={handleSubmit}>
                                            <div className="panel-body">
                                                <div className="row">
                                                    <div className="col-sm-8 form-group">
                                                        <Field
                                                            label={t(
                                                                "users:organizationModal.name"
                                                            )}
                                                            name="organization_name"
                                                            type="text"
                                                            render={Input}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-sm-8 form-group">
                                                        <Field
                                                            label={t(
                                                                "users:organizationModal.regNumber"
                                                            )}
                                                            name="organization_reg_number"
                                                            type="text"
                                                            render={Input}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-sm-8 form-group">
                                                        <Field
                                                            text={t(
                                                                "users:organizationModal.vatSubject"
                                                            )}
                                                            name="openInputTVA"
                                                            type="checkbox"
                                                            render={
                                                                AlertCheckbox
                                                            }
                                                        />
                                                    </div>
                                                </div>
                                                {getState().values &&
                                                getState().values
                                                    .openInputTVA ? (
                                                    <div className="row">
                                                        <div className="col-sm-8 form-group">
                                                            <Field
                                                                label={t(
                                                                    "users:organizationModal.vatNumber"
                                                                )}
                                                                name="organization_tax_id"
                                                                type="text"
                                                                render={Input}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    ""
                                                )}
                                                <div
                                                    className="flex flex-end-justified"
                                                    type="submit"
                                                >
                                                    <button
                                                        className="btn btn-primary"
                                                        disabled={
                                                            !getState().valid
                                                        }
                                                    >
                                                        {t(
                                                            "users:organizationModal.submit"
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </form>
                                    </section>
                                )}
                            />
                        </div>
                    </div>
                }
            </Modal>
        </Fragment>
    );
};

const MODAL_STYLE = {
    content: {
        margin: "auto",
        maxWidth: "600px",
        height: "600px",
        maxHeight: "720px",
    },
};
export default CreateOrganizationModal;
