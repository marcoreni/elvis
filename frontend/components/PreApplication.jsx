import React, { Fragment } from "react";
import { withTranslation, useTranslation } from "react-i18next";
import _ from "lodash";
import CurrentActivityItem from "./activityItems/CurrentActivityItem";
import NewActivityItem from "./activityItems/NewActivityItem";
import RenewActivityItem from "./activityItems/RenewActivityItem";
import UserAvatar from "./UserAvatar";

import moment from "moment";

class PreApplication extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { t } = this.props;
        const { season, current_user } = this.props;
        const today = new Date().toISOString();
        const newapp_opening_date = new Date(
            season.opening_date_for_new_applications
        ).toISOString();
        const preapp_opening_date = new Date(
            season.opening_date_for_applications
        ).toISOString();
        const closing_date = new Date(
            season.closing_date_for_applications
        ).toISOString();

        const isNewApplicationOpened =
            today >= newapp_opening_date && today <= closing_date;
        const allowNewApplication =
            current_user.is_admin || isNewApplicationOpened;

        const isPreApplicationOpened =
            today >= preapp_opening_date && today <= closing_date;
        const allowPreApplication =
            current_user.is_admin || isPreApplicationOpened;

        const hasChildhoodLesson =
            this.props.pre_application.pre_application_activities.find(
                a => _.get(a, "activity.activity_ref.activity_type") === "child"
            ) !== undefined;

        const inscription_path = `/inscriptions/new`;
        const user_path = "/users/" + current_user.id;

        const isMainAccount = this.props.is_main_account;

        let openingApplication = moment(
            this.props.season.opening_date_for_new_applications
        );
        let closingApplication = moment(
            this.props.season.closing_date_for_applications
        );

        return (
            <React.Fragment>
                <div className="padding-page ml-4">
                    <div className="activity-header row mr-2">
                        <div className="d-inline-flex justify-content-between align-items-center w-100">
                            <h1 style={{ color: "#00283B" }}>
                                {isMainAccount
                                    ? t(
                                          "activityApplications:preApplication.familyTitle"
                                      )
                                    : t(
                                          "activityApplications:preApplication.myTitle"
                                      )}
                            </h1>

                            {hasChildhoodLesson ? null : (
                                <a
                                    className={`btn btn-sm font-weight-bold ${!allowNewApplication &&
                                        "disabled"}`}
                                    style={{
                                        backgroundColor: "#00334A",
                                        color: "white",
                                        borderRadius: "8px",
                                    }}
                                    title={
                                        !allowNewApplication
                                            ? t(
                                                  "activityApplications:preApplication.newApplicationNotStarted"
                                              )
                                            : null
                                    }
                                    href={
                                        allowNewApplication && inscription_path
                                    }
                                >
                                    <i className="fas fa-plus" />
                                    <span className="ml-3">
                                        {t(
                                            "activityApplications:preApplication.newApplication"
                                        )}
                                    </span>
                                </a>
                            )}
                        </div>
                        <div className="row m-2">
                            <h4 className="mb-5" style={{ color: "#8AA4B1" }}>
                                {t(
                                    "activityApplications:preApplication.activitiesRegistrationFor",
                                    { season: this.props.season.label }
                                )}
                            </h4>
                            <div className="col-xl-6 d-md-inline-flex justify-content-between p-0 pr-md-5 pr-xl-0">
                                <div
                                    className="card col mr-3 mb-3"
                                    style={{
                                        border: "none",
                                        borderRadius: "12px",
                                    }}
                                >
                                    <div className="row d-inline-flex align-items-center p-3">
                                        <div
                                            style={{
                                                backgroundColor: "#E2EDF3",
                                                borderRadius: "50px",
                                                width: "50px",
                                                height: "50px",
                                                margin: "10px 20px 10px 10px",
                                            }}
                                        ></div>
                                        <div>
                                            <h5
                                                className="card-title"
                                                style={{
                                                    color: "#00283B",
                                                    fontSize: "14px",
                                                }}
                                            >
                                                {t(
                                                    "activityApplications:preApplication.reRegistrationPeriod"
                                                )}{" "}
                                                <i className="fas fa-inf-circle"></i>
                                            </h5>
                                            <h6
                                                className="card-subtitle mb-2 text-muted"
                                                style={{ fontSize: "14px" }}
                                            >
                                                {t(
                                                    "activityApplications:preApplication.closesOn",
                                                    {
                                                        date: closingApplication.format(
                                                            "DD MMMM YYYY"
                                                        ),
                                                    }
                                                )}
                                            </h6>
                                            <div>
                                                {isPreApplicationOpened ? (
                                                    <span className="badge badge-success">
                                                        {t(
                                                            "activityApplications:preApplication.open"
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-danger">
                                                        {t(
                                                            "activityApplications:preApplication.closed"
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="card col mb-3"
                                    style={{
                                        border: "none",
                                        borderRadius: "12px",
                                    }}
                                >
                                    <div className="row d-inline-flex align-items-center p-3">
                                        <div
                                            style={{
                                                backgroundColor: "#E2EDF3",
                                                borderRadius: "50px",
                                                width: "50px",
                                                height: "50px",
                                                margin: "10px 20px 10px 10px",
                                            }}
                                        ></div>
                                        <div>
                                            <h5
                                                className="card-title"
                                                style={{
                                                    color: "#00283B",
                                                    fontSize: "14px",
                                                }}
                                            >
                                                {t(
                                                    "activityApplications:preApplication.registrationPeriod"
                                                )}{" "}
                                                <i className="fas fa-info-circle"></i>
                                            </h5>
                                            <h6
                                                className="card-subtitle mb-2 text-muted"
                                                style={{ fontSize: "14px" }}
                                            >
                                                {t(
                                                    "activityApplications:preApplication.opensOn",
                                                    {
                                                        date: openingApplication.format(
                                                            "DD MMMM YYYY"
                                                        ),
                                                    }
                                                )}
                                            </h6>
                                            <div>
                                                {isNewApplicationOpened ? (
                                                    <span className="badge badge-success">
                                                        {t(
                                                            "activityApplications:preApplication.open"
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-danger">
                                                        {t(
                                                            "activityApplications:preApplication.closed"
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {isMainAccount
                        ? this.renderMainAccountView(allowPreApplication)
                        : this.renderAttachedAccountView(allowPreApplication)}

                    <div className="row">
                        {this.props.user.id == this.props.current_user.id ? (
                            <a
                                href={user_path}
                                className="btn btn-primary btn-sm btn-outline mt-5"
                                style={{ borderRadius: "8px" }}
                            >
                                <i className="fas fa-users" />{" "}
                                {t(
                                    "activityApplications:preApplication.backToMyProfile"
                                )}
                            </a>
                        ) : (
                            <a
                                href={"/users/" + this.props.user.id}
                                className="btn btn-primary btn-sm btn-outline mt-5"
                                style={{ borderRadius: "8px" }}
                            >
                                <i className="fas fa-users" />{" "}
                                {t(
                                    "activityApplications:preApplication.backToProfile"
                                )}
                            </a>
                        )}
                    </div>
                </div>
            </React.Fragment>
        );
    }

    renderMainAccountView(allowPreApplication) {
        const { t } = this.props;
        let allCurrentActivityList = _.chain(
            this.props.all_current_activities || []
        )
            .sortBy(activity => [activity.member_info.full_name, activity.id])
            .map((current_application_activity, i) => (
                <Fragment key={`all-current-${i}`}>
                    {current_application_activity.desired_activities.map(
                        (desired_activity, j) => (
                            <CurrentActivityItem
                                key={`${i}-${j}`}
                                current_user={this.props.current_user}
                                authToken={this.props.user.authentication_token}
                                data={desired_activity}
                                pre_application_activity={
                                    current_application_activity.pre_application_activity
                                }
                                user={{
                                    ...this.props.user,
                                    id:
                                        current_application_activity.member_info
                                            .id,
                                    first_name:
                                        current_application_activity.member_info
                                            .first_name,
                                    last_name:
                                        current_application_activity.member_info
                                            .last_name,
                                    full_name:
                                        current_application_activity.member_info
                                            .full_name,
                                }}
                                allowPreApplication={allowPreApplication}
                                current_activity_application={
                                    current_application_activity
                                }
                                member_info={
                                    current_application_activity.member_info
                                }
                            />
                        )
                    )}
                </Fragment>
            ))
            .value();

        const hasFamilyCurrentActivities = allCurrentActivityList.length > 0;

        const familyMembersSections = (
            this.props.family_members_data || []
        ).map((memberData, index) => {
            return this.renderMemberSection(
                memberData,
                allowPreApplication,
                index
            );
        });

        return (
            <Fragment>
                {hasFamilyCurrentActivities && (
                    <div className="row col-md-12 mb-4 p-0">
                        <h3 style={{ color: "#8AA4B1", fontWeight: "bold" }}>
                            {this.props.user.id == this.props.current_user.id
                                ? t(
                                      "activityApplications:preApplication.currentActivitiesMyAccount",
                                      {
                                          range: `${moment(
                                              this.props.previous_season.start
                                          ).format("YYYY")}/${moment(
                                              this.props.previous_season.end
                                          ).format("YYYY")}`,
                                      }
                                  )
                                : t(
                                      "activityApplications:preApplication.currentActivitiesAccount",
                                      {
                                          range: `${moment(
                                              this.props.previous_season.start
                                          ).format("YYYY")}/${moment(
                                              this.props.previous_season.end
                                          ).format("YYYY")}`,
                                      }
                                  )}
                        </h3>
                        <div className="col-sm-12 col-xl-6 p-0">
                            <table
                                className="table table-borderless bg-white"
                                style={{
                                    borderRadius: "12px",
                                    overflow: "hidden",
                                }}
                            >
                                <thead>
                                    <tr
                                        style={{
                                            backgroundColor: "#00334A",
                                            color: "white",
                                        }}
                                    >
                                        <th
                                            style={{
                                                borderRadius: "12px 0 0 0",
                                            }}
                                        >
                                            {t(
                                                "activityApplications:preApplication.colActivity"
                                            )}
                                        </th>
                                        <th>
                                            {t(
                                                "activityApplications:preApplication.colMember"
                                            )}
                                        </th>
                                        <th
                                            style={{
                                                borderRadius: "0 12px 0 0",
                                            }}
                                        ></th>
                                    </tr>
                                </thead>
                                <tbody>{allCurrentActivityList}</tbody>
                            </table>
                        </div>
                    </div>
                )}

                {familyMembersSections}
            </Fragment>
        );
    }

    renderAttachedAccountView(allowPreApplication) {
        const { t } = this.props;
        let currentActivityList = _.chain(
            this.props.current_activity_applications || []
        )
            .sortBy(paa => paa.id)
            .map((current_application_activity, i) => (
                <Fragment key={`current-${i}`}>
                    {current_application_activity.desired_activities.map(
                        (desired_activity, j) => (
                            <CurrentActivityItem
                                key={`${i}-${j}`}
                                current_user={this.props.current_user}
                                authToken={this.props.user.authentication_token}
                                data={desired_activity}
                                pre_application_activity={
                                    current_application_activity.pre_application_activity
                                }
                                user={this.props.user}
                                allowPreApplication={allowPreApplication}
                                current_activity_application={
                                    current_application_activity
                                }
                            />
                        )
                    )}
                </Fragment>
            ))
            .value();

        const hasCurrentActivities = currentActivityList.length > 0;

        const renewActivityList = _.chain(
            this.props.pre_application &&
                this.props.pre_application.pre_application_activities
                ? this.props.pre_application.pre_application_activities
                : []
        )
            .sortBy(paa => paa.id)
            .filter(
                paa =>
                    paa.action === "renew" || paa.action === "pursue_childhood"
            )
            .map((pre_application_activity, i) => (
                <RenewActivityItem
                    key={`renew-${i}`}
                    current_user={this.props.current_user}
                    authToken={this.props.user.authentication_token}
                    pre_application_activity={pre_application_activity}
                    user={this.props.user}
                    allowPreApplication={allowPreApplication}
                    confirm_activity_text={
                        this.props.confirm_activity_text
                            ? this.props.confirm_activity_text.value
                            : null
                    }
                    default_activity_status_id={
                        this.props.default_activity_status_id
                    }
                />
            ))
            .value();

        let newActivityList = _.chain(
            this.props.new_activities_applications || []
        )
            .sortBy(paa => paa.id)
            .map((new_activity_application, i) => (
                <NewActivityItem
                    key={`new-${i}`}
                    current_user={this.props.current_user}
                    authToken={this.props.user.authentication_token}
                    user_id={this.props.user.id}
                    user={this.props.user}
                    new_activity_application={new_activity_application}
                    confirm_activity_text={
                        this.props.confirm_activity_text
                            ? this.props.confirm_activity_text.value
                            : null
                    }
                    default_activity_status_id={
                        this.props.default_activity_status_id
                    }
                />
            ))
            .value();

        const othersActivities = _.chain(this.props.family_users || [])
            .map((user, i) => {
                return (
                    <OtherActivityItem
                        key={`other-${i}`}
                        user={user}
                        season={this.props.season}
                    />
                );
            })
            .value();

        function displayActivityList(
            renewActivityList,
            newActivityList,
            emptyMessage
        ) {
            let result = [];
            if (renewActivityList.length > 0) {
                result.push(renewActivityList);
            }
            if (newActivityList.length > 0) {
                result.push(newActivityList);
            }
            if (result.length === 0) {
                result.push(
                    <tr key="empty">
                        <td colSpan="12" className="text-center">
                            <i>{emptyMessage}</i>
                        </td>
                    </tr>
                );
            }
            return result;
        }

        return (
            <Fragment>
                {hasCurrentActivities && (
                    <div className="row col-md-12 mb-4 p-0">
                        <h3 style={{ color: "#8AA4B1", fontWeight: "bold" }}>
                            {t(
                                "activityApplications:preApplication.currentActivitiesWithSeason",
                                {
                                    range: `${moment(
                                        this.props.previous_season.start
                                    ).format("YYYY")}/${moment(
                                        this.props.previous_season.end
                                    ).format("YYYY")}`,
                                }
                            )}
                        </h3>
                        <div className="col-sm-12 col-xl-6 p-0">
                            <table
                                className="table table-striped"
                                style={{
                                    borderRadius: "12px",
                                    overflow: "hidden",
                                }}
                            >
                                <thead>
                                    <tr
                                        style={{
                                            backgroundColor: "#00334A",
                                            color: "white",
                                        }}
                                    >
                                        <th
                                            style={{
                                                borderRadius: "12px 0 0 0",
                                            }}
                                        >
                                            {t(
                                                "activityApplications:preApplication.colActivity"
                                            )}
                                        </th>
                                        <th>
                                            {t(
                                                "activityApplications:preApplication.colMember"
                                            )}
                                        </th>
                                        <th
                                            style={{
                                                borderRadius: "0 12px 0 0",
                                            }}
                                        ></th>
                                    </tr>
                                </thead>
                                <tbody>{currentActivityList}</tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="row col-md-12 mb-4 p-0">
                    <h3 style={{ color: "#8AA4B1", fontWeight: "bold" }}>
                        {t(
                            "activityApplications:preApplication.myRequestsFor",
                            {
                                name: `${this.props.user.first_name} ${this.props.user.last_name}`,
                            }
                        )}
                    </h3>

                    <div className="col-sm-12 p-0">
                        <table
                            className="table table-striped"
                            style={{ borderRadius: "12px", overflow: "hidden" }}
                        >
                            <tbody>
                                {displayActivityList(
                                    renewActivityList,
                                    newActivityList,
                                    t(
                                        "activityApplications:preApplication.noPendingApplications",
                                        {
                                            name: `${this.props.user.first_name} ${this.props.user.last_name}`,
                                        }
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="row col-md-12 p-0">
                    {this.props.family_users &&
                    this.props.family_users.length > 0 ? (
                        <Fragment>
                            <h3
                                style={{ color: "#8AA4B1", fontWeight: "bold" }}
                            >
                                {t(
                                    "activityApplications:preApplication.otherFamilyRegistrations"
                                )}
                            </h3>
                            {othersActivities}
                        </Fragment>
                    ) : null}
                </div>
            </Fragment>
        );
    }

    renderMemberSection(memberData, allowPreApplication, index) {
        const { t } = this.props;
        const { user, renew_activities, new_activities } = memberData;

        const renewActivityList = _.chain(renew_activities || [])
            .sortBy(paa => paa.id)
            .map((pre_application_activity, i) => (
                <RenewActivityItem
                    key={`renew-${user.id}-${i}`}
                    current_user={this.props.current_user}
                    authToken={user.authentication_token}
                    pre_application_activity={pre_application_activity}
                    user={memberData} // Passer les données du membre
                    allowPreApplication={allowPreApplication}
                    confirm_activity_text={
                        this.props.confirm_activity_text
                            ? this.props.confirm_activity_text.value
                            : null
                    }
                    default_activity_status_id={
                        this.props.default_activity_status_id
                    }
                />
            ))
            .value();

        const newActivityList = _.chain(new_activities || [])
            .sortBy(activity => activity.id)
            .map((new_activity_application, i) => (
                <NewActivityItem
                    key={`new-${user.id}-${i}`}
                    current_user={this.props.current_user}
                    authToken={user.authentication_token}
                    user_id={user.id}
                    user={memberData} // Passer les données du membre
                    new_activity_application={new_activity_application}
                    confirm_activity_text={
                        this.props.confirm_activity_text
                            ? this.props.confirm_activity_text.value
                            : null
                    }
                    default_activity_status_id={
                        this.props.default_activity_status_id
                    }
                />
            ))
            .value();

        const displayActivityList = (renewList, newList, emptyMessage) => {
            let result = [];
            if (renewList.length > 0) {
                result.push(...renewList);
            }
            if (newList.length > 0) {
                result.push(...newList);
            }
            if (result.length === 0) {
                result.push(
                    <tr key={`empty-${user.id}`}>
                        <td colSpan="12" className="text-center">
                            <i>{emptyMessage}</i>
                        </td>
                    </tr>
                );
            }
            return result;
        };

        return (
            <div
                key={`member-section-${user.id}`}
                className="row col-md-12 mb-5 p-0"
            >
                <div className="d-flex align-items-center mb-3">
                    <h3
                        className="mb-0"
                        style={{ color: "#8AA4B1", fontWeight: "bold" }}
                    >
                        {t("activityApplications:preApplication.requestsOf", {
                            name: user.full_name,
                        })}
                    </h3>
                </div>

                <div className="col-sm-12 p-0">
                    {displayActivityList(
                        renewActivityList,
                        newActivityList,
                        t(
                            "activityApplications:preApplication.noPendingApplications",
                            { name: `${user.first_name} ${user.last_name}` }
                        )
                    )}
                </div>
            </div>
        );
    }
}

function OtherActivityItem({ user, season }) {
    const { t } = useTranslation("activityApplications");

    // let strting_activities = (_.get(user, "pre_application.pre_application_activities") || [])
    //     .map(pa => `${_.get(pa, "activity.activity_ref.label")} (${displayDateForSeason(pa, season)})`).join(" - ");
    //
    // if (strting_activities.length === 0) {
    //     strting_activities = (_.get(user, "pre_application.pre_application_desired_activities") || [])
    //         .map(pa => `${_.get(pa, "desired_activity.activity_ref.label")} (X))`).join(" - ");
    // }

    return (
        <div
            className="card col-sm-5 col-xl-3 mr-4 mb-4"
            style={{ border: "none", borderRadius: "12px" }}
        >
            <div className="d-inline-flex align-items-center justify-content-between p-3">
                <UserAvatar user={user} size={50} />
                <div>
                    <h5 className="m-0">{user.full_name}</h5>
                </div>
                <div className="text-rigth">
                    <a
                        href={`/new_application/${user.id}`}
                        className="btn btn-primary btn-sm"
                        style={{ borderRadius: "8px" }}
                    >
                        {t(
                            "activityApplications:preApplication.manageRegistration"
                        )}
                    </a>
                </div>
            </div>
        </div>
    );
}

export default withTranslation("activityApplications")(PreApplication);
