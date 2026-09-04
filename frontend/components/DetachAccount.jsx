import React, { Fragment, useEffect, useState } from "react";
import * as api from "../tools/api";
import Modal from "react-modal";
import ContactForm, { familyLinks } from "./userForm/ContactForm";
import { Field, Form } from "react-final-form";
import { required } from "../tools/validators";
import _ from "lodash";
import InlineYesNoRadio from "./common/InlineYesNoRadio";
import Input from "./common/Input";
import swal from "sweetalert2";

export default function DetachAccount({user, user_id, reload_data})
{
    const [userToDetach, setUserToDetach] = useState(user);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if(!user)
        {
            api.set()
                .success(u => setUserToDetach(u))
                .error(() => setUserToDetach(null))
                .get(`/users/${user_id}/infos`);
        }
    });

    if(userToDetach == null)
    {
        return <Fragment>
            <div className="alert alert-danger">
                Impossible de trouver l'utilisateur
            </div>
        </Fragment>
    }

    function onSubmit(values)
    {
        const sendData = {
            email: values.email,
            sendemail: values.sendemail
        }

        api.set()
            .success(() => {
                swal({
                    type: "success",
                    text: "Le compte a bien été détaché"
                }).then(() => reload_data())
            })
            .error(err =>
            {
                swal({
                    title: "Erreur",
                    text: err.message || "Une erreur est survenue",
                    type: "error"
                });
            })
            .del(`/users/${userToDetach.id}/detach`, sendData, {});
    }

    return <Fragment>
        <button className="btn btn-outline btn-danger m-2" onClick={() => setIsModalOpen(true)} type="button">
            Détacher
        </button>

        <Modal className="modal-sm"
            isOpen={isModalOpen}
            onRequestClose={() => setIsModalOpen(false)}
            contentLabel="Détacher le compte"
            appElement={document.body}
        >
            <div className="p-3">
                <div className="m-b-md">
                    <h4>Voulez-vous détacher l'utilisateur·rice {user.first_name} {user.last_name} ?</h4>
                    <p>
                        Ce dernier deviendra indépendant, c'est à dire qu'il pourra se connecter et gérer son compte.
                        Il vous est cependant toujours possible de gérer son compte si vous créez un lien familial avec lui.
                    </p>

                    <p>
                        Pour détacher un compte, vous devez lui ajouter une adresse email (si il n'en a pas déjà une). C'est à cette adresse que sera envoyé le lien lui permettant de se connecter.
                        NB : ce nouvel email ne doit pas être déjà affecté à un autre utilisateur.
                    </p>
                </div>
                <Form
                    onSubmit={onSubmit}
                    initialValues={{email: userToDetach.email, sendemail: false}}
                    >
                    {({handleSubmit, form}) => {

                        return <form onSubmit={handleSubmit}>
                            <div className="row">
                                <div className="col-sm">
                                    <label>email</label>
                                    <Field
                                        name="email"
                                        type="text"
                                        validate={required}
                                        render={Input} />
                                </div>
                            </div>

                            <div className="row m-b-sm">
                                <div className="col-sm">
                                    <div className="form-check">
                                        <Field type="checkbox" name="sendemail" className="form-check-input" component="input"/>
                                        <label className="form-check-label m-l-sm" htmlFor="sendemail">
                                            Envoyer l'email de notification
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-sm-6">
                                    <button className="btn btn-secondary" type="button"
                                            onClick={() => setIsModalOpen(false)}>
                                        Annuler
                                    </button>
                                </div>

                                <div className="col-sm-6">
                                    <button className="btn btn-danger" type="submit">
                                        Détacher
                                    </button>
                                </div>
                            </div>
                        </form>
                    }}
                </Form>
            </div>
        </Modal>
    </Fragment>
}