import React from "react";
import { Form, Field } from "react-final-form";
import { withTranslation } from "react-i18next";
import * as api from "../../../tools/api";
import Swal from "sweetalert2";
import { csrfToken } from "../../utils";

class New extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.setState({
            email: this.props.t("users:passwordReset.emailFallback"),
        });
    }

    onSubmit = (values, form) => {
        const { t } = this.props;
        let redirect_path = "/u/sign_in";

        api.set()
            .success(res => console.log(res))
            .error(res => console.log(res))
            .post("/u/password", {
                utf8: true,
                user: { ...values },
                password: null,
                "X-CSRF-Token": csrfToken,
            });

        let title = t("users:passwordReset.greeting", {
            name: values.first_name + " " + values.last_name,
        });
        let htmltext = t("users:passwordReset.emailSentInfo", {
            email: this.state.email,
        });
        let confirmtext = t("users:passwordReset.redirection");
        Swal.fire({
            title: title,
            html: htmltext,
            timer: 10000,
            allowOutsideClick: false,
            confirmButtonText: confirmtext,
        }).then(result => {
            window.location.href = redirect_path;
        });
        return undefined;
    };

    async checkValidUser(values) {
        const { t } = this.props;
        let errors = await api
            .set()
            .success(data => {
                return Boolean(data.email)
                    ? this.setState({
                          email: data.email,
                      })
                    : { uniqueness: t("users:passwordReset.uniquenessError") };
            })
            .error(errors => console.log("Erreurs : " + errors))
            .post("/users/exist", {
                first_name: values.first_name,
                last_name: values.last_name,
                birthday: values.birthday,
            });
        errors
            ? this.setState({
                  email: this.props.t("users:passwordReset.emailFallback"),
              })
            : null;
        return errors;
    }

    validate = values => {
        const { t } = this.props;
        const errors = {};
        if (!values.first_name) {
            errors.first_name = t("users:passwordReset.required");
        }
        if (!values.last_name) {
            errors.last_name = t("users:passwordReset.required");
        }
        if (!values.birthday) {
            errors.birthday = t("users:passwordReset.required");
        }
        return Object.keys(errors).length
            ? errors
            : this.checkValidUser(values);
    };

    render() {
        const { t } = this.props;
        return (
            <Form
                onSubmit={this.onSubmit}
                validate={this.validate}
                render={({ errors, hasValidationErrors, handleSubmit }) => {
                    return (
                        <form
                            onSubmit={handleSubmit}
                            className="m-t"
                            id="new_user"
                        >
                            <div className="ibox">
                                <div className="ibox-title">
                                    <label>
                                        {t("users:passwordReset.formTitle")}
                                    </label>
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
                                        // disabled={hasValidationErrors}
                                    >
                                        {t("users:passwordReset.submit")}
                                    </button>
                                    {errors.uniqueness && (
                                        <span>{errors.uniqueness}</span>
                                    )}
                                </div>
                            </div>
                        </form>
                    );
                }}
            />
        );
    }
}

export default withTranslation("users")(New);
