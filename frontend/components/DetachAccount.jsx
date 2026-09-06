import React, { Fragment, useEffect, useState } from "react";
import * as api from "../tools/api";
import Modal from "react-modal";
import { Field, Form } from "react-final-form";
import { required } from "../tools/validators";
import _ from "lodash";
import Input from "./common/Input";
import swal from "sweetalert2";
import { useTranslation } from "react-i18next";

export default function DetachAccount({ user, user_id, reload_data }) {
    const { t } = useTranslation("users");
    const [userToDetach, setUserToDetach] = useState(user);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (!user) {
            api.set()
                .success(u => setUserToDetach(u))
                .error(() => setUserToDetach(null))
                .get(`/users/${user_id}/infos`);
        }
    });

    if (userToDetach == null) {
        return (
            <Fragment>
                <div className="alert alert-danger">
                    {t("users:detachAccount.notFound")}
                </div>
            </Fragment>
        );
    }

    function onSubmit(values) {
        const sendData = {
            email: values.email,
            sendemail: values.sendemail,
        };

        api.set()
            .success(() => {
                swal({
                    type: "success",
                    text: t("users:detachAccount.success"),
                }).then(() => reload_data());
            })
            .error(err => {
                swal({
                    title: t("users:detachAccount.errorTitle"),
                    text: err.message || t("users:detachAccount.genericError"),
                    type: "error",
                });
            })
            .del(`/users/${userToDetach.id}/detach`, sendData, {});
    }

    return (
        <Fragment>
            <button
                className="btn btn-outline btn-danger m-2"
                onClick={() => setIsModalOpen(true)}
                type="button"
            >
                {t("users:detachAccount.detach")}
            </button>

            <Modal
                className="modal-sm"
                isOpen={isModalOpen}
                onRequestClose={() => setIsModalOpen(false)}
                contentLabel={t("users:detachAccount.contentLabel")}
                appElement={document.body}
            >
                <div className="p-3">
                    <div className="m-b-md">
                        <h4>
                            {t("users:detachAccount.question", {
                                name: `${user.first_name} ${user.last_name}`,
                            })}
                        </h4>
                        <p>{t("users:detachAccount.explanation1")}</p>

                        <p>{t("users:detachAccount.explanation2")}</p>
                    </div>
                    <Form
                        onSubmit={onSubmit}
                        initialValues={{
                            email: userToDetach.email,
                            sendemail: false,
                        }}
                    >
                        {({ handleSubmit, form }) => {
                            return (
                                <form onSubmit={handleSubmit}>
                                    <div className="row">
                                        <div className="col-sm">
                                            <label>
                                                {t(
                                                    "users:detachAccount.emailLabel"
                                                )}
                                            </label>
                                            <Field
                                                name="email"
                                                type="text"
                                                validate={required}
                                                render={Input}
                                            />
                                        </div>
                                    </div>

                                    <div className="row m-b-sm">
                                        <div className="col-sm">
                                            <div className="form-check">
                                                <Field
                                                    type="checkbox"
                                                    name="sendemail"
                                                    className="form-check-input"
                                                    component="input"
                                                />
                                                <label
                                                    className="form-check-label m-l-sm"
                                                    htmlFor="sendemail"
                                                >
                                                    {t(
                                                        "users:detachAccount.sendNotification"
                                                    )}
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row">
                                        <div className="col-sm-6">
                                            <button
                                                className="btn btn-secondary"
                                                type="button"
                                                onClick={() =>
                                                    setIsModalOpen(false)
                                                }
                                            >
                                                {t("common:actions.cancel")}
                                            </button>
                                        </div>

                                        <div className="col-sm-6">
                                            <button
                                                className="btn btn-danger"
                                                type="submit"
                                            >
                                                {t(
                                                    "users:detachAccount.detach"
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            );
                        }}
                    </Form>
                </div>
            </Modal>
        </Fragment>
    );
}
