import React, { useState, Fragment } from "react";
import _ from "lodash";
import { useTranslation } from "react-i18next";
import Checkbox from "../common/Checkbox";
import PropTypes from "prop-types";
import * as api from "../../tools/api";
import swal from "sweetalert2";
import moment from "moment";

/**
 * @param {{is_teacher: boolean, is_admin: boolean, adhesions: []}} user
 * @param {({}) => void} onSubmit
 * @returns {JSX.Element}
 * @constructor
 */
export default function Roles({ user, lessonsPlanned, onSubmit }) {
    const { t } = useTranslation("users");
    const [isTeacher, setIsTeacher] = useState(user.is_teacher);
    const [isAdmin, setIsAdmin] = useState(user.is_admin);

    function removeLessons() {
        api.set()
            .success(() => {
                swal({
                    title: t("users:roles.successTitle"),
                    type: "success",
                    text: t("users:roles.lessonsDeleted"),
                    width: "400px",
                    confirmButtonText: t("users:roles.ok"),
                }).then(() => {
                    setIsTeacher(false);
                });
            })
            .error(errorMsg => {
                console.error("error deleting activity instances : ", errorMsg);
                swal({
                    type: "error",
                    title: t("users:roles.errorTitle"),
                });
            })
            .del(`/teachers/${user.id}/activity_instances`);
    }

    function formatActivity(a) {
        const day = moment(a.time_interval.start).format("dddd");
        const startsAt = moment(a.time_interval.start).format("HH:mm");
        const endsAt = moment(a.time_interval.end).format("HH:mm");
        return (
            t("users:roles.courseLine", {
                label: a.activity_ref.label,
                day,
                start: startsAt,
                end: endsAt,
            }) + "<br/>"
        );
    }

    function getActivitiesList() {
        return api
            .set()
            .success(activities => {
                let res = "";
                const htmlText =
                    t("users:roles.coursesListIntro", { n: lessonsPlanned }) +
                    "<br/><br/>" +
                    _.reduce(
                        activities,
                        (res, activity) => res + formatActivity(activity),
                        res
                    );

                swal({
                    title: t("users:roles.coursesToReplace"),
                    type: "success",
                    html: htmlText,
                    confirmButtonText: t("users:roles.ok"),
                    width: 600,
                });
            })
            .error(errorMsg => {
                console.error("error fetching lessons : ", errorMsg);
                swal({
                    type: "error",
                    title: t("users:roles.errorTitle"),
                });
            })
            .get(`/teachers/${user.id}/activities/`);
    }

    function onChangeIsTeacher(isTeacher) {
        // dans le cas où on cherche à désactiver le rôle professeur, on doit prendre quelques précautions
        if (isTeacher && lessonsPlanned > 0) {
            swal({
                title: t("common:confirm.sure"),
                html: t("users:roles.hasUpcomingLessons", {
                    n: lessonsPlanned,
                }),
                confirmButtonText: t("users:roles.deleteThem"),
                cancelButtonText: t("users:roles.cancelAndView"),
                showCancelButton: true,
            }).then(res => {
                if (res.value) {
                    removeLessons();
                } else {
                    getActivitiesList();
                }
            });

            return;
        }

        setIsTeacher(!isTeacher);
    }

    return (
        <div className="padding-page application-form">
            <div className="ibox m-b-lg">
                <Checkbox
                    id="is_teacher"
                    label={t("users:list.table.roleBadges.teacher")}
                    input={{
                        checked: isTeacher,
                        onChange: () => onChangeIsTeacher(isTeacher),
                    }}
                />

                <Checkbox
                    id="is_admin"
                    label={t("users:list.table.roleBadges.admin")}
                    input={{
                        checked: isAdmin,
                        onChange: () => setIsAdmin(!isAdmin),
                    }}
                />

                <div className="w-100 text-right">
                    <button
                        className="btn btn-success"
                        onClick={() =>
                            onSubmit({
                                ...user,
                                is_teacher: isTeacher,
                                is_admin: isAdmin,
                            })
                        }
                    >
                        {t("common:actions.save")}
                    </button>
                </div>
            </div>
        </div>
    );
}

Roles.propTypes = {
    user: PropTypes.shape({
        is_admin: PropTypes.bool.isRequired,
        is_teacher: PropTypes.bool.isRequired,
        adhesions: PropTypes.arrayOf(
            PropTypes.shape({
                is_active: PropTypes.bool.isRequired,
                season_id: PropTypes.number.isRequired,
                validity_start_date: PropTypes.string,
                validity_end_date: PropTypes.string,
            })
        ),
    }),
};
