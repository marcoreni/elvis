import React from "react";
import { Form, Field } from "react-final-form";
import { withTranslation } from "react-i18next";
import {
    required,
    isValidAge,
    isValidEmail,
    composeValidators,
} from "../../tools/validators";
import Input from "../common/Input";
import InputSelect from "../common/InputSelect";
import { toBirthday } from "../../tools/format";
import Checkbox from "../common/Checkbox";

const sexValues = ["F", "M", "A"];

class NewStudentForm extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { t, firstName, lastName, onSubmit, onClose } = this.props;
        const sexes = sexValues.map(value => ({
            value,
            label: t(`users:userForm.sexes.${value}`),
        }));
        return (
            <Form
                onSubmit={onSubmit}
                initialValues={this.initialValues}
                render={({ handleSubmit }) => (
                    <form onSubmit={handleSubmit} className="p-lg">
                        <div className="row justify-content-center">
                            <h3 className="m-b-md">
                                {t("users:userForm.newStudent.title")}
                            </h3>
                            <Field
                                label={t("users:userForm.fields.lastName")}
                                defaultValue={lastName}
                                name="last_name"
                                type="text"
                                validate={required}
                                required
                                render={Input}
                            />

                            <Field
                                label={t("users:userForm.fields.firstName")}
                                defaultValue={firstName}
                                name="first_name"
                                type="text"
                                validate={required}
                                required
                                render={Input}
                            />

                            <Field
                                label={t("users:userForm.fields.birthday")}
                                name="birthday"
                                type="date"
                                validate={composeValidators(
                                    required,
                                    isValidAge
                                )}
                                required
                                render={Input}
                                format={toBirthday}
                            />
                            <Field
                                label={t("users:userForm.fields.email")}
                                name="email"
                                type="email"
                                validate={composeValidators(
                                    required,
                                    isValidEmail
                                )}
                                render={Input}
                            />
                            <Field
                                label={t("users:userForm.fields.sex")}
                                name="sex"
                                type="select"
                                validate={required}
                                required
                                render={InputSelect}
                                options={sexes}
                            />

                            <Field
                                name="confirm"
                                type="checkbox"
                                label={t(
                                    "users:userForm.newStudent.sendConfirmation"
                                )}
                                id="confirm"
                                render={Checkbox}
                            />

                            <div className="pull-right">
                                <button
                                    type="reset"
                                    className="btn btn-md m-sm"
                                    onClick={onClose}
                                >
                                    {t("common:actions.cancel")}
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-md"
                                >
                                    {t("common:actions.validate")}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            />
        );
    }
}

export default withTranslation("users")(NewStudentForm);
