import moment from "moment";
import { retrieveUserLevel } from "./obj";
import { WEEKDAYS } from "./constants";
import i18n from "../i18n";
import { Activity, TimeInterval, User } from "../components/evaluation/types";

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

export const occupationInfos = (activity: Activity, referenceDate?: string) => {
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
                referenceDate === undefined ||
                (u.begin_at <= referenceDate &&
                    (u.stopped_at == undefined || u.stopped_at > referenceDate))
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
    referenceDate?: string
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
    referenceDate?: string
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
