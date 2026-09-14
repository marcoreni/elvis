import React, { useState, useEffect } from "react";
import { Form, Field } from "react-final-form";
import { useTranslation } from "react-i18next";
import * as api from "../../../tools/api";
import swal from "sweetalert2";
import { csrfToken } from "../../utils";
import type { ValidationErrors } from "final-form";

// --- Types ---

interface Form {
    first_name: string;
    last_name: string;
    birthday: string;
}

// --- Component ---

const New: React.FC = () => {
    const { t } = useTranslation("users");
    const [email, setEmail] = useState<string>("");

    useEffect(() => {
        setEmail(t("users:passwordReset.emailFallback"));
    }, [t]);

    const checkValidUser = async (
        values: Form
    ): Promise<ValidationErrors | undefined> => {
        const errors = await api
            .set()
            .success((data: any) => {
                if (data && data.email) {
                    setEmail(data.email);
                    return undefined;
                }
                return { uniqueness: t("users:passwordReset.uniquenessError") };
            })
            .error((err: any) => {
                console.log("Erreurs : " + err);
                return { uniqueness: t("users:passwordReset.uniquenessError") };
            })
            .post("/users/exist", {
                first_name: values.first_name,
                last_name: values.last_name,
                birthday: values.birthday,
            });

        if (errors) {
            setEmail(t("users:passwordReset.emailFallback"));
        }

        return errors || undefined;
    };

    const validate = async (values: Form) => {
        const errors: ValidationErrors = {};

        if (!values.first_name) {
            errors.first_name = t("users:passwordReset.required");
        }
        if (!values.last_name) {
            errors.last_name = t("users:passwordReset.required");
        }
        if (!values.birthday) {
            errors.birthday = t("users:passwordReset.required");
        }

        if (Object.keys(errors).length > 0) {
            return errors;
        }

        return checkValidUser(values);
    };

    const onSubmit = (values: Form) => {
        const redirect_path = "/u/sign_in";

        api.set()
            .success((res: any) => console.log(res))
            .error((res: any) => console.log(res))
            .post("/u/password", {
                utf8: true,
                user: { ...values },
                password: null,
                "X-CSRF-Token": csrfToken,
            });

        const title = t("users:passwordReset.greeting", {
            name: `${values.first_name} ${values.last_name}`,
        });

        const htmltext = t("users:passwordReset.emailSentInfo", {
            email: email,
        });

        const confirmtext = t("users:passwordReset.redirection");

        swal.fire({
            title: title,
            html: htmltext,
            timer: 10000,
            allowOutsideClick: false,
            confirmButtonText: confirmtext,
        }).then(() => {
            window.location.href = redirect_path;
        });

        return undefined;
    };

    return (
        <Form<Form>
            onSubmit={onSubmit}
            validate={validate}
            render={({ errors, handleSubmit }) => (
                <form onSubmit={handleSubmit} className="m-t" id="new_user">
                    <div className="ibox">
                        <div className="ibox-title">
                            <label>{t("users:passwordReset.formTitle")}</label>
                        </div>
                        <div className="ibox-content">
                            <Field name="first_name">
                                {({ input, meta }) => (
                                    <div className="form-group">
                                        <label>
                                            {t(
                                                "users:userForm.fields.firstName"
                                            )}
                                        </label>
                                        <input
                                            {...input}
                                            type="text"
                                            placeholder={t(
                                                "users:passwordReset.firstNamePlaceholder"
                                            )}
                                            className="form-control"
                                        />
                                        {meta.error && meta.touched && (
                                            <span>{meta.error}</span>
                                        )}
                                    </div>
                                )}
                            </Field>
                            <Field name="last_name">
                                {({ input, meta }) => (
                                    <div className="form-group">
                                        <label>
                                            {t(
                                                "users:userForm.fields.lastName"
                                            )}
                                        </label>
                                        <input
                                            {...input}
                                            type="text"
                                            placeholder={t(
                                                "users:passwordReset.lastNamePlaceholder"
                                            )}
                                            className="form-control"
                                        />
                                        {meta.error && meta.touched && (
                                            <span>{meta.error}</span>
                                        )}
                                    </div>
                                )}
                            </Field>
                            <Field name="birthday">
                                {({ input, meta }) => (
                                    <div className="form-group">
                                        <label>
                                            {t(
                                                "users:userForm.fields.birthday"
                                            )}
                                        </label>
                                        <input
                                            {...input}
                                            type="date"
                                            placeholder={t(
                                                "users:passwordReset.birthdayPlaceholder"
                                            )}
                                            className="form-control"
                                        />
                                        {meta.error && meta.touched && (
                                            <span>{meta.error}</span>
                                        )}
                                    </div>
                                )}
                            </Field>
                            <button
                                type="submit"
                                className="btn btn-primary block full-width"
                            >
                                {t("users:passwordReset.submit")}
                            </button>
                            {errors && errors.uniqueness && (
                                <span>{errors.uniqueness}</span>
                            )}
                        </div>
                    </div>
                </form>
            )}
        />
    );
};

export default New;
