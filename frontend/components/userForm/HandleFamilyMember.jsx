import React from "react";
import _ from "lodash";
import Swal from "sweetalert2";
import Modal from "react-modal";
import { withTranslation } from "react-i18next";

import { modalStyle } from "../../tools/constants";
import * as api from "../../tools/api";
import ContactForm from "./ContactForm";

class HandleFamilyMember extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isModalOpen: false,
            selectedFamilyMember: -1,
            familyMember: {},
        };
        this.toggleModal = this.toggleModal.bind(this);
    }

    onSubmit = (values, form) => {
        const { t } = this.props;
        let url = "/users/" + this.props.user.id + "/update_family";
        let user = this.props.user;
        let { familyMember } = this.props;

        user.family = [
            {
                ...values,
                initial_is_inverse: familyMember && familyMember.is_inverse,
                attach_to_user: values.is_attached,
            },
        ];

        const memberName = values.first_name + " " + values.last_name;
        const userName =
            this.props.user.first_name + " " + this.props.user.last_name;

        api.put(url, {
            user: user,
            has_mdp: true,
        }).then(({ data, error }) => {
            let title = "";
            if (error) {
                title = t("users:handleFamilyMember.errorAdd", {
                    member: memberName,
                    user: userName,
                });
            } else if (this.props.familyMember) {
                title += t("users:handleFamilyMember.linkModified", {
                    member: memberName,
                    user: userName,
                });
            } else {
                title += t("users:handleFamilyMember.linkAdded", {
                    member: memberName,
                    user: userName,
                });
            }

            console.log(error);
            let htmltext = "";
            let confirmtext = t("common:actions.close");
            Swal.fire({
                title: title,
                html: htmltext,
                // timer: 10000,
                allowOutsideClick: false,
                confirmButtonText: confirmtext,
            }).then(() => {
                this.toggleModal();
                this.setTabToFamilyAndReload();
            });
        });
    };

    setTabToFamilyAndReload() {
        if (document.location.search.indexOf("tab=") > -1)
            document.location.replace(
                document.location.href.replace(/tab=[a-zA-Z]*&+/, "tab=family&")
            );
        else document.location = document.location + "?tab=family";
    }

    onDelete = values => {
        const { t } = this.props;
        let { familyMember, user } = this.props;
        const memberName =
            familyMember.first_name + " " + familyMember.last_name;
        const userName = user.first_name + " " + user.last_name;
        let title = t("users:handleFamilyMember.deleteTitle");
        let htmltext = t("users:handleFamilyMember.deleteBody", {
            member: memberName,
            user: userName,
        });
        let confirmtext = t("users:handleFamilyMember.deleteConfirm");
        Swal.fire({
            title: title,
            html: htmltext,
            allowOutsideClick: true,
            showCancelButton: true,
            confirmButtonText: confirmtext,
            cancelButtonText: t("users:handleFamilyMember.deleteCancel"),
        }).then(res => {
            if (res.value) {
                api.set()
                    .del(`/members/${this.props.familyMember.link_id}`)
                    .then(({ data, error }) => {
                        error
                            ? Swal.fire({
                                  title: t(
                                      "users:handleFamilyMember.errorTitle"
                                  ),
                                  html: t(
                                      "users:handleFamilyMember.errorHtml",
                                      { error }
                                  ),
                                  confirmButtonText: t("common:actions.close"),
                              })
                            : this.setTabToFamilyAndReload();
                    });
            }
        });
    };

    onClose = res => {
        this.toggleModal();
    };

    toggleModal() {
        this.setState({ isModalOpen: !this.state.isModalOpen });
    }

    render() {
        const { t } = this.props;
        const { isModalOpen } = this.state;
        const {
            user,
            current_user,
            familyMember,
            content_label,
            toggle_title,
            toggle_add_button,
            toggle_edit_buton,
            toggle_delete_button,
        } = this.props;
        const formattedInitialValues = familyMember
            ? { ...familyMember, is_attached: !!familyMember.attached_to_id }
            : {
                  addresses: user.addresses,
                  telephones: user.telephones,
                  email: user.email,
                  is_inverse: true,
                  is_attached: !!user.attached_to_id,
              };

        let user_fname, user_lname, member_fname, member_lname;
        if (!_.isEmpty(familyMember)) {
            [
                user_fname,
                user_lname,
                member_fname,
                member_lname,
            ] = formattedInitialValues.is_inverse
                ? [
                      user.first_name,
                      user.last_name,
                      familyMember.first_name,
                      familyMember.last_name,
                  ]
                : [
                      familyMember.first_name,
                      familyMember.last_name,
                      user.first_name,
                      user.last_name,
                  ];
        }
        return (
            <div className="col pl-3">
                {toggle_add_button && (
                    <a
                        className="btn btn-success"
                        onClick={this.toggleModal}
                        title={t("users:handleFamilyMember.addTooltip")}
                    >
                        <i className="fas fa-plus" />
                        {toggle_title &&
                            " " + t("users:handleFamilyMember.addButton")}
                    </a>
                )}
                {toggle_edit_buton && (
                    <a
                        className="btn btn-primary m-0"
                        onClick={this.toggleModal}
                        title={t("users:handleFamilyMember.editTooltip")}
                    >
                        <i className="fas fa-pen" />
                        {toggle_title && " " + t("common:actions.edit")}
                    </a>
                )}
                {toggle_delete_button && (
                    <a
                        className="btn btn-warning"
                        onClick={this.onDelete}
                        title={t("users:handleFamilyMember.deleteTooltip")}
                    >
                        <i className="fas fa-trash" />
                    </a>
                )}
                <Modal
                    isOpen={isModalOpen}
                    ariaHideApp={false}
                    onRequestClose={this.toggleModal}
                    style={{
                        content: {
                            top: "5%",
                            left: "25%",
                            right: "25%",
                        },
                    }}
                >
                    <h2 className="mt-0">{content_label}</h2>
                    {!_.isEmpty(familyMember) ? (
                        <h4>
                            {t("users:handleFamilyMember.linkFromTo", {
                                user: `${user_fname} ${user_lname}`,
                                member: `${member_fname} ${member_lname}`,
                            })}
                        </h4>
                    ) : (
                        <h4>
                            {t("users:handleFamilyMember.creatingLink", {
                                user: `${user.first_name} ${user.last_name}`,
                            })}
                        </h4>
                    )}
                    <ContactForm
                        user_linked={user}
                        current_user={current_user}
                        initialValues={formattedInitialValues}
                        onClose={res => this.onClose(res)}
                        onSubmit={this.onSubmit}
                    />
                </Modal>
            </div>
        );
    }
}

export default withTranslation("users")(HandleFamilyMember);
