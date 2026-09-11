import React, { Fragment } from "react";
import { withTranslation } from "react-i18next";

import NamePicker from "./NamePicker";

import moment from "moment";

class GeneralInfos extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { t } = this.props;
        const necessaryColor = { color: "#D63031" };

        const birthdayError =
            this.props.validationState &&
            this.props.validationState.failed.includes("birthday");
        const sexError =
            this.props.validationState &&
            this.props.validationState.failed.includes("sex");

        return (
            <Fragment>
                <div className="form form-group">
                    <NamePicker
                        user={this.props.user}
                        personSelection={"other"}
                        validationState={this.props.validationState}
                        infos={this.props.infos}
                        handleChangeInfos={e => this.props.handleChangeInfos(e)}
                        possibleMatches={this.props.possibleMatches}
                        handleSelectMatch={matchId =>
                            this.props.handleSelectMatch(matchId)
                        }
                    />
                    <div className="row">
                        <label className="col-md-2 col-sm-2 control-label">
                            {t("users:userForm.fields.birthday")}{" "}
                            <small className="text-danger">*</small>
                        </label>
                        <div
                            className={
                                "col-md-4 col-sm-3" +
                                (birthdayError ? " has-warning" : "")
                            }
                        >
                            <input
                                type="date"
                                className="form-control"
                                value={
                                    this.props.infos.birthday
                                        ? this.props.infos.birthday.split(
                                              "T"
                                          )[0]
                                        : ""
                                }
                                onChange={e => this.props.handleSelectAge(e)}
                            />
                            {this.props.infos.birthday ? (
                                <i>
                                    <small>
                                        {t("users:personalInfos.yearsOld", {
                                            n: moment().diff(
                                                moment(
                                                    this.props.infos.birthday
                                                ),
                                                "years"
                                            ),
                                        })}
                                    </small>
                                </i>
                            ) : null}
                            <p id="birthdayError" style={necessaryColor} />
                        </div>

                        <label className="col-md-2 col-sm-2 control-label">
                            {t("users:userForm.fields.sex")}{" "}
                            <small className="text-danger">*</small>
                        </label>
                        <div
                            className={
                                "col-md-4 col-sm-3" +
                                (sexError ? " has-warning" : "")
                            }
                        >
                            <select
                                className="form-control m-b"
                                name="sex"
                                value={this.props.infos.sex}
                                onChange={e => this.props.handleChangeInfos(e)}
                            >
                                <option value="0" disabled>
                                    {t("users:personalInfos.selectSex")}
                                </option>
                                <option value="F">
                                    {t("users:userForm.sexes.F")}
                                </option>
                                <option value="M">
                                    {t("users:userForm.sexes.M")}
                                </option>
                                <option value="A">
                                    {t("users:userForm.sexes.A")}
                                </option>
                            </select>
                            <p id="sexError" style={necessaryColor} />
                        </div>
                    </div>
                </div>
            </Fragment>
        );
    }
}

export default withTranslation("users")(GeneralInfos);
