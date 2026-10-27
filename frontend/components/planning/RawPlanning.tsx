import React, { Fragment } from "react";
import { useTranslation } from "react-i18next";

import * as TimeIntervalHelpers from "./TimeIntervalHelpers";
import {
    fullnameWithAge,
    fullname,
    toDate,
    toHourMin,
} from "../../tools/format";
import { WEEKDAYS } from "../../tools/constants";
import type {
    Activity,
    EvaluationLevelRef,
    Option,
    Season,
    TimeInterval,
    User,
} from "../utils/entities";

type TFunction = (key: string, options?: Record<string, unknown>) => string;

// The planning endpoint's own per-day interval shape -- a superset of entities.ts's generic
// `TimeInterval`, adding whichever of `activity`/`activity_instance` is populated for a
// validated slot.
interface RawTimeInterval extends TimeInterval {
    activity?: Activity;
    activity_instance?: {
        activity: Activity;
        inactive_students?: { id: number }[];
    };
}

const levelDisplay = (
    users: User[],
    activityRefId: number,
    timeInterval: RawTimeInterval,
    seasons: Season[]
) => {
    const season = TimeIntervalHelpers.getSeasonFromDate(
        timeInterval.start,
        seasons
    );

    return TimeIntervalHelpers.levelDisplayLabel(
        TimeIntervalHelpers.levelDisplay(
            users,
            activityRefId,
            season ? season.id : 0
        )
    );
};

const StudendItems = ({ students }: { students: User[] }) => (
    <Fragment>
        {students.map((u) => (
            <li key={u.id} className="list-group-item no-borders">
                <a className="taureau" href={`/users/${u.id}`}>
                    {fullnameWithAge(u)}
                </a>
            </li>
        ))}
    </Fragment>
);

const OptionItems = ({
    options,
    color,
    t,
}: {
    options: Option[];
    color: string;
    t: TFunction;
}) => (
    <Fragment>
        {options.map((opt) => {
            // Every real caller's payload always has this full chain populated -- preserved
            // as-is (no new optional-chaining guards added) rather than silently swallowing a
            // shape the original code never defended against either.
            const optionUser =
                opt.desired_activity!.activity_application!.user!;
            return (
                <li key={optionUser.id} className="list-group-item no-borders">
                    <a
                        className="taureau"
                        href={`/users/${optionUser.id}`}
                        style={{ color }}
                    >
                        {fullnameWithAge(optionUser)}{" "}
                        {t("rawPlanning.optionMarker")}
                    </a>
                </li>
            );
        })}
    </Fragment>
);

const RawActivity = ({
    timeInterval,
    isTeacher,
    seasons,
    evaluationsLevelRefs,
    t,
}: {
    timeInterval: RawTimeInterval;
    isTeacher?: boolean;
    seasons: Season[];
    evaluationsLevelRefs: EvaluationLevelRef[];
    t: TFunction;
}) => {
    // Vars
    const activity = (timeInterval.activity ||
        timeInterval.activity_instance!.activity)!;

    const inactiveIds =
        timeInterval.activity_instance &&
        Array.isArray(timeInterval.activity_instance.inactive_students)
            ? timeInterval.activity_instance.inactive_students.map((s) => s.id)
            : [];

    const students = activity.users.filter((u) => !inactiveIds.includes(u.id));

    const studentIds = activity.users.map((u) => u.id);

    const options = (activity.options || []).filter(
        (o) =>
            !studentIds.includes(
                o.desired_activity!.activity_application!.user!.id
            )
    );

    const teacher = activity.teacher || {
        first_name: "",
        last_name: "",
    };

    // `evaluation_level_ref_id` isn't on entities.ts's shared `Activity` interface (which models
    // `ActivitySerializer`'s attribute list, where this field is absent) because this component
    // isn't fed by that serializer at all: it's fed by `PlanningController#get_intervals`'s
    // `as_json(include: {...})` call (app/controllers/planning_controller.rb:258-292), which --
    // with no `only`/`except` restricting it -- emits every real `activities` column, this one
    // included (`null` when unset, a real id otherwise). So this `!== null` check is genuinely
    // reachable and correct as written, not dead code.
    const activityWithLevelRef = activity as Activity & {
        evaluation_level_ref_id?: number | null;
    };
    // No new optional-chaining guard here either (matches `OptionItems`'s stated policy above)
    // -- the original was `evaluationsLevelRefs.find(...).label` with no guard, trusting the
    // level ref to always be found when `evaluation_level_ref_id` is set.
    const studentsGlobalLevel =
        activityWithLevelRef.evaluation_level_ref_id !== null
            ? evaluationsLevelRefs.find(
                  (e) => e.id === activityWithLevelRef.evaluation_level_ref_id
              )!.label
            : levelDisplay(
                  students,
                  activity.activity_ref_id,
                  timeInterval,
                  seasons
              );

    // Render
    return (
        <div className="raw-activity">
            <div className="ibox">
                <div className="ibox-title">
                    <h4>{activity.group_name || null}</h4>
                </div>

                <div className="ibox-content p-xs">
                    <h5 className="text-danger">
                        {toHourMin(toDate(timeInterval.start))} -{" "}
                        {toHourMin(toDate(timeInterval.end))}{" "}
                        {activity.activity_ref.label}{" "}
                        {isTeacher ? activity.room!.label : null}
                    </h5>

                    {isTeacher ? null : <p>{fullname(teacher as User)}</p>}

                    <p className="font-bold font-italic">
                        {t("rawPlanning.occupancy", {
                            n: students.length + options.length,
                            limit: activity.activity_ref.occupation_limit,
                        })}{" "}
                        - {studentsGlobalLevel}
                    </p>

                    <ul className="list-group">
                        <StudendItems students={students} />
                        <OptionItems options={options} color={"purple"} t={t} />
                    </ul>
                </div>
            </div>
        </div>
    );
};

interface RawPlanningProps {
    data: Record<string, RawTimeInterval[]>;
    isTeacher?: boolean;
    seasons: Season[];
    evaluations_level_refs: EvaluationLevelRef[];
}

function RawPlanning({
    data,
    isTeacher,
    seasons,
    evaluations_level_refs,
}: RawPlanningProps) {
    const { t } = useTranslation("planning");

    function renderDayColumns(tis: RawTimeInterval[]) {
        return Array.isArray(tis) && tis.length
            ? tis
                  .sort(
                      (a, b) =>
                          toDate(a.start).getTime() - toDate(b.start).getTime()
                  )
                  .reduce<React.ReactNode[]>((comps, ti) => {
                      if (ti.is_validated && ti.kind !== "e") {
                          comps.push(
                              <RawActivity
                                  key={ti.id}
                                  timeInterval={ti}
                                  seasons={seasons}
                                  isTeacher={isTeacher}
                                  evaluationsLevelRefs={evaluations_level_refs}
                                  t={t}
                              />
                          );
                      }

                      return comps;
                  }, [])
            : null;
    }

    const sortedData = Object.keys(data).sort();

    return (
        <div className="m-t-sm">
            <div>
                <div className="flex">
                    {sortedData.length === 0 ? (
                        <p className="p-sm lead">
                            {t("rawPlanning.noActivityThisWeek")}
                        </p>
                    ) : null}
                </div>

                <div className="row m-t-sm">
                    {sortedData.map((day) => (
                        <div
                            key={day}
                            className="col-lg-2 col-md-3 col-sm-6 col-xs-12"
                        >
                            <h4 className="text-center bg-primary p-xs sticked">
                                {
                                    WEEKDAYS[
                                        parseInt(day) === 6
                                            ? 0
                                            : parseInt(day) + 1
                                    ]
                                }
                            </h4>

                            {renderDayColumns(data[day])}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default RawPlanning;
