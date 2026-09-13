import moment from "moment";
import { retrieveUserLevel } from "./obj";
import { WEEKDAYS } from "./constants";
import i18n from "../i18n";
import { Activity, TimeInterval, User } from "../components/utils/entities";

export const twoDigits = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export const validateEmail = (email: string) => {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
};

export const toRawPhoneNumber = (value: string) => value.replace(/\s/gi, "");
export const prettifyPhoneNumber = (value: string) =>
    value
        ? value.replace(
              /(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/gi,
              "$1 $2 $3 $4 $5"
          )
        : "";

export const toBirthday = (value: string) => (value ? value.split("T")[0] : "");

export const toLocaleDate = (date: Date) =>
    date.toLocaleString(i18n.language, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
    });

export const toMonthName = (month: number) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(month - 1);
    return date.toLocaleString(i18n.language, { month: "long" });
};

export const toTimeRange = (obj: TimeInterval) => {
    const from = toDate(obj.start);
    const to = toDate(obj.end);

    return `Le ${toLocaleDate(from)} de ${from.toLocaleString(i18n.language, {
        hour: "numeric",
        minute: "numeric",
    })} à ${to.toLocaleString(i18n.language, {
        hour: "numeric",
        minute: "numeric",
    })}`;
};

export const toDateStr = (date: Date) =>
    `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

export const toHourMin = (date: Date) =>
    `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;

export const toDate = (datestr: string) => new Date(datestr);

export const timeToDate = (timestr: string, refDate = null) => {
    const date = new Date();
    const parsedTimeStr = timestr.split(":");

    date.setHours(parseInt(parsedTimeStr[0]), parseInt(parsedTimeStr[1]), 0, 0);

    if (refDate) {
        const refDateObj =
            typeof refDate === "string" ? toDate(refDate) : refDate;
        date.setFullYear(refDateObj.getFullYear());
        date.setMonth(refDateObj.getMonth());
        date.setDate(refDateObj.getDate());
    }

    return date;
};

export const toFullDateFr = (date: string) => {
    const tmpDate = new Date(date);

    return `${WEEKDAYS[tmpDate.getDay()]} ${tmpDate.getDate()} ${toMonthName(tmpDate.getMonth() + 1)} ${tmpDate.getFullYear()}`;
};

export const fullname = (user: User) =>
    `${(user.last_name || "").toUpperCase()} ${user.first_name}`;

export const fullnameWithAge = (user: User) =>
    `${fullname(user)}, ${moment().diff(user.birthday, "years")} ans`;

export const displayLevel = (
    user: User,
    activityRefId: number,
    seasonId: number
) => {
    const level = retrieveUserLevel(user, activityRefId, seasonId);
    return (level && `Niveau ${level}`) || "PAS DE NIVEAU";
};

/*
export const fullnameWithAgeAndLevel = (
    user: User,
    activityRefId,
    seasonId
) => {
    const level = retrieveUserLevel(user, activityRefId, seasonId);
    return `${fullnameWithAge(user)}${level ? `, niveau ${level}` : ""}`;
};
 */
export const toAge = (birthday: string) =>
    moment().diff(birthday, "years") > 0
        ? `${moment().diff(birthday, "years")} ans`
        : `${moment().diff(birthday, "months")} mois`;

export function formatActivityForDisplay(activity: Activity) {
    const ref = activity.activity_ref.label;
    const startTime = moment(activity.time_interval.start).format("HH:mm");
    const endTime = moment(activity.time_interval.end).format("HH:mm");
    const wday = new Intl.DateTimeFormat(i18n.language, {
        weekday: "long",
    }).format(new Date(activity.time_interval.start));

    return `${activity.group_name} ${ref} (${wday} de ${startTime} à ${endTime})`;
}

export function capitalFirstLetters(s: string) {
    if (!s) return "";

    const r = /\b\w/g;
    let res = "";
    let m;

    while ((m = r.exec(s)) !== null) {
        res += m[0].toUpperCase();
    }

    return res;
}

export const formatIntervalHours = (interval: TimeInterval) =>
    `${toHourMin(toDate(interval.start))} - ${toHourMin(toDate(interval.end))}`;

export const displayActivityRef = (ref: {
    activity_type?: string;
    label: string;
    kind: string;
}) => (ref.activity_type === "child" ? ref.label : ref.kind);

// `begin_at`/`stopped_at` (sourced from an ActivityApplication -- see occupationInfos below)
// are full "Paris-local midnight" ISO timestamps (e.g. "2024-06-01T00:00:00.000+02:00"), while
// `referenceDate` is a bare "YYYY-MM-DD" string. Comparing those two shapes directly with
// `<=`/`>` string comparison is only reliable when the calendar days differ: on the exact
// boundary day (e.g. a user whose `begin_at` IS the reference date) the longer timestamp string
// sorts after the bare date string, so `begin_at <= referenceDate` is wrongly `false` and the
// user is dropped from the headcount the very day they start (and kept one extra day after they
// stop). Slicing off everything from "T" onward -- same trick as `toBirthday` above -- compares
// like-for-like without going through `Date`/timezone conversion (which would reintroduce the
// browser-local-zone drift `PARIS_DATE_FORMAT_OPTIONS` works around elsewhere). `null`/`undefined`
// pass through unchanged so the existing "missing date excludes the user" semantics are preserved.
// Exported so every other begin_at/stopped_at-vs-referenceDate comparison in the app (e.g.
// courses/LessonList.jsx's headcount/reminder-list/color-coding call sites) can use the same
// date-only comparison instead of re-deriving (or forgetting) this fix independently.
export const dateOnly = (value?: string | null) => (value ? value.split("T")[0] : value);

export const occupationInfos = (
    activity: Activity,
    referenceDate?: string | null
) => {
    let headCount = 0;
    let validatedHeadCount = 0;
    let headCountLimit = 0;
    let hasOption = false;

    if (activity?.activity_ref?.is_work_group) {
        headCount = activity.activities_instruments.filter((ai) =>
            Boolean(ai.user_id)
        ).length;

        validatedHeadCount = activity.activities_instruments.filter(
            (ai) => Boolean(ai.user_id) && ai.is_validated
        ).length;

        headCountLimit = activity.activities_instruments.length;
        hasOption = headCount > validatedHeadCount;
    } else {
        const optionsUserIds = (activity.options || [])
            .map(
                (o) =>
                    o.user?.id ||
                    o.desired_activity?.activity_application?.user?.id
            )
            .filter(Boolean);

        hasOption = optionsUserIds.length > 0;

        const activeUsers = (activity.users || []).filter(
            (u) =>
                // Loose on purpose: `referenceDate` legitimately arrives as `null` (e.g. via
                // findAndGet's not-found default) as well as `undefined` -- both must mean "no
                // reference date filter", matching the original `referenceDate == undefined`.
                // A strict `=== undefined` check here misses the `null` case and ends up
                // comparing dates against `null` below, which drops every user.
                referenceDate == null ||
                // `dateOnly`'s signature accepts `string | null` (it's shared with call sites
                // that do pass a nullable value), which widens its return type here even though
                // `User.begin_at`/`stopped_at` are non-nullable -- the `as string` casts don't
                // change behavior, they just narrow back to what's already guaranteed.
                ((dateOnly(u.begin_at) as string) <= referenceDate &&
                    (dateOnly(u.stopped_at) == undefined ||
                        (dateOnly(u.stopped_at) as string) > referenceDate))
        );

        headCount = activeUsers.length + optionsUserIds.length;
        headCountLimit = activity?.activity_ref?.occupation_limit || 0;

        validatedHeadCount = activeUsers.filter(
            (u) => !optionsUserIds.includes(u.id)
        ).length;
    }

    return { headCount, validatedHeadCount, headCountLimit, hasOption };
};

export const isActivityWithOnlyOneOption = (
    activity: Activity,
    referenceDate?: string | null
) => {
    let { validatedHeadCount, headCount } = occupationInfos(
        activity,
        referenceDate
    );
    const options = headCount - validatedHeadCount;
    return validatedHeadCount === 0 && options === 1;
};

export const formatActivityHeadcount = (
    activity: Activity,
    referenceDate?: string | null
) => {
    let { headCount, validatedHeadCount, headCountLimit, hasOption } =
        occupationInfos(activity, referenceDate);

    const isFull = validatedHeadCount >= headCountLimit;
    const hasNoRole = headCountLimit === 0 && validatedHeadCount === 0;
    const options = headCount - validatedHeadCount;

    let styles = {};
    if (isFull && !hasNoRole) {
        styles = {
            ...styles,
            color: "#d63031",
            fontWeight: "bold",
        };
    }

    if (hasNoRole) {
        return (
            <p style={styles} data-tippy-content="Aucun rôle n'a été ajouté">
                {validatedHeadCount}
                {options > 0 && (
                    <span style={{ color: "#9575CD" }}> + {options}</span>
                )}
                {" / "}
                {headCountLimit}
                <i className="fas fa-info-circle m-l-xs" />
            </p>
        );
    }

    return (
        <p style={styles}>
            {validatedHeadCount === 0 && options > 0 ? (
                <span style={{ color: "#9575CD" }}>{options}</span>
            ) : (
                <>
                    {validatedHeadCount}
                    {options > 0 && (
                        <span style={{ color: "#9575CD" }}> + {options}</span>
                    )}
                </>
            )}
            {" / "}
            {headCountLimit}
            {isFull ? <i className="fas fa-lock m-l-xs" /> : null}
        </p>
    );
};
