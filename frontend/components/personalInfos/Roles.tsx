import React, { useState, Fragment } from "react";
import { useTranslation } from "react-i18next";
import Checkbox from "../common/Checkbox";
import * as api from "../../tools/api";
import swal from "sweetalert2";
import moment from "moment";

interface RolesUser {
    id: number;
    is_teacher: boolean;
    is_admin: boolean;
}

interface TeacherLesson {
    time_interval: { start: string; end: string };
    activity_ref: { label: string };
}

interface RolesProps {
    // Every real caller (UserEdit.jsx) passes this unconditionally -- `user.is_teacher`/
    // `user.is_admin` are read straight into useState below with no guard. The old
    // `PropTypes.shape(...)` also marked both fields (but not `user` itself) `.isRequired`.
    user: RolesUser;
    lessonsPlanned: number;
    onSubmit: (user: RolesUser) => void;
}

// Dropped from the old propTypes.user.shape: `adhesions` (declared but never read anywhere in
// this file -- confirmed by grep) and `validity_start_date`/`validity_end_date` that lived under
// it. Added `id`, which propTypes never declared despite being used unconditionally below.

export default function Roles({ user, lessonsPlanned, onSubmit }: RolesProps) {
    const { t } = useTranslation("users");
    const [isTeacher, setIsTeacher] = useState(user.is_teacher);
    const [isAdmin, setIsAdmin] = useState(user.is_admin);

    function removeLessons() {
        api.set()
            .success(() => {
                swal.fire({
                    title: t("users:roles.successTitle"),
                    icon: "success",
                    text: t("users:roles.lessonsDeleted"),
                    width: "400px",
                    confirmButtonText: t("users:roles.ok"),
                }).then(() => {
                    setIsTeacher(false);
                });
            })
            .error((errorMsg: unknown) => {
                console.error("error deleting activity instances : ", errorMsg);
                swal.fire({
                    icon: "error",
                    title: t("users:roles.errorTitle"),
                });
            })
            .del(`/teachers/${user.id}/activity_instances`);
    }

    function formatActivity(a: TeacherLesson) {
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
            .success((activities: TeacherLesson[]) => {
                const htmlText =
                    t("users:roles.coursesListIntro", { n: lessonsPlanned }) +
                    "<br/><br/>" +
                    activities.reduce(
                        (res, activity) => res + formatActivity(activity),
                        ""
                    );

                swal.fire({
                    title: t("users:roles.coursesToReplace"),
                    icon: "success",
                    html: htmlText,
                    confirmButtonText: t("users:roles.ok"),
                    width: 600,
                });
            })
            .error((errorMsg: unknown) => {
                console.error("error fetching lessons : ", errorMsg);
                swal.fire({
                    icon: "error",
                    title: t("users:roles.errorTitle"),
                });
            })
            .get(`/teachers/${user.id}/activities/`);
    }

    function onChangeIsTeacher(isTeacher: boolean) {
        // dans le cas où on cherche à désactiver le rôle professeur, on doit prendre quelques précautions
        if (isTeacher && lessonsPlanned > 0) {
            swal.fire({
                title: t("common:confirm.sure"),
                html: t("users:roles.hasUpcomingLessons", {
                    n: lessonsPlanned,
                }),
                confirmButtonText: t("users:roles.deleteThem"),
                cancelButtonText: t("users:roles.cancelAndView"),
                showCancelButton: true,
            }).then((res) => {
                if (res.isConfirmed) {
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
