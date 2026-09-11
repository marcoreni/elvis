import React, { Fragment } from "react";
import { Field, Form, FormSpy } from "react-final-form";
import { withTranslation } from "react-i18next";

import arrayMutators from "final-form-arrays";
import { FieldArray } from "react-final-form-arrays";

import Input from "../common/Input";
import InputSelect from "../common/InputSelect";
import Checkbox from "../common/Checkbox";
import DisplayInput from "../common/DisplayInput";

import Modal from "react-modal";
import BandUser from "./BandUser";
import { __esModule } from "react-modal/lib/components/Modal";

import { redirectTo } from "../../tools/url";
import { required } from "../../tools/validators";

import * as api from "../../tools/api";

class BandCreator extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isOtherGenre: false,
            addMember: false,
            previousValues: {},
        };
    }

    handleSubmit(values) {
        api.set()
            .success(() => redirectTo("/parameters/practice_parameters"))
            .post("/practice/bands", values);
    }

    handleValuesChanged({ values }) {
        const { previousValues } = this.state;

        if (previousValues.music_genre_id !== values.music_genre_id)
            this.setState({
                isOtherGenre: values.music_genre_id === "0",
                previousValues: values,
            });
    }

    render() {
        const { t, musicGenres, bandTypes, instruments, season } = this.props;
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

        return (
            <div>
                <Form
                    mutators={{ ...arrayMutators }}
                    onSubmit={this.handleSubmit}
                >
                    {({ handleSubmit, values }) => (
                        <div className="row">
                            <form
                                className="col-lg-4 col-md-6"
                                onSubmit={handleSubmit}
                            >
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
                                                        className="list-group-item flex flex-center-aligned flex-space-between-justified"
                                                    >
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

                                                        <Field
                                                            inline
                                                            name={`${name}.instrument_id`}
                                                            prompt={t(
                                                                "parameters:practice.bandForm.instrumentPrompt"
                                                            )}
                                                            validate={required}
                                                            options={
                                                                instrumentOptions
                                                            }
                                                            component={
                                                                InputSelect
                                                            }
                                                        />

                                                        <button
                                                            type="button"
                                                            onClick={fields.remove.bind(
                                                                null,
                                                                index
                                                            )}
                                                            className="btn btn-sm btn-primary"
                                                        >
                                                            {t(
                                                                "parameters:practice.bandForm.removeMember"
                                                            )}
                                                        </button>
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
                                                    onSubmit={fields.push}
                                                />
                                            </Modal>
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

export default withTranslation("parameters")(BandCreator);
