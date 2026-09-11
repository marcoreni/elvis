import React from "react";
import { withTranslation } from "react-i18next";
import _ from "lodash";
import * as api from "../../../tools/api";
import UserSearch from "./UserSearch";
import swal from "sweetalert2";

class MergeUsers extends React.Component {
    CheckBoxType = ({ id, name, value }) => {
        return (
            <div>
                <input
                    type="checkbox"
                    id={id}
                    onClick={({ target }) =>
                        this.setState({
                            selectedDataToSave:
                                Math.max(this.state.selectedDataToSave, 0) +
                                value * (target["checked"] ? 1 : -1),
                        })
                    }
                />{" "}
                <label htmlFor={id}>{name}</label>
            </div>
        );
    };

    constructor(props) {
        super(props);

        this.state = {
            olUser: undefined,
            newUser: undefined,
            deleteOldUser: false,
            selectedDataToSave: -1,
        };
    }

    render() {
        const { t } = this.props;
        return (
            <div className="wrapper">
                {/*C'est horrible mais il n'est pas possible d'utiliser l'import css classique de réact...
            L'objet reste toujours vide.*/}
                <style>
                    {".onoffswitch-inner:before {\n" +
                        `    content: "${t(
                            "users:mergeUsers.switchDelete"
                        )}";\n` +
                        "    padding-left: 10px;\n" +
                        "    background-color: #1AB394;\n" +
                        "    color: #FFFFFF;\n" +
                        "}\n" +
                        "\n" +
                        ".onoffswitch-inner:after {\n" +
                        `    content: "${t(
                            "users:mergeUsers.switchKeep"
                        )}";\n` +
                        "    padding-right: 10px;\n" +
                        "    background-color: #FFFFFF;\n" +
                        "    color: #999999;\n" +
                        "    text-align: right;\n" +
                        "}\n" +
                        "\n" +
                        ".onoffswitch-switch {\n" +
                        "    display: block;\n" +
                        "    width: 18px;\n" +
                        "    margin: 0;\n" +
                        "    background: #FFFFFF;\n" +
                        "    border: 2px solid #1AB394;\n" +
                        "    border-radius: 3px;\n" +
                        "    position: absolute;\n" +
                        "    top: 0;\n" +
                        "    bottom: 0;\n" +
                        "    right: 192px;\n" +
                        "    transition: all 0.3s ease-in 0s;\n" +
                        "}"}
                </style>
                <div className="row">
                    <div className="col">
                        <UserSearch
                            saveFirstSelect={true}
                            onSelect={this.handleSelectUser.bind(this)}
                            resetSelection={this.handleReset.bind(this)}
                            season={this.props.season}
                        />
                    </div>
                </div>

                {this.state.newUser !== undefined ? (
                    <div>
                        <div className="row">
                            <div
                                className="onoffswitch"
                                style={{ width: "210px" }}
                            >
                                <input
                                    className="onoffswitch-checkbox"
                                    id="delete?"
                                    type="checkbox"
                                    value="test"
                                    onChange={() =>
                                        this.setState({
                                            deleteOldUser: !this.state
                                                .deleteOldUser,
                                        })
                                    }
                                />
                                <label
                                    className="onoffswitch-label"
                                    htmlFor="delete?"
                                >
                                    <span className="onoffswitch-inner" />
                                    <span className="onoffswitch-switch" />
                                </label>
                            </div>
                        </div>

                        <div className="row">
                            <div>
                                <input
                                    type="radio"
                                    id="saveNewData"
                                    name="dataSaved"
                                    checked={
                                        this.state.selectedDataToSave === -1
                                    }
                                    onChange={() =>
                                        this.setState({
                                            selectedDataToSave: -1,
                                        })
                                    }
                                />{" "}
                                <label htmlFor="saveNewData">
                                    {t("users:mergeUsers.keepNewUserData")}
                                </label>
                            </div>
                            <div>
                                <input
                                    type="radio"
                                    id="saveOldData"
                                    name="dataSaved"
                                    checked={
                                        this.state.selectedDataToSave === -2
                                    }
                                    onChange={() =>
                                        this.setState({
                                            selectedDataToSave: -2,
                                        })
                                    }
                                />{" "}
                                <label htmlFor="saveOldData">
                                    {t("users:mergeUsers.keepOldUserData")}
                                </label>
                            </div>
                            <div>
                                <input
                                    type="radio"
                                    id="othersData"
                                    name="dataSaved"
                                    checked={
                                        this.state.selectedDataToSave === -3 ||
                                        this.state.selectedDataToSave >= 0
                                    }
                                    onChange={() =>
                                        this.setState({
                                            selectedDataToSave: -3,
                                        })
                                    }
                                />{" "}
                                <label htmlFor="othersData">
                                    {t("users:mergeUsers.selectOldUserData")}{" "}
                                </label>
                                {this.state.selectedDataToSave === -3 ||
                                this.state.selectedDataToSave >= 0 ? (
                                    <div className="m-l-xl">
                                        {this.CheckBoxType({
                                            id: "first_name",
                                            name: t(
                                                "users:mergeUsers.fields.firstName"
                                            ),
                                            value: 1,
                                        })}
                                        {this.CheckBoxType({
                                            id: "last_name",
                                            name: t(
                                                "users:mergeUsers.fields.lastName"
                                            ),
                                            value: 2,
                                        })}
                                        {this.CheckBoxType({
                                            id: "email",
                                            name: t(
                                                "users:mergeUsers.fields.email"
                                            ),
                                            value: 4,
                                        })}
                                        {this.CheckBoxType({
                                            id: "birthday",
                                            name: t(
                                                "users:mergeUsers.fields.birthday"
                                            ),
                                            value: 8,
                                        })}
                                        {this.CheckBoxType({
                                            id: "address",
                                            name: t(
                                                "users:mergeUsers.fields.address"
                                            ),
                                            value: 16,
                                        })}
                                        {this.CheckBoxType({
                                            id: "is_teacher",
                                            name: t(
                                                "users:mergeUsers.fields.teacherRole"
                                            ),
                                            value: 32,
                                        })}
                                    </div>
                                ) : (
                                    ""
                                )}
                            </div>
                        </div>

                        <div className="row">
                            <p>
                                {t("users:mergeUsers.footnoteLine1")}
                                <br />
                                {t("users:mergeUsers.footnoteLine2")}
                            </p>
                        </div>

                        <div className="row">
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={this.handleFusion.bind(this)}
                            >
                                {t("common:actions.validate")}
                            </button>
                        </div>
                    </div>
                ) : (
                    ""
                )}
            </div>
        );
    }

    handleReset() {
        this.setState({ oldUser: undefined, newUser: undefined });
    }

    handleSelectUser(user) {
        const userState = {
            oldUser: this.state.oldUser,
            newUser: this.state.newUser,
            selectedDataToSave: -1,
            deleteOldUser: false,
        };

        if (userState.oldUser === undefined) userState.oldUser = user;
        else
            userState.newUser =
                user.id !== userState.oldUser.id ? user : undefined;

        this.setState(userState);
    }

    handleFusion() {
        const { t } = this.props;
        const oldU = this.state.oldUser;
        const newU = this.state.newUser;

        if (oldU === undefined || newU === undefined) return;

        swal({
            title: t("users:mergeUsers.confirmTitle"),
            text: this.state.deleteOldUser
                ? t("users:mergeUsers.confirmDeleteText")
                : undefined,
            type: "question",
            confirmButtonText: t("users:mergeUsers.yes"),
            showCancelButton: true,
            cancelButtonText: t("users:mergeUsers.no"),
        }).then(willMerge => {
            if (willMerge.value) {
                api.set()
                    .success(() => {
                        swal({
                            title: t("users:mergeUsers.successTitle"),
                            type: "success",
                            confirmButtonText: t("users:mergeUsers.ok"),
                        }).then(res => {
                            if (this.state.deleteOldUser)
                                window.location.reload();
                        });
                    })
                    .error(() => {
                        swal({
                            title: t("users:mergeUsers.errorTitle"),
                            type: "error",
                            confirmButtonText: t("users:mergeUsers.ok"),
                        });
                    })
                    .post("/scripts/merge_users/execute", {
                        old_user_id: oldU.id,
                        saved_user_id: newU.id,
                        delete: this.state.deleteOldUser,
                        dataToSave: this.state.selectedDataToSave,
                    });
            }
        });
    }
}

export default withTranslation("users")(MergeUsers);
