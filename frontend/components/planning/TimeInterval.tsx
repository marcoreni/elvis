import React from "react";
import moment from "moment";
import type { Room, Teacher, User } from "../utils/entities";

// No real caller found anywhere in app/views or frontend/ for this component (confirmed by grep
// across both trees, same situation as a few components in jsx-to-tsx batch 2 -- may be
// reachable only through a plugin's own ERB views, which this repo's grep can't see). Converted
// and typed as given rather than deleted, per this repo's "don't delete on 500 / looks dead"
// convention -- see docs/KnownIssues.md. With no live caller to verify shapes against, types
// below are built from exactly what this file itself reads, not asserted against a real
// serializer.

interface TimeIntervalActivity {
    id: number;
    room_id: number;
    users: User[];
    activity_ref_id: number;
    activity_ref: { label: string; kind?: string; occupation_limit?: number };
    location: { label: string };
    teachers_activities?: { is_main: boolean; user_id: number }[];
    options?: {
        desired_activity: { activity_application: { user_id: number } };
    }[];
}

// Pre-existing dual shape (not introduced here): `planning` is read either as an object exposing
// `time_intervals`, or directly as an array of `{ activity }` entries.
type PlanningWithIntervals = {
    time_intervals?: { activity: TimeIntervalActivity }[];
};
type PlanningAsIntervalList = { activity: TimeIntervalActivity }[];

interface TimeIntervalProps {
    uid?: string | number;
    kind?: string;
    is_validated?: boolean;
    activity?: TimeIntervalActivity;
    room_refs?: Room[];
    planning?: PlanningWithIntervals | PlanningAsIntervalList;
    user?: User & {
        activities?: { time_interval: { activity: TimeIntervalActivity } }[];
    };
    teachers?: Teacher[];
    displayOnly?: boolean;
    isTeacher?: boolean;
    isAdmin?: boolean;
    showTeacher?: boolean;
    handleDelete?: (uid?: string | number) => void;
    handleDeleteActivity?: (activityId: number) => void;
}

const getRoom = (rooms: Room[] | undefined, id: number) =>
    rooms?.find((r) => r.id == id);

// Kept as-is (commented-out real logic, always returns the placeholder) -- not this batch's
// concern on a component with no live caller.
function levelDisplay(_users: User[], _activityRefId: number): string {
    return "Banana";
}

function TimeInterval({
    uid,
    kind,
    is_validated,
    activity,
    room_refs,
    planning,
    user,
    teachers,
    displayOnly,
    isTeacher,
    isAdmin,
    showTeacher,
    handleDelete,
    handleDeleteActivity,
}: TimeIntervalProps) {
    function handleClick(e: React.MouseEvent) {
        e.stopPropagation();
        handleDelete && handleDelete(uid);
    }

    function handleActivityDelete(e: React.MouseEvent) {
        e.stopPropagation();
        activity && handleDeleteActivity && handleDeleteActivity(activity.id);
    }

    let label = "";
    switch (kind) {
        case "o":
            label = "Option";
            break;
        case "c":
            label = "Cours";
            break;
        case "p":
        default:
            label = "Dispo.";
            break;
    }

    const styleOptions = { color: "#9575CD" };

    if (is_validated && activity) {
        const room = getRoom(room_refs, activity.room_id);

        let activities: TimeIntervalActivity[] = [];
        if (
            planning &&
            "time_intervals" in planning &&
            planning.time_intervals
        ) {
            activities = planning.time_intervals.map((ti) => ti.activity);
        } else if (Array.isArray(planning)) {
            activities = planning.map((ti) => ti.activity);
        }

        if (user && !user.is_teacher && !user.is_admin) {
            activities = (user.activities || []).map(
                (a) => a.time_interval.activity
            );
        }

        const teacherId = activity.teachers_activities?.find(
            (x) => x.is_main
        )?.user_id;
        const teacher = teacherId && teachers?.find((t) => t.id == teacherId);

        let levelAndAge = "";
        if (activity.users.length > 0) {
            const level = levelDisplay(
                activity.users,
                activity.activity_ref_id
            );
            const averageAge = Math.floor(
                activity.users
                    .map((u) => moment().diff(u.birthday, "years"))
                    .reduce((sum, val) => sum + val, 0) / activity.users.length
            );
            levelAndAge = ` - ${level} - ${averageAge} ans`;
        }

        const teacherName = teacher ? (
            <p>{`${teacher.first_name} ${teacher.last_name}`}</p>
        ) : null;

        let activityKind = "lesson";
        switch (activity.activity_ref.kind) {
            case "Enfance":
                activityKind = "enfance";
                break;
            case "CHAM":
                activityKind = "cham";
                break;
            case "ATELIERS":
                activityKind = "atelier";
                break;
        }

        const students = activity.users;
        const studentIds = students.map((s) => s.id);
        const options = (activity.options || []).filter(
            (o) =>
                !studentIds.includes(
                    o.desired_activity.activity_application.user_id
                )
        );

        return (
            <div
                className={`event event-${
                    activity.location.label == "Harfleur"
                        ? "harfleur"
                        : "lehavre"
                } ${activityKind}`}
            >
                <p>
                    <strong>{activity.activity_ref.label}</strong>
                    <br />
                    {room?.label}
                    {!displayOnly && is_validated && students.length == 0 ? (
                        <button onClick={handleActivityDelete}>
                            <i className="fas  fa-times-circle" />
                        </button>
                    ) : null}
                </p>

                {(isTeacher || isAdmin) && !showTeacher ? (
                    <p>
                        <span
                            style={
                                options.length != 0 ? styleOptions : undefined
                            }
                        >
                            {students.length + options.length}
                        </span>
                        / {activity.activity_ref.occupation_limit}
                        {levelAndAge}
                    </p>
                ) : (
                    teacherName
                )}
            </div>
        );
    }

    return (
        <div
            className={`event event-${kind} ${is_validated ? "event-validated" : ""}`}
        >
            <p>{label}</p>
            {!displayOnly && !is_validated ? (
                <button onClick={handleClick}>
                    <i className="fas  fa-times-circle" />
                </button>
            ) : null}
        </div>
    );
}

export default TimeInterval;
