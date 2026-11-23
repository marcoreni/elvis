import _ from "lodash";
import moment from "moment-timezone";
import type { Moment } from "moment";
import { ISO_DATE_FORMAT } from "../utils";
import { getActivityColor } from "../../tools/utils";
import { capitalFirstLetters } from "../../tools/format";
import i18n from "../../i18n";
import type {
    Activity,
    ActivityRef,
    Entity,
    EvaluationLevelRef,
    Level,
    Room,
    Season,
    TimeInterval,
    User,
} from "../utils/entities";

// A teacher-like reference that's always sent with a real id (indexed/compared by id below) --
// other User fields may or may not be populated depending on the producing endpoint.
type PartialUserWithId = Partial<User> & { id: number };

// The "activity" shape as read by formatIntervalsForSchedule below -- a partial view of the real
// `Activity` entity (activity_ref/teacher narrowed to partial too, since not every producer sends
// a full nested record), plus `location`, which activities_list_json sends but entities.ts's
// `Activity` doesn't model (see RawPlanning.tsx's `evaluation_level_ref_id` comment for the same
// kind of endpoint-specific gap).
type ScheduleActivity = Omit<Partial<Activity>, "activity_ref" | "teacher"> & {
    activity_ref?: Partial<ActivityRef>;
    teacher?: PartialUserWithId;
    location?: { label?: string };
};

interface ActivityInstanceLike {
    activity?: ScheduleActivity;
    room?: Room;
    room_id?: number | null;
    teacher?: PartialUserWithId;
    cover_teacher?: PartialUserWithId;
    are_hours_counted?: boolean;
}

interface ConflictInfo {
    activity_instance: { time_interval_id: number | string };
}

// The shared record shape flowing through this file: both the raw, string-dated API record
// (fetchIntervals/fetchInterval's resolved payload, indexById's input) and the UI "schedule"
// object formatIntervalsForSchedule/formatHolidays build from it -- the two are mixed back
// together in Planning.jsx (holidays pushed into the same array as raw intervals, then
// re-filtered through formatIntervalsForSchedule's `isAllDay` early-return), so one permissive,
// all-fields-optional-except-start/end interface models both rather than an artificial split.
export interface ScheduleInterval {
    id?: number | string;
    uid?: number | string;
    calendarId?: string;
    evaluation?: unknown;
    title?: string;
    location?: string;
    category?: string;
    start: string;
    end: string;
    isAllDay?: boolean;
    isReadOnly?: boolean;
    isValidated?: boolean;
    is_validated?: boolean;
    color?: string;
    bgColor?: string;
    borderColor?: string;
    dragBgColor?: string;
    attendees?: User[];
    kind?: string;
    // Partial<User> (not PartialUserWithId) -- formatIntervalsForSchedule below falls back to
    // `{}` when neither activity_instance.teacher nor activity.teacher is set (e.g. no main
    // teacher assigned), so this field can legitimately have no `id` at all.
    teacher?: Partial<User>;
    activity_instance?: ActivityInstanceLike;
    activity?: ScheduleActivity;
    raw?: ScheduleInterval;
    evaluation_appointment?: unknown;
    // Added client-side by Planning.jsx's fetchIntervals (`{...int, owner_id: ...}`), not part of
    // the raw API payload itself.
    owner_id?: number;
    updated_at?: string;
}

interface Holiday {
    id: number;
    label: string;
    date: string;
}

// season_activities.html.erb style payloads can carry a season's holidays; entities.ts's shared
// `Season` doesn't model them (same local-extension pattern as LessonList.tsx's SeasonWithIsNext).
type SeasonWithHolidays = Season & { holidays?: Holiday[] };

//returns hsl color for planning intervals
const MAX_HUE = 360;
const DEFAULT_SAT = 68;
const DEFAULT_LUM = 60;
const getUniformHSLColor = (
    i: number,
    nbColors: number,
    {
        maxHue = MAX_HUE,
        sat = DEFAULT_SAT,
        lum = DEFAULT_LUM,
    }: { maxHue?: number; sat?: number; lum?: number } = {}
) => `hsl(${(i * maxHue) / (nbColors + 1)}deg, ${sat}%, ${lum}%)`;

// Resources management
export const getTeacherId = (interval: ScheduleInterval): number | null =>
    interval.activity_instance?.activity?.teacher?.id ??
    interval.owner_id ??
    null;
export const getRoomId = (interval: ScheduleInterval): number | null =>
    interval.activity_instance?.room_id ?? null;
export const resourceGetters: Record<
    "room" | "teacher",
    (interval: ScheduleInterval) => number | null
> = {
    room: getRoomId,
    teacher: getTeacherId,
};
export const getColors = (resources: Entity[]): Record<number, string> => {
    const colors: Record<number, string> = {};

    resources.forEach((res, i) => {
        colors[res.id] = getUniformHSLColor(i, resources.length);
    });

    return colors;
};

// Level sentinels: `levelDisplay` / `levelDisplayForActivity` return one of these RAW French
// strings (unchanged historical values) so existing `=== LEVEL_NOT_INDICATED` call-site
// comparisons keep working. `levelDisplayLabel` maps them to the localized copy at the point of
// display — never compare against a `levelDisplayLabel(...)` result.
export const LEVEL_NOT_INDICATED = "NON INDIQUÉ";
export const LEVEL_TO_SPECIFY = "À PRÉCISER";

export const levelDisplayLabel = (
    value: string | null | undefined
): string | null | undefined => {
    if (value === LEVEL_NOT_INDICATED)
        return i18n.t("planning:levelDisplay.notIndicated");
    if (value === LEVEL_TO_SPECIFY)
        return i18n.t("planning:levelDisplay.toSpecify");
    return value;
};

export const omitInactiveStudents = (
    users: User[],
    inactiveStudents: User[]
): User[] => _.differenceBy(users, inactiveStudents, "id");

export function fetchIntervals(
    csrfToken: string,
    id: number | string,
    type: string,
    date: moment.MomentInput,
    granularity: string,
    abortSignal?: AbortSignal
    // UNVERIFIED: inferred from Planning.jsx's own usage of the resolved payload, not cross-checked
    // against the controller action that serves this route.
): Promise<{ intervals: ScheduleInterval[]; holidays: Holiday[] }> {
    return fetch(
        `/${type}/${id}/intervals/${granularity}/${moment(date).format(
            ISO_DATE_FORMAT
        )}`,
        {
            // Was `type: "GET"` -- not a real `RequestInit` option, so this was always a silent
            // no-op (fetch already defaults to GET). Fixed to the real option name; no behavior
            // change.
            method: "GET",
            headers: {
                "X-Csrf-Token": csrfToken,
            },
            signal: abortSignal,
        }
    ).then((res) => res.json());
}

export function fetchInterval(
    csrfToken: string,
    intervalId: number | string
): Promise<ScheduleInterval> {
    return fetch(`/time_interval/${intervalId}`, {
        method: "GET",
        headers: {
            "X-Csrf-Token": csrfToken,
        },
    }).then((res) => res.json());
}

export const indexById = (
    intervals: ScheduleInterval[],
    store: Record<string | number, ScheduleInterval> = {}
): Record<string | number, ScheduleInterval> => {
    _.map(intervals, (i) => {
        if (i.id == undefined) {
            const maxId =
                _.size(store) == 0 ? 0 : _.chain(store).keys().max().value();
            i.id = parseInt(String(maxId), 10) + 1;
        }
        // We do this only if the interval is more recent than already stored
        const prevInterval = store[i.id];
        if (
            _.has(store, i.id) &&
            moment(store[i.id].updated_at).isAfter(moment(i.updated_at))
        ) {
            store[i.id] = prevInterval;
        } else {
            store[i.id] = i;
        }
    });

    return store;
};

export const genericIntervalsOnDay = (
    intervals: ScheduleInterval[],
    day: Moment
): ScheduleInterval[] =>
    _.map(intervals, (i) => ({
        ...i,
        start: moment(i.start).year(day.year()).week(day.week()).toISOString(),
        end: moment(i.end).year(day.year()).week(day.week()).toISOString(),
    }));

export const kindColors: Record<
    string,
    { color: string; bgColor: string; borderColor: string; validated: string }
> = {
    e: {
        color: "#BD9DAD",
        bgColor: "#E8D1E5",
        borderColor: "#E8D1E5",
        validated: "#a35b99",
    },
};

export const formatIntervalsForSchedule = (
    rawIntervals: ScheduleInterval[],
    conflict: ConflictInfo | null | undefined,
    user: { id: number },
    resourceType: "room" | "teacher",
    resourceCount: number,
    colors: Record<number, string>
): ScheduleInterval[] => {
    const isMultiView = resourceCount > 1;

    let formattedIntervals = _.map(rawIntervals, (int) => {
        let color = "#9CBCAC";
        let bgColor = "#D1E7D4";
        let borderColor = color;
        let activity: ScheduleActivity | undefined = undefined;

        if (int.kind === "p") {
            bgColor = "#3F51B5";
            color = "white";
            borderColor = bgColor;
        }

        // Condition existante pour les autres types
        else if (int.kind && Object.keys(kindColors).includes(int.kind)) {
            const kindColor = kindColors[int.kind];
            color = int.is_validated ? "white" : kindColor.color;
            bgColor = int.is_validated
                ? kindColor.validated
                : kindColor.bgColor;
            borderColor = bgColor;
        }

        // If specific multi resource view
        if (isMultiView) {
            const resourceId = resourceGetters[resourceType](int);
            // Unconditional: a null resourceId yields `undefined` here, which falls through to
            // FullCalendar's own default color -- not a palette default.
            bgColor = colors[resourceId as number];
            color = "white";
            borderColor = color;
        }

        if (int.activity_instance) activity = int.activity_instance.activity;
        else if (int.activity) activity = int.activity;
        let room =
            activity &&
            ((int.activity_instance && int.activity_instance.room) ||
                activity.room);

        if (!isMultiView && activity) {
            const bg = getActivityColor(activity);
            bgColor = bg;
            color = "white";
            borderColor = bg;
        }

        if (int.isAllDay) return int;

        if (resourceType === "teacher") {
            const coverTeacher = int.activity_instance?.cover_teacher;
            const teacherId = activity?.teacher?.id;

            if (coverTeacher) {
                if (isMultiView) {
                    bgColor = colors[coverTeacher.id];
                } else if (teacherId === user.id) {
                    bgColor = "gainsboro";
                    color = "slategray";
                    borderColor = int.activity_instance?.are_hours_counted
                        ? "#d63031"
                        : "slategray";
                } else if (coverTeacher.id === user.id) {
                    bgColor = "slategray";
                    color = "gainsboro";
                    borderColor = "gainsboro";
                }
            }
        }

        color = int.color || color;
        borderColor = int.borderColor || borderColor;

        let title;

        if (activity) {
            // Optional chaining: a missing activity_ref yields undefined (blank title), not a throw.
            title = activity.activity_ref?.label;
        } else if (int.kind === "e") {
            title = int.is_validated
                ? i18n.t("planning:scheduleTitles.evaluation")
                : i18n.t("planning:scheduleTitles.availabilityEvaluation");
        } else {
            title = i18n.t("planning:scheduleTitles.availability");
        }
        // `?? ""` also covers a null label (not just undefined), so capitalFirstLetters never sees null.
        const locationIndicator = `<b>${capitalFirstLetters(activity?.location?.label ?? "")}</b> - `;

        return {
            id: int.id || int.uid,
            calendarId: "1",
            evaluation: int.evaluation_appointment,
            title,
            location: locationIndicator + ((room && room.label) || ""),
            category: "time",
            start: int.start,
            end: int.end,
            borderColor,
            color,
            bgColor,
            dragBgColor: bgColor,
            attendees: activity ? activity.users : [],
            kind: int.kind,
            // `|| {}`, not `|| undefined`: callers (e.g. MultiViewModal.jsx) read schedule.teacher unguarded.
            teacher:
                (int.activity_instance && int.activity_instance.teacher) ||
                (activity && activity.teacher) ||
                {},
            isValidated: int.is_validated,
            activity_instance: int.activity_instance || undefined,
            raw: int,
            activity: activity || undefined,
        };
    });

    if (conflict) {
        // Si l'on est sur le planning pour une résolution de conflict,
        // on grise et lock tous les autre intervals
        formattedIntervals = _.map(formattedIntervals, (interval) => {
            if (interval.id !== conflict.activity_instance.time_interval_id) {
                interval.bgColor = "#EEE";
                interval.color = "#EEE";
                interval.borderColor = "#EEE";
                interval.isReadOnly = true;
            }
            return interval;
        });
    }

    return _.compact(formattedIntervals);
};

export const formatHolidays = (holidays: Holiday[]): ScheduleInterval[] => {
    return _.map(holidays, (h) => {
        return {
            // Holiday and TimeInterval are separate AR models, each with its own auto-incrementing
            // id sequence -- Planning.jsx's fetchIntervals() combines both into one array and does
            // `.uniqBy("id")`, so a holiday can collide with an unrelated lesson that happens to
            // share the same numeric id and get silently dropped. Prefixing guarantees no collision
            // (never read back as a real id: holidays are isReadOnly, clickSchedule no-ops on
            // isAllDay before any handler could use it).
            id: `holiday-${h.id}`,
            calendarId: "1",
            title: h.label,
            start: h.date,
            end: h.date,
            isAllDay: true,
            category: "allday",
            isReadOnly: true,
            color: "#9CBCAC",
            bgColor: "#D1E7D4",
            borderColor: "#D1E7D4",
        };
    });
};

// A user with a (possibly empty) set of evaluation levels -- all `levelDisplay` itself reads off
// each user, so this stays narrower than the full `User` entity (its real callers always pass
// genuine `User[]`/`Teacher[]`, which satisfy this trivially).
interface UserLevelInfo {
    id?: number;
    levels?: Level[];
}

type ActivityRefLike = Pick<Entity, "id"> | number | null | undefined;

const extractActivityRefId = (
    activityRef: ActivityRefLike
): number | undefined =>
    activityRef == null
        ? undefined
        : typeof activityRef === "number"
          ? activityRef
          : activityRef.id;

//Returns the label of the first valid level
//found in given users for given activityref and season
export const levelDisplay = (
    users: UserLevelInfo[],
    activityRef: ActivityRefLike,
    seasonId: number
): string => {
    const id = extractActivityRefId(activityRef);

    const allLevels = _(users)
        .map((u) => u.levels ?? [])
        .flatten()
        .compact()
        .filter((level) => level.season_id == seasonId)
        .value();

    // `typeof id === "number" &&` avoids loose-matching a level whose own activity_ref_id is
    // itself null/undefined. Also drops the old loose string-id match; unreachable in practice,
    // since every real caller passes a number or an `{ id: number }` ref.
    const exactLevels = allLevels.filter(
        (level) => typeof id === "number" && level.activity_ref_id === id
    );

    const levelsToConsider = exactLevels;

    if (levelsToConsider.length === 0) {
        return LEVEL_NOT_INDICATED;
    }

    const uniqueLevels = _.uniqBy(levelsToConsider, "evaluation_level_ref_id");

    return uniqueLevels.length > 1
        ? LEVEL_TO_SPECIFY
        : uniqueLevels[0]?.evaluation_level_ref?.label || LEVEL_NOT_INDICATED;
};

// The subset of an "activity"-shaped record `levelDisplayForActivity` actually reads -- built
// from the real entities rather than an ad-hoc parallel shape (see SimplePlanning.tsx/
// RawPlanning.tsx/LessonList.tsx, all of which already model their own "activity" variants this
// same way).
interface ActivityLevelInfo {
    time_interval?: TimeInterval;
    activity_ref?: ActivityRef;
    evaluation_level_ref?: EvaluationLevelRef | null;
    users: UserLevelInfo[];
}

export const levelDisplayForActivity = (
    activity: ActivityLevelInfo,
    seasons: Season[]
): string | null | undefined => {
    const {
        time_interval: timeInterval,
        activity_ref: activityRef,
        evaluation_level_ref: evaluationLevelRef,
        users,
    } = activity;

    if (evaluationLevelRef) return evaluationLevelRef.label;

    if (timeInterval) {
        const season = getSeasonFromDate(timeInterval.start, seasons);

        return levelDisplay(users, activityRef, season ? season.id : 0);
    }

    return null;
};

export const age = (birthday: moment.MomentInput): number =>
    moment().diff(birthday, "years");

export const averageAge = (
    users: { birthday: moment.MomentInput }[]
): number => {
    return Math.floor(
        users.map((u) => age(u.birthday)).reduce((sum, val) => sum + val, 0) /
            users.length
    );
};

export const averageAgeDisplay = (age: unknown): string => {
    return typeof age !== "number" || isNaN(age)
        ? ""
        : i18n.t("planning:ageYears", { age });
};

// TODO Include availabilityInterval somehow
export const generateInstances = (
    startingDate: moment.MomentInput,
    seasons: SeasonWithHolidays[]
): Record<string, { start: Moment; selected: boolean }> | [] => {
    const season = getSeasonFromDate(startingDate, seasons);

    if (!season) return [];

    // In order to generate instance over the full season, we need to determine the first instance
    // A combinaison of the season start and of the starting date
    const firstInstance = moment(startingDate);

    const seasonEnd = moment(season.end);
    const holidayDates = _.map(season.holidays, (h) =>
        moment(h.date).format(ISO_DATE_FORMAT)
    );

    let instances: Moment[] = [];

    let now = firstInstance.clone();
    while (
        instances.length < (season.nb_lessons ?? 0) &&
        now.isSameOrBefore(seasonEnd)
    ) {
        // skip if we are on a holiday
        if (!_.includes(holidayDates, moment(now).format(ISO_DATE_FORMAT)))
            instances.push(moment(now));
        now.add(1, "week");
    }

    instances = _.uniqBy(instances, (i) => i.format(ISO_DATE_FORMAT));
    instances = _.map(instances, (i) => i.hour(firstInstance.hour()));

    return _.reduce(
        instances,
        (acc, i) => ({
            ...acc,
            [i.format(ISO_DATE_FORMAT)]: {
                start: i,
                selected: true,
            },
        }),
        {} as Record<string, { start: Moment; selected: boolean }>
    );
};

// Generic over the season type so callers passing a widened local extension (e.g.
// generateInstances' SeasonWithHolidays below) get it back narrowed, not widened to plain Season.
export const getSeasonFromDate = <T extends Season>(
    date: moment.MomentInput,
    seasons: T[]
): T | undefined =>
    seasons.filter((s) => moment(date).isBetween(s.start, s.end))[0];

type TZDateLike = { toDate: () => Date };

interface CuttableInterval {
    start: Moment | TZDateLike;
    end: Moment | TZDateLike;
    [key: string]: unknown;
}

export const cutInterval = (interval: CuttableInterval): CuttableInterval[] => {
    // Un interval avec start et end doit être divisé en un liste d'intervals d'une heure
    // Pour cela, on prend le start et on ajoute une heure, pour créer un nouveau créneau, on répète l'opération jusqu'à
    // ce que le end du nouvel interval soit égal au end de l'interval de départ
    // const intervalClone = _.clone(interval);

    // TODO We need to find a way to do this before the interval creation
    // Si l'interval est une dispo pour un élève, on ne le coupe pas
    // if (interval.kind == "p") {
    //     return [interval];
    // }

    // TUI Calendar uses TZDate for start and end, so we need to either convert them to
    // moment objects, or refactor following code.
    const start = moment.isMoment(interval.start)
        ? interval.start
        : moment(interval.start.toDate());
    const end = moment.isMoment(interval.end)
        ? interval.end
        : moment(interval.end.toDate());

    // si l'interval dure 1h30, on ne le découpe pas
    if (end.diff(start) == 5400000 || end.diff(start) == 1800000) {
        return [interval];
    }

    const newInterval = {
        ...interval,
        start: start.clone(),
        end: start.clone().add(1, "hour"),
    };

    const restInterval = {
        ...interval,
        start: start.clone().add(1, "hour"),
        end,
    };

    // Si le nouvel interval d'une heure à la même heure de fin que l'original, on a fini le travail
    let intervals: CuttableInterval[] = [];
    if (newInterval.end.isSame(restInterval.end)) {
        intervals = [newInterval];
    } else {
        const rest = cutInterval(restInterval);
        intervals = [newInterval, ...rest];
    }

    return intervals;
};

interface DurationComputable {
    start: moment.MomentInput;
    end: moment.MomentInput;
    is_validated?: boolean;
    [key: string]: unknown;
}

export const computeInterval = (
    intervals: DurationComputable[],
    filter?: (interval: DurationComputable) => unknown
): moment.Duration => {
    // Helper function to get the total duration of all intervals
    return intervals
        .filter(filter || (() => true))
        .map((interval) => {
            const start = moment(interval.start);
            const end = moment(interval.end);
            return moment.duration(end.diff(start));
        })
        .reduce((total, duration) => total.add(duration), moment.duration());
};

export const computeValidatedInterval = (
    intervals: DurationComputable[]
): moment.Duration => {
    // Calls computeInterval directly -- module-level arrow functions have no `this`.
    return computeInterval(intervals, (i) => i.is_validated);
};

const isTZDate = (date: unknown): date is TZDateLike =>
    !_.isString(date) && !moment.isMoment(date) && !_.isDate(date);

interface MomentifiableInterval {
    start: string | Date | Moment | TZDateLike;
    end: string | Date | Moment | TZDateLike;
    [key: string]: unknown;
}

// Convert Ruby DateTime into moment object for easier manipulation
export const momentify = (timeIntervals: MomentifiableInterval[]) => {
    return _.map(timeIntervals, (timeInterval) => {
        const newInterval = {
            ...timeInterval,
            start: isTZDate(timeInterval.start)
                ? timeInterval.start.toDate()
                : moment(timeInterval.start),
            end: isTZDate(timeInterval.end)
                ? timeInterval.end.toDate()
                : moment(timeInterval.end),
        };
        return newInterval;
    });
};
