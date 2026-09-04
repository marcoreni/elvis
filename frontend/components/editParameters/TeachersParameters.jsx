import React, { Fragment, useState } from "react";
import PropTypes from "prop-types";
import * as api from "../../tools/api";
import swal from "sweetalert2";
import {useTranslation} from "react-i18next";

/**
 * Component for teachers parameters
 * @param {boolean} teacher_can_edit_planning
 * @param {boolean} authorize_teachers
 * @param {boolean} show_teacher_contacts
 * @param {boolean} teacher_can_manage_courses
 * @returns {JSX.Element}
 * @constructor
 */
export default function TeachersParameters({ teacher_can_edit_planning, authorize_teachers, show_teacher_contacts, teacher_can_manage_courses }) {
    const {t} = useTranslation("parameters");
    const [planningChecked, setPlanningChecked] = useState(teacher_can_edit_planning);
    const [permitTeacherActivities, setPermitTeacherActivities] = useState(authorize_teachers);
    const [showTeacherContacts, setShowTeacherContacts] = useState(show_teacher_contacts);
    const [teacherCanManageCourses, setTeacherCanManageCourses] = useState(teacher_can_manage_courses);

    function onSubmit() {
        swal.showLoading();

        api.set()
            .success((data) => {
                if (data.success) {
                    swal({
                        title: t("shared.saveSuccessTitle"),
                        text: t("editParameters.teachers.saveSuccessText"),
                        type: "success"
                    });

                    window.location.reload();
                }
                else {
                    swal({
                        title: t("shared.errorTitle"),
                        text: t("editParameters.teachers.saveErrorText"),
                        type: "error"
                    });
                }
            })
            .error(() => {
                swal({
                    title: t("shared.errorTitle"),
                    text: t("editParameters.teachers.saveErrorText"),
                    type: "error"
                });
            })
            .post("/parameters/teachers", {
                teacher_can_edit_planning: planningChecked,
                authorize_teachers: permitTeacherActivities,
                show_teacher_contacts: showTeacherContacts,
                teacher_can_manage_courses: teacherCanManageCourses
            }, {});
    }

    return (
        <Fragment>
            <h3 className="mt-5">{t("editParameters.teachers.planningHeading")}</h3>
            <div className="mb-sm-3 mt-3">
                <input
                    type="checkbox"
                    id="planningCheck"
                    checked={planningChecked}
                    onChange={() => setPlanningChecked(!planningChecked)}
                />
                &nbsp;
                <label className="ml-2 font-normal" htmlFor="planningCheck">
                    {t("editParameters.teachers.planningLabel")}
                </label>
            </div>

            <h3>{t("editParameters.teachers.applicationsHeading")}</h3>
            <div className="row">
                <div className="col-md-5">
                    <input
                        type="checkbox"
                        id="check"
                        checked={permitTeacherActivities}
                        onChange={() => setPermitTeacherActivities(!permitTeacherActivities)}
                    />
                    &nbsp;
                    <label className="ml-2 font-normal" htmlFor="check">
                        {t("editParameters.teachers.applicationsLabel")}
                    </label>
                </div>
            </div>

            <h3>{t("editParameters.teachers.contactsHeading")}</h3>
            <div className="mb-sm-3 mt-3">
                <input
                    type="checkbox"
                    id="showTeacherContactsCheck"
                    checked={showTeacherContacts}
                    onChange={() => setShowTeacherContacts(!showTeacherContacts)}
                />
                &nbsp;
                <label className="ml-2 font-normal" htmlFor="showTeacherContactsCheck">
                    {t("editParameters.teachers.contactsLabel")}
                </label>
            </div>

            <h3>{t("editParameters.teachers.coursesHeading")}</h3>
            <div className="mb-sm-3 mt-3">
                <input
                    type="checkbox"
                    id="teacherCanManageCoursesCheck"
                    checked={teacherCanManageCourses}
                    onChange={() => setTeacherCanManageCourses(!teacherCanManageCourses)}
                />
                &nbsp;
                <label className="ml-2 font-normal" htmlFor="teacherCanManageCoursesCheck">
                    {t("editParameters.teachers.coursesLabel")}
                </label>
            </div>

            <button className="btn btn-success no-margin pull-right" onClick={onSubmit}>
                {t("shared.saveButton")}
            </button>
        </Fragment>
    );
}

TeachersParameters.propTypes = {
    teacher_can_edit_planning: PropTypes.bool,
    authorize_teachers: PropTypes.bool,
    show_teacher_contacts: PropTypes.bool,
    teacher_can_manage_courses: PropTypes.bool
};
