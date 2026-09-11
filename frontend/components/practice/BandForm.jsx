import React, { Fragment } from "react";
import { Field, Form, FormSpy } from "react-final-form";
import { withTranslation } from "react-i18next";

import arrayMutators, { push } from "final-form-arrays";
import { FieldArray } from "react-final-form-arrays";

import Input from "../common/Input";
import InputSelect from "../common/InputSelect";
import Checkbox from "../common/Checkbox";
import DisplayInput from "../common/DisplayInput";

import Modal from "react-modal";
import BandUser from "./BandUser";
import { __esModule } from "react-modal/lib/components/Modal";

import { required } from "../../tools/validators";

import * as api from "../../tools/api";

class BandForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isOtherGenre: false,
            addMember: false,
            previousValues: {},
        };
    }

    submit(values, form) {
        this.isValid = form.getState().valid;

        if (this.isValid) {
            this.props.onSubmit(values);
        }

        return undefined;
    }

    handleValuesChanged({ values }) {
        const { previousValues } = this.state;
        if (previousValues.music_genre_id !== values.music_genre_id)
            this.setState({
                isOtherGenre: values.music_genre_id === "0",
                previousValues: values,
            });

        if (previousValues.old_members !== values.old_members)
            this.setState({
                previousValues: values,
            });
    }

    render() {
        const {
            t,
            initialValues,
            musicGenres,
            bandTypes,
            instruments,
            season,
        } = this.props;
        const { isOtherGenre, addMember } = this.state;

        const genresOptions = [
            ...musicGenres.map(({ id, name }) => ({
                value: id,
                label: name,
            })),
            {
                value: 0,
                label: t("parameters:practice.bandForm.otherGenreOption"),
            },
        ];

        const bandTypesOptions = bandTypes.map(({ id, name }) => ({
            value: id,
            label: name,
        }));

        const instrumentOptions = instruments.map(({ id, label }) => ({
            value: id,
            label,
        }));

        const formattedInitialValues = {
            ...initialValues,
        };

        return (
            <div>
                <Form
                    mutators={{ ...arrayMutators }}
                    onSubmit={this.submit.bind(this)}
                    initialValues={formattedInitialValues}
                >
                    {({
                        handleSubmit,
                        values,
                        form: {
                            mutators: { push, pop, remove, splice },
                        },
                    }) => (
                        <div className="row">
                            <form className="col-lg-6" onSubmit={handleSubmit}>
                                <FormSpy
                                    onChange={this.handleValuesChanged.bind(
                                        this
                                    )}
                                    subscription={{ values: true }}
                                />

                                <Field
                                    name="name"
                                    label={t(
                                        "parameters:practice.bandForm.name"
                                    )}
                                    required
                                    validate={required}
                                    component={Input}
                                />

                                <Field
                                    name="blacklisted"
                                    id="blacklisted"
                                    label={t(
                                        "parameters:practice.bandForm.blacklist"
                                    )}
                                    type="checkbox"
                                    component={Checkbox}
                                />

                                <Field
                                    name="band_type_id"
                                    label={t(
                                        "parameters:practice.bandForm.type"
                                    )}
                                    required
                                    validate={required}
                                    options={bandTypesOptions}
                                    component={InputSelect}
                                />

                                <div className="flex flex-center-aligned">
                                    <Field
                                        name="music_genre_id"
                                        label={t(
                                            "parameters:practice.bandForm.genre"
                                        )}
                                        required
                                        validate={required}
                                        options={genresOptions}
                                        component={InputSelect}
                                    />

                                    {isOtherGenre && (
                                        <Fragment>
                                            <span className="m-l m-r">
                                                <i className="fa fa-2x fa-arrow-right" />
                                            </span>
                                            <Field
                                                name="music_genre_name"
                                                label={t(
                                                    "parameters:practice.bandForm.genreName"
                                                )}
                                                required
                                                validate={required}
                                                component={Input}
                                            />
                                        </Fragment>
                                    )}
                                </div>

                                <FieldArray name="users">
                                    {({ fields }) => (
                                        <div>
                                            <h3>
                                                {t(
                                                    "parameters:practice.bandForm.members"
                                                )}{" "}
                                                {fields.length
                                                    ? `(${fields.length})`
                                                    : ""}
                                            </h3>
                                            <div className="list-group bg-white">
                                                {fields.map((name, index) => (
                                                    <div
                                                        key={index}
                                                        className="list-group-item flex flex-row"
                                                    >
                                                        <div className="flex-fill">
                                                            <strong className="m-r">
                                                                <Field
                                                                    name={`${name}.first_name`}
                                                                    component={
                                                                        DisplayInput
                                                                    }
                                                                />
                                                                &nbsp;
                                                                <Field
                                                                    name={`${name}.last_name`}
                                                                    component={
                                                                        DisplayInput
                                                                    }
                                                                />
                                                            </strong>
                                                        </div>

                                                        <div className="flex-fill">
                                                            <Field
                                                                inline
                                                                name={`${name}.instrument_id`}
                                                                prompt={t(
                                                                    "parameters:practice.bandForm.instrumentPrompt"
                                                                )}
                                                                validate={
                                                                    required
                                                                }
                                                                options={
                                                                    instrumentOptions
                                                                }
                                                                component={
                                                                    InputSelect
                                                                }
                                                            />
                                                        </div>

                                                        <div className="flex-fill text-center">
                                                            <Field
                                                                name={`${name}.id`}
                                                                component={({
                                                                    input: {
                                                                        value,
                                                                    },
                                                                }) =>
                                                                    value >
                                                                    0 ? (
                                                                        <a
                                                                            className="btn btn-outline btn-sm btn-primary flex-center-aligned"
                                                                            href={`/users/${value}`}
                                                                        >
                                                                            {t(
                                                                                "parameters:practice.bandForm.viewProfile"
                                                                            )}
                                                                        </a>
                                                                    ) : (
                                                                        <div />
                                                                    )
                                                                }
                                                            />
                                                        </div>

                                                        <div className=" flex-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    fields.remove(
                                                                        index
                                                                    );
                                                                    push(
                                                                        "old_members",
                                                                        {
                                                                            id:
                                                                                fields
                                                                                    .value[
                                                                                    index
                                                                                ]
                                                                                    .id,
                                                                            last_name:
                                                                                fields
                                                                                    .value[
                                                                                    index
                                                                                ]
                                                                                    .last_name,
                                                                            first_name:
                                                                                fields
                                                                                    .value[
                                                                                    index
                                                                                ]
                                                                                    .first_name,
                                                                            instrument_id:
                                                                                fields
                                                                                    .value[
                                                                                    index
                                                                                ]
                                                                                    .instrument_id,
                                                                        }
                                                                    );
                                                                    formattedInitialValues.old_members.push(
                                                                        {
                                                                            id:
                                                                                fields
                                                                                    .value[
                                                                                    index
                                                                                ]
                                                                                    .id,
                                                                            last_name:
                                                                                fields
                                                                                    .value[
                                                                                    index
                                                                                ]
                                                                                    .last_name,
                                                                            first_name:
                                                                                fields
                                                                                    .value[
                                                                                    index
                                                                                ]
                                                                                    .first_name,
                                                                            instrument_id:
                                                                                fields
                                                                                    .value[
                                                                                    index
                                                                                ]
                                                                                    .instrument_id,
                                                                        }
                                                                    );
                                                                }}
                                                                className="btn btn-sm btn-primary flex-end"
                                                            >
                                                                {t(
                                                                    "parameters:practice.bandForm.removeMember"
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                onClick={() =>
                                                    this.setState({
                                                        addMember: true,
                                                    })
                                                }
                                            >
                                                {t(
                                                    "parameters:practice.bandForm.addMember"
                                                )}
                                            </button>
                                            <Modal
                                                ariaHideApp={false}
                                                style={{
                                                    content: {
                                                        position: "static",
                                                    },
                                                }}
                                                onRequestClose={() =>
                                                    this.setState({
                                                        addMember: false,
                                                    })
                                                }
                                                isOpen={addMember}
                                            >
                                                <BandUser
                                                    season={season}
                                                    currentMembers={
                                                        fields.value
                                                    }
                                                    onClose={() =>
                                                        this.setState({
                                                            addMember: false,
                                                        })
                                                    }
                                                    onSubmit={value => {
                                                        push("users", value);
                                                        const index = this.state.previousValues.old_members
                                                            .map(function(e) {
                                                                return e.id;
                                                            })
                                                            .indexOf(value.id);

                                                        if (index >= 0)
                                                            remove(
                                                                "old_members",
                                                                index
                                                            );
                                                    }}
                                                />
                                            </Modal>
                                        </div>
                                    )}
                                </FieldArray>

                                <FieldArray name="old_members">
                                    {({ fields }) => (
                                        <div>
                                            <h3>
                                                {t(
                                                    "parameters:practice.bandForm.formerMembers"
                                                )}
                                            </h3>
                                            <div className="list-group bg-white">
                                                {fields.map((name, index) => (
                                                    <div
                                                        key={index}
                                                        className="list-group-item flex flex-row"
                                                    >
                                                        <div className="flex-fill">
                                                            <strong className="m-r">
                                                                <Field
                                                                    name={`${name}.first_name`}
                                                                    component={
                                                                        DisplayInput
                                                                    }
                                                                />
                                                                &nbsp;
                                                                <Field
                                                                    name={`${name}.last_name`}
                                                                    component={
                                                                        DisplayInput
                                                                    }
                                                                />
                                                            </strong>
                                                        </div>

                                                        <div className="flex-fill">
                                                            <i className="m-r">
                                                                <Field
                                                                    name={`${name}.joined_at`}
                                                                    component={
                                                                        DisplayInput
                                                                    }
                                                                />{" "}
                                                                &#x2794;&nbsp;
                                                                <Field
                                                                    name={`${name}.left_at`}
                                                                    component={
                                                                        DisplayInput
                                                                    }
                                                                />
                                                            </i>
                                                        </div>

                                                        <div className="flex-fill text-center">
                                                            <Field
                                                                name={`${name}.id`}
                                                                component={({
                                                                    input: {
                                                                        value,
                                                                    },
                                                                }) =>
                                                                    value >
                                                                    0 ? (
                                                                        <a
                                                                            className="btn btn-outline btn-sm btn-primary"
                                                                            href={`/users/${value}`}
                                                                        >
                                                                            {t(
                                                                                "parameters:practice.bandForm.viewProfile"
                                                                            )}
                                                                        </a>
                                                                    ) : (
                                                                        <div />
                                                                    )
                                                                }
                                                            />
                                                        </div>

                                                        <div className="flex-end">
                                                            <Field
                                                                inline
                                                                name={`${name}.instrument_id`}
                                                                prompt={t(
                                                                    "parameters:practice.bandForm.instrumentPrompt"
                                                                )}
                                                                validate={
                                                                    required
                                                                }
                                                                options={
                                                                    instrumentOptions
                                                                }
                                                                component={
                                                                    InputSelect
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </FieldArray>

                                <button
                                    className="btn btn-primary pull-right"
                                    type="submit"
                                >
                                    <i className="fa fa-save m-r-sm" />
                                    {t("common:actions.save")}
                                </button>
                            </form>
                        </div>
                    )}
                </Form>
            </div>
        );
    }
}

export default withTranslation("parameters")(BandForm);
