import React, { useState, Fragment } from "react";
import { useTranslation } from "react-i18next";
import Checkbox from "../common/Checkbox";
import * as api from "../../tools/api";
import swal from "sweetalert2";
import moment from "moment";
import type { Activity, User } from "../utils/entities";

interface RolesProps {
    // The real `User` entity, not an ad-hoc `{id, is_teacher, is_admin}` slice: `onSubmit`
    // below spreads the ENTIRE `user` object back through (`{...user, is_teacher, is_admin}`),
    // so the prop has always genuinely been a full `User` -- the real caller (UserEdit.jsx:181,
    // `user={this.props.user}`) passes the full object. `is_admin` was missing from `User` in
    // entities.ts (a real `is_admin` column, app/models/user.rb) -- added there instead of
    // reinventing a narrower local type here (see docs/Jsx-To-Tsx-Migration-Playbook.md section 3).
    user: User;
    lessonsPlanned: number;
    onSubmit: (user: User) => void;
}

// Dropped from the old propTypes.user.shape: `adhesions` (declared but never read anywhere in
// this file -- confirmed by grep) and `validity_start_date`/`validity_end_date` that lived under
// it (both still absent from `User` in entities.ts, which is correct -- they're genuinely unread
// here).

export default function Roles({ user, lessonsPlanned, onSubmit }: RolesProps) {
    const { t } = useTranslation("users");
    // `User.is_teacher`/`.is_admin` are optional on the entity (not every serializer context
    // includes them) even though the real DB columns default to `false`, never `null` -- `??
    // false` keeps local state a plain `boolean`, matching the old (narrower) prop type's
    // `.isRequired` without reintroducing it.
    const [isTeacher, setIsTeacher] = useState(user.is_teacher ?? false);
    const [isAdmin, setIsAdmin] = useState(user.is_admin ?? false);

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

    function formatActivity(a: Activity) {
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
            .success((activities: Activity[]) => {
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
