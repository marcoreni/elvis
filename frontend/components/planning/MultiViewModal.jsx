import React, { Fragment } from "react";
import { withTranslation } from "react-i18next";
import { fullname } from "../../tools/format";

// SUB COMPONENTS
const TeacherItem = ({ schedule, teachers, t }) => {
    if (!schedule.activityInstance.cover_teacher_id) {
        return (
            <ListItem label={t("multiViewModal.teacher")} value={fullname(schedule.teacher)} />
        );
    }

    const coverTeacher = _.find(
        teachers,
        teacher => teacher.id === schedule.activityInstance.cover_teacher_id
    );

    if (!coverTeacher) {
        return null;
    }

    return (
        <li className="list-group-item">
            <p>
                <span className="font-bold">{t("multiViewModal.teacher")}</span>
                {" : "}
                {fullname(schedule.teacher)}
            </p>
            <p>
                <span className="font-bold">{t("multiViewModal.replacedBy")}</span>
                {" : "}
                {fullname(coverTeacher)}
            </p>
            <p>
                <span className="font-bold">
                    {t("multiViewModal.hoursCountedForAbsentTeacher")}
                </span>
                {" : "}
                {schedule.activityInstance.are_hours_counted ? t("multiViewModal.yes") : t("multiViewModal.no")}
            </p>
        </li>
    );
};

const ListItem = ({ label, value }) => (
    <li className="list-group-item">
        <span className="font-bold">{label}</span>
        {" : "}
        {value}
    </li>
);

const AvailabilityIntervalContent = ({schedule, onClose, t}) => <Fragment>
    <h3>{t("multiViewModal.availabilityDetails")}</h3>

    <ul class="list-group">
        <ListItem
            label={t("multiViewModal.schedule")}
            value={`${schedule.start._date.toLocaleString()} - ${schedule.end._date.toLocaleString()}`} />
        {schedule.raw.comment && <ListItem
            label={t("multiViewModal.comment")}
            value={schedule.raw.comment.content} />}
    </ul>
</Fragment>;

const ValidatedIntervalContent = ({schedule, attendees, teachers, onClose, t}) => <Fragment>
    <h3>{t("multiViewModal.slotDetails")}</h3>

    <ul className="list-group">
        {schedule.activity && schedule.activity.group_name ? (
            <ListItem
                label={t("multiViewModal.group")}
                value={schedule.activity.group_name}
            />
        ) : null}
        <ListItem label={t("kinds.course")} value={schedule.title} />
        <ListItem label={t("multiViewModal.room")} value={schedule.location} />
        <ListItem
            label={t("multiViewModal.schedule")}
            value={`${schedule.start._date.toLocaleString()} - ${schedule.end._date.toLocaleString()}`}
        />
        <TeacherItem teachers={teachers} schedule={schedule} t={t} />
        <ListItem
            label={t("multiViewModal.students")}
            value={
                attendees.length ? (
                    <ul>{attendees}</ul>
                ) : (
                    <span>{t("multiViewModal.none")}</span>
                )
            }
        />
        {schedule.raw.comment && <ListItem
            label={t("multiViewModal.comment")}
            value={schedule.raw.comment.content} />}
    </ul>

    <div className="flex flex-center-justified">
        <button className="btn btn-primary" onClick={onClose}>
            <i className="fas fa-times m-r-sm"></i>
            {t("common.close")}
        </button>
    </div>
</Fragment>;

// MAIN COMPONENT
class MultiViewModal extends React.PureComponent {
    constructor(props) {
        super(props);
    }

    render() {
        const { schedule, teachers, onClose, t } = this.props;

        // Do not render if schedule is falsy
        if (!schedule) {
            return null;
        }

        if(!schedule.activityInstance)
            return <AvailabilityIntervalContent
                    schedule={schedule}
                    onClose={onClose}
                    t={t} />;

        // Map attendees
        const attendees = Array.isArray(schedule.attendees)
            ? schedule.attendees.map(attendee => (
                  <li key={attendee.id}>{fullname(attendee)}</li>
              ))
            : [];

        // Render
        return <ValidatedIntervalContent
            teachers={teachers}
            schedule={schedule}
            onClose={onClose}
            attendees={attendees}
            t={t} />;
    }
}

export default withTranslation("planning")(MultiViewModal);
