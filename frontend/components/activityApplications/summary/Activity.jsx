import React from "react";
import { withTranslation, useTranslation } from "react-i18next";
import _ from "lodash";

import moment from "moment";

import ReactModal from "react-modal";
import TanStackGrid from "../../common/baseDataTable/TanStackGrid";

import i18n from "../../../i18n";
import * as api from "../../../tools/api";
import * as TimeIntervalHelpers from "../../planning/TimeIntervalHelpers";
import {
    csrfToken,
    FR_DATE_FORMAT,
    findAndGet,
    optionMapper,
} from "../../utils";
import { radioValue } from "../../evaluation/question/radio_question";
import {
    PRE_APPLICATION_ACTION_LABELS,
    modalStyle,
    WEEKDAYS,
} from "../../../tools/constants";
import {
    displayActivityRef,
    formatActivityHeadcount,
    occupationInfos,
    toAge,
} from "../../../tools/format";
import WorkGroupEditor from "./WorkGroupEditor";
import { SCHOOL_DATE_FORMAT_OPTIONS } from "../../../tools/timezone";

// SUB COMPONENTS

const LevelCell = ({
    user,
    activityId,
    seasons,
    activityRefId,
    timeInterval,
    activityRef,
    initialLevel = null,
}) => {
    const { t } = useTranslation("activityApplications");
    const [studentLevel, setStudentLevel] = React.useState(initialLevel);
    const [isLoading, setIsLoading] = React.useState(!initialLevel);

    React.useEffect(() => {
        if (initialLevel) return;

        let isMounted = true;
        setIsLoading(true);

        api.set()
            .get(
                `/desired_activities/user/${user.id}/activity/${activityId}/ref/${activityRefId}/time/${timeInterval.id}`
            )
            .then((response) => {
                if (isMounted) {
                    const apiLevel = response?.data?.evaluation_level_ref;

                    if (!apiLevel) {
                        const computedLevel =
                            TimeIntervalHelpers.levelDisplayForActivity(
                                {
                                    users: [user],
                                    activity_ref_id: activityRefId,
                                    time_interval: timeInterval,
                                    activity_ref: activityRef,
                                },
                                seasons
                            );
                        setStudentLevel(
                            computedLevel ||
                                TimeIntervalHelpers.LEVEL_NOT_INDICATED
                        );
                    } else {
                        setStudentLevel(apiLevel);
                    }
                }
            })
            .catch((error) => {
                console.error("[LevelCell] Erreur récupération level :", error);
                if (isMounted) {
                    const computedLevel =
                        TimeIntervalHelpers.levelDisplayForActivity(
                            {
                                users: [user],
                                activity_ref_id: activityRefId,
                                time_interval: timeInterval,
                                activity_ref: activityRef,
                            },
                            seasons
                        );
                    setStudentLevel(
                        computedLevel || TimeIntervalHelpers.LEVEL_NOT_INDICATED
                    );
                }
            })
            .finally(() => {
                if (isMounted) {
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [
        user.id,
        activityId,
        initialLevel,
        activityRefId,
        timeInterval,
        activityRef,
        seasons,
        timeInterval.id,
    ]);

    if (isLoading) {
        return <>{t("common:loading")}</>;
    }

    // Two placeholders, two namespaces: "NON INDIQUÉ" via activityApplications:summaryActivity.notSpecified,
    // "À PRÉCISER" via planning:levelDisplay.toSpecify (inside levelDisplayLabel). They resolve to the
    // same copy today (both all-caps in fr and en) — keep them in sync if either is edited.
    if (studentLevel === TimeIntervalHelpers.LEVEL_NOT_INDICATED) {
        return <>{t("summaryActivity.notSpecified")}</>;
    }

    return <>{TimeIntervalHelpers.levelDisplayLabel(studentLevel)}</>;
};

const SubStudentList = ({ row, seasons }) => {
    const { t } = useTranslation("activityApplications");
    const activeStudents = row.original.users.map((u) => ({
        ...u,
        type: "active",
    }));

    const inactiveStudents = row.original.inactive_users
        .map((u) => {
            const application = _.find(u.activity_applications, (app) =>
                app.desired_activities
                    .map((da) => da.activity_id)
                    .includes(row.original.id)
            );
            const beginAt = application && new Date(application.begin_at);
            const closestLesson = new Date(row.original.closest_lesson);
            if (!application || beginAt > closestLesson) return null;
            return { ...u, type: "inactive", application };
        })
        .filter((u) => u != null);

    const optionStudents = row.original.options.map((o) => {
        const user = _.get(o, "desired_activity.activity_application.user");
        const optionLevel =
            _.get(
                o,
                "desired_activity.activity_application.evaluation_level_ref"
            ) || null;
        return { ...user, type: "option", optionLevel };
    });

    const combinedUsers = _.orderBy(
        [...activeStudents, ...inactiveStudents, ...optionStudents],
        (u) => u.last_name
    );

    const isWorkGroup = row.original.activity_ref.is_work_group;

    return (
        <div className="flex-column">
            <div className="flex" style={{ padding: "15px" }}>
                <h3 className="m-r">
                    {t("summaryActivity.headcountAt", {
                        date: moment(row.original.closest_lesson).format(
                            "DD/MM/YYYY"
                        ),
                    })}
                </h3>
            </div>
            <table className="table table-bordered">
                <thead>
                    <tr>
                        <th>{t("summaryActivity.colName")}</th>
                        <th>{t("summaryActivity.colAge")}</th>
                        <th>{t("summaryActivity.colLevel")}</th>
                        {isWorkGroup && (
                            <th>{t("summaryActivity.colInstrument")}</th>
                        )}
                        <th>{t("summaryActivity.colStartDate")}</th>
                        <th>{t("summaryActivity.colStopDate")}</th>
                    </tr>
                </thead>
                <tbody>
                    {combinedUsers.map((u, index) => {
                        let customStyle = {};
                        if (u.type === "inactive")
                            customStyle = { color: "#ff001a" };
                        else if (u.type === "option")
                            customStyle = { color: "#9575CD" };

                        const userInstrument = isWorkGroup
                            ? row.original.activities_instruments
                                  .filter((ai) => ai.user_id === u.id)
                                  .map((ai) => _.get(ai, "instrument.label"))
                                  .join(", ") ||
                              t("summaryActivity.notAssigned")
                            : null;

                        const app =
                            u.application ||
                            u.activity_applications?.find((a) =>
                                a.desired_activities.some(
                                    (da) => da.activity_id === row.original.id
                                )
                            );

                        const formattedBeginAt = app?.begin_at
                            ? Intl.DateTimeFormat(
                                  i18n.language,
                                  SCHOOL_DATE_FORMAT_OPTIONS
                              ).format(new Date(app.begin_at))
                            : "";

                        const formattedStoppedAt = app?.stopped_at
                            ? Intl.DateTimeFormat(
                                  i18n.language,
                                  SCHOOL_DATE_FORMAT_OPTIONS
                              ).format(new Date(app.stopped_at))
                            : "";

                        return (
                            <tr key={u.id || index} style={customStyle}>
                                <td>
                                    <a
                                        href={
                                            app
                                                ? `/inscriptions/${app.id}`
                                                : "#"
                                        }
                                        target="_blank"
                                    >
                                        {u.first_name} {u.last_name}
                                    </a>
                                </td>
                                <td>
                                    {t("summaryActivity.ageYears", {
                                        age: TimeIntervalHelpers.age(
                                            u.birthday
                                        ),
                                    })}
                                </td>
                                <td>
                                    <LevelCell
                                        user={u}
                                        activityId={row.original.id}
                                        seasons={seasons}
                                        activityRefId={
                                            row.original.activity_ref_id
                                        }
                                        timeInterval={
                                            row.original.time_interval
                                        }
                                        activityRef={row.original.activity_ref}
                                    />
                                </td>
                                {isWorkGroup && <td>{userInstrument}</td>}
                                <td>{formattedBeginAt}</td>
                                <td>{formattedStoppedAt}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

// Was index-keyed ({0: true, 1: true, ...}, one entry per page-size slot) under react-table v6's
// index-based row identity. TanStackGrid's suggestions table now uses `getRowId` (the suggestion's
// own `id`), so "expand all" must key by that same real id instead of a row's position.
const createAllExpanded = (suggestions) =>
    _.zipObject(
        suggestions.map((s) => String(s.id)),
        suggestions.map(() => true)
    );

// Shared accessor helpers -- single source for values otherwise duplicated across a column's
// accessor/Cell and applyCustomFilters below.
const getSuggestionStart = (suggestion) =>
    suggestion.closest_lesson || suggestion.time_interval.start;

const getSuggestionEnd = (suggestion) =>
    suggestion.closest_lesson_end || suggestion.time_interval.end;

const getSuggestionWeekday = (suggestion) =>
    moment(getSuggestionStart(suggestion)).isoWeekday();

const getAverageAge = (suggestion) =>
    TimeIntervalHelpers.averageAge(suggestion.users);

// MAIN COMPONENT
class Activity extends React.Component {
    constructor(props) {
        super(props);

        let level = "";

        const levelSeason = _.find(
            props.application.user.levels,
            (l) =>
                l.activity_ref_id === props.activityRef.id &&
                l.season_id === props.application.season_id
        );

        this.state = {
            suggestionsMode: "CUSTOM", // Values : CUSTOM (suggests activities following user's availabilities/choices), ALL (no filter, display all activities)
            loading: false,
            tableState: {
                expanded: {},
                // Kept as one nested object (instead of separate page/pageSize fields spread
                // fresh into a new object on every render) so the object handed to
                // TanStackGrid's `pagination` prop stays reference-stable across renders that
                // don't actually change it -- see render()'s <TanStackGrid pagination={...}>.
                pagination: { pageIndex: 0, pageSize: 10 },
                sorted: [],
            },
            // "day"/"type_cour"/"time" columns need exact/range matching TanStack's own
            // auto-picked column filterFns can't express (see the Filter definitions below for
            // why); filtered here in JS instead of through TanStack's columnFilters state.
            customFilters: {},
            studentLevel: levelSeason
                ? levelSeason.evaluation_level_ref_id
                : null,
        };
    }

    componentDidMount() {
        this.loadSuggestions();
    }

    componentDidUpdate(prevProps) {
        let willReloadSuggestions = false;

        willReloadSuggestions =
            willReloadSuggestions ||
            (!this.state.loading &&
                this.props.isAdmin &&
                !this.props.suggestions);
        //Reload suggestions if application's begin_at has changed
        willReloadSuggestions =
            willReloadSuggestions ||
            prevProps.application.begin_at !== this.props.application.begin_at;
        // Reload if we change stop date
        willReloadSuggestions =
            willReloadSuggestions ||
            prevProps.application.stopped_at !==
                this.props.application.stopped_at;

        if (willReloadSuggestions) {
            this.loadSuggestions();
        }

        // A fresh `suggestions` prop (a reload just completed, e.g. switching between
        // suggestionsMode CUSTOM/ALL) can return fewer rows than the current pageIndex allows --
        // TanStackGrid is controlled here and won't clamp on its own. Reset/clamp so the table
        // never lands on an out-of-range, unrecoverable "no data" page.
        if (prevProps.suggestions !== this.props.suggestions) {
            this.clampPageIndex();
        }
    }

    // Clamps the current pageIndex to the last valid page for the *effective* (post
    // applyCustomFilters) row count, if it's now out of range. Called after a fresh suggestions
    // load; the three custom-filter onChange handlers reset straight to page 0 instead, since a
    // filter change should always land back on the first page (matches v6's own behavior).
    clampPageIndex() {
        const rowCount = this.applyCustomFilters(
            this.sortSuggestions(this.props.suggestions)
        ).length;
        const { pageIndex, pageSize } = this.state.tableState.pagination;
        const maxPageIndex = Math.max(0, Math.ceil(rowCount / pageSize) - 1);

        if (pageIndex > maxPageIndex) {
            this.setState((prevState) => ({
                tableState: {
                    ...prevState.tableState,
                    pagination: {
                        ...prevState.tableState.pagination,
                        pageIndex: maxPageIndex,
                    },
                },
            }));
        }
    }

    loadSuggestions() {
        this.setState({ loading: true });
        fetch(
            `/applications/${this.props.application.id}/desired_activities/${
                this.props.desiredActivity.id
            }/suggestions?mode=${this.state.suggestionsMode || "CUSTOM"}`,
            {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
                headers: {
                    "X-CSRF-Token": csrfToken,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
            }
        )
            .then((response) => response.json())
            .then((suggestions) => {
                // Wait for props to be update to declare loading as finished
                this.props
                    .handleAddSuggestions(
                        this.props.activityRef.id,
                        suggestions
                    )
                    .then(() => this.setState({ loading: false }));
            });
    }

    isUserInActivity(suggestion) {
        return _.some(
            suggestion.users.concat(suggestion.inactive_users),
            (u) => u.id == this.props.application.user.id
        );
    }

    // Checks if given activity is the one the user is assigned to.
    // (looks in desired activity's activity field)
    isDesiredActivityInActivity(suggestion) {
        return suggestion.id == this.props.desiredActivity.activity_id;
    }

    // Checks if given activity is one of the options the user is assigned to.
    // (looks in student's desired activity's options)
    isSuggestionInDesiredActivityOptions(suggestion) {
        return _.some(
            this.props.desiredActivity.options,
            (opt) => opt.activity_id == suggestion.id
        );
    }

    isUserInAnyActivity() {
        return _.some(this.props.suggestions, (s) => this.isUserInActivity(s));
    }

    isDesiredActivityInAnyActivity() {
        return _.some(this.props.suggestions, (s) =>
            this.isDesiredActivityInActivity(s)
        );
    }

    displayDuration(duration) {
        if (!duration) {
            return null;
        }

        const { t } = this.props;
        const hours = Math.floor(duration / 60);
        const minutes = (duration % 60).toString().padStart(2, "0");

        return duration < 60
            ? `- ${t("units.minutes", { minutes })}`
            : `- ${t("units.hoursMinutes", { hours, minutes })}`;
    }

    handleOptionButton(suggestion) {
        const isOption = this.isSuggestionInDesiredActivityOptions(suggestion);
        this.setState({ submittingOptionId: suggestion.id });

        const promise = isOption
            ? this.props.handleRemoveSuggestionOption(
                  suggestion.id,
                  this.props.desiredActivity
              )
            : this.props.handleSelectSuggestionOption(
                  suggestion.id,
                  this.props.desiredActivity.id
              );

        return promise
            .then(() => {
                if (isOption) {
                    this.props.desiredActivity.options =
                        this.props.desiredActivity.options.filter(
                            (opt) => opt.activity_id !== suggestion.id
                        );
                } else {
                    this.props.desiredActivity.options.push({
                        activity_id: suggestion.id,
                    });
                }
                this.setState({});

                this.loadSuggestions();
            })
            .catch((error) => {
                console.error(
                    "Erreur lors de la modification de l'option",
                    error
                );
                this.loadSuggestions();
            })
            .finally(() => {
                this.setState({ submittingOptionId: null });
            });
    }

    handleOpenLevelEditModal() {
        this.setState({
            isLevelEditModalOpen: true,
        });
    }

    handleCloseLevelEditModal() {
        this.setState({
            isLevelEditModalOpen: false,
        });
    }

    handleStudentLevelChange(value) {
        let studentLevel = null;

        if (value) studentLevel = parseInt(value);

        this.setState({
            studentLevel,
        });
    }

    handleSubmitStudentLevel() {
        const { studentLevel } = this.state;
        const {
            application: { season_id, user_id },
            activityRef: { id: activity_ref_id },
        } = this.props;

        if (studentLevel === null)
            api.set()
                .success(() => {
                    this.setState({ isLevelEditModalOpen: false });
                    this.props.handleDeleteStudentLevel(
                        season_id,
                        activity_ref_id
                    );
                })
                .del(
                    `/users/${user_id}/levels/${season_id}/${activity_ref_id}`
                );
        else
            api.set()
                .success((level) => {
                    this.setState({ isLevelEditModalOpen: false });
                    this.props.handleUpdateStudentLevel(level);
                })
                .post(`/users/${user_id}/levels`, {
                    season_id,
                    activity_ref_id,
                    evaluation_level_ref_id: studentLevel,
                });
    }

    // Applies the "day"/"type_cour"/"time" column filters (see their Filter definitions in
    // render()) -- kept as an exact/range match in plain JS, same as the v6 `filterMethod`s these
    // replace, rather than through TanStack's own columnFilters (whose auto-picked filterFn for a
    // number/object accessor value is either range- or reference-equality-based, neither of which
    // match what these columns need).
    applyCustomFilters(suggestions) {
        const { day, type_cour, time } = this.state.customFilters;

        return suggestions.filter((s) => {
            if (day !== undefined && day !== "") {
                const sDay = getSuggestionWeekday(s);
                if (sDay !== day) return false;
            }

            if (type_cour && s.activity_ref.label !== type_cour) return false;

            if (time) {
                const rowStart = getSuggestionStart(s);
                const rowEnd = getSuggestionEnd(s);

                if (time.start && moment(rowStart).format("HH:mm") < time.start)
                    return false;
                if (time.end && moment(rowEnd).format("HH:mm") > time.end)
                    return false;
            }

            return true;
        });
    }

    handleChangeSuggestionsMode(mode) {
        const shouldReload = mode !== this.state.suggestionsMode;

        this.setState(
            {
                suggestionsMode: mode,
            },
            () => shouldReload && this.loadSuggestions()
        );
    }

    render() {
        const { t } = this.props;
        const self = this;
        const { suggestionsMode } = this.state;
        const desiredActivityInAnyActivity =
            self.isDesiredActivityInAnyActivity();
        let suggestionsColumns = [];

        if (
            _.get(
                this.props.desiredActivity,
                "activity_ref.allows_timeslot_selection"
            )
        ) {
            suggestionsColumns.push({
                Header: t("summaryActivity.colRank"),
                id: "rank",
                accessor: "rank",
                maxWidth: 40,
                // Numeric accessor with no explicit Filter would otherwise get TanStack's
                // auto-picked `inNumberRange` filterFn, which destructures a typed string like
                // "14" into a [1, 4] range instead of matching it -- not meaningfully
                // text-filterable, same as average_age/occupation below.
                filterable: false,
                Cell: ({ original }) =>
                    original.rank === 0 ? null : original.rank,
            });
        }

        suggestionsColumns = [
            ...suggestionsColumns,
            {
                Header: t("summaryActivity.colGroup"),
                accessor: "group_name",
                maxWidth: 60,
            },

            {
                Header: t("summaryActivity.colDay"),
                id: "day",
                maxWidth: 150,
                // Sorting still goes through this accessor (TanStack's default numeric sort);
                // filtering is handled separately in JS (see the Filter below and
                // applyCustomFilters) since TanStack's own auto-picked filterFn for a number
                // column is a min/max range, not the exact match this needs.
                accessor: (s) => getSuggestionWeekday(s),
                Cell: ({ original }) =>
                    moment(getSuggestionWeekday(original), "E")
                        .format("dddd")
                        .toUpperCase(),
                // Ignores the `onChange` TanStackGrid would otherwise wire to its own column-filter
                // state (see the comment on applyCustomFilters) and drives `customFilters` directly.
                // Controlled (not defaultValue) -- `render()` rebuilds this Filter function fresh
                // every render (a class component's columns close over `this`), which invalidates
                // TanStackGrid's columns memo and remounts this <select>; an uncontrolled
                // defaultValue would then visually reset to blank on every filter change even
                // though customFilters.day is still applied underneath.
                Filter: () => (
                    <select
                        value={this.state.customFilters.day ?? ""}
                        onChange={(e) =>
                            this.setState({
                                customFilters: {
                                    ...this.state.customFilters,
                                    // Pre-existing bug inherited from v6, not introduced here:
                                    // Sunday's option value is 0, and `0 || ""` makes it
                                    // indistinguishable from "no filter selected".
                                    day: parseInt(e.target.value) || "",
                                },
                                tableState: {
                                    ...this.state.tableState,
                                    pagination: {
                                        ...this.state.tableState.pagination,
                                        pageIndex: 0,
                                    },
                                },
                            })
                        }
                    >
                        <option value="" />
                        {WEEKDAYS.map((w, i) => ({ label: w, id: i })).map(
                            optionMapper()
                        )}
                    </select>
                ),
            },
            {
                Header: t("summaryActivity.colCourseFamily"),
                id: "type_cour",
                maxWidth: 150,
                accessor: "activity_ref.label",
                // See the "day" column above -- exact-match filtering handled in JS via
                // customFilters/applyCustomFilters instead of TanStack's own column filter state.
                Filter: () => (
                    <select
                        value={this.state.customFilters.type_cour ?? ""}
                        onChange={(e) =>
                            this.setState({
                                customFilters: {
                                    ...this.state.customFilters,
                                    type_cour: e.target.value,
                                },
                                tableState: {
                                    ...this.state.tableState,
                                    pagination: {
                                        ...this.state.tableState.pagination,
                                        pageIndex: 0,
                                    },
                                },
                            })
                        }
                    >
                        <option value="" />
                        {_.uniq(
                            (this.props.suggestions || []).map(
                                (s) => s.activity_ref.label
                            )
                        )
                            .map((s) => ({
                                label: s,
                                id: s,
                            }))
                            .map(optionMapper())}
                    </select>
                ),
            },
            {
                Header: t("summaryActivity.colSchedule"),
                id: "time",
                // Range filtering (start/end against two separate row fields) handled in JS via
                // customFilters/applyCustomFilters -- not expressible through any single TanStack
                // column filterFn. See the "day" column above.
                Filter: () => {
                    const filter = this.state.customFilters.time || {};
                    const start = filter.start || "";
                    const end = filter.end || "";

                    return (
                        <div className="flex flex-space-around-justified">
                            <input
                                type="time"
                                defaultValue={start}
                                onChange={(e) =>
                                    this.setState({
                                        customFilters: {
                                            ...this.state.customFilters,
                                            time: {
                                                ...filter,
                                                start: e.target.value,
                                            },
                                        },
                                        tableState: {
                                            ...this.state.tableState,
                                            pagination: {
                                                ...this.state.tableState
                                                    .pagination,
                                                pageIndex: 0,
                                            },
                                        },
                                    })
                                }
                            />
                            <input
                                type="time"
                                defaultValue={end}
                                onChange={(e) =>
                                    this.setState({
                                        customFilters: {
                                            ...this.state.customFilters,
                                            time: {
                                                ...filter,
                                                end: e.target.value,
                                            },
                                        },
                                        tableState: {
                                            ...this.state.tableState,
                                            pagination: {
                                                ...this.state.tableState
                                                    .pagination,
                                                pageIndex: 0,
                                            },
                                        },
                                    })
                                }
                            />
                        </div>
                    );
                },
                accessor: (s) => ({
                    start: getSuggestionStart(s),
                    end: getSuggestionEnd(s),
                }),
                Cell: ({ original }) =>
                    `${moment(getSuggestionStart(original)).format("HH:mm")} ~> ${moment(
                        getSuggestionEnd(original)
                    ).format("HH:mm")}`,
            },
            {
                Header: t("summaryActivity.colTeacher"),
                id: "teacher",
                // No custom Filter/filterMethod needed -- the accessor returns a plain string, and
                // TanStack's default column filterFn for a string column (`includesString`, a
                // case-insensitive substring match) is functionally identical to the old
                // `.*value.*` case-insensitive regex this replaces.
                accessor: ({ teacher }) =>
                    `${teacher.first_name} ${teacher.last_name}`,
            },
            {
                Header: t("summaryActivity.colLocation"),
                id: "location",
                maxWidth: 100,
                accessor: (s) => s.location.label,
            },
            {
                Header: t("summaryActivity.colLevel"),
                id: "level",
                maxWidth: 150,
                accessor: (s) => {
                    const level = TimeIntervalHelpers.levelDisplayForActivity(
                        s,
                        this.props.seasons
                    );
                    return (
                        TimeIntervalHelpers.levelDisplayLabel(level) ||
                        t("summaryActivity.noLevel")
                    );
                },
            },
            {
                Header: t("summaryActivity.colAge"),
                id: "average_age",
                maxWidth: 50,
                // Numeric accessor with no explicit Filter would otherwise get TanStack's
                // auto-picked `inNumberRange` filterFn, which destructures a typed string like
                // "14" into a [1, 4] range instead of matching it. Not meaningfully
                // text-filterable, matching how every other client-mode table in this migration
                // handles such a column (table-wide/per-column `filterable: false`).
                filterable: false,
                accessor: (s) => getAverageAge(s),
                Cell: ({ original }) =>
                    TimeIntervalHelpers.averageAgeDisplay(
                        getAverageAge(original)
                    ),
            },
            {
                Header: t("summaryActivity.colOccupied"),
                id: "occupation",
                maxWidth: 100,
                // Same inNumberRange auto-filterFn problem as average_age above.
                filterable: false,
                accessor: (s) => {
                    let { validatedHeadCount, headCountLimit } =
                        occupationInfos(s);

                    return validatedHeadCount / headCountLimit;
                },
                Cell: (props) => formatActivityHeadcount(props.original),
            },
            {
                Header: t("summaryActivity.colActions"),
                id: "actions",
                style: { textAlign: "right" },
                filterable: false,
                maxWidth: 250,
                Cell: (props) => {
                    const act = props.original;

                    if (props.original.activity_ref.is_work_group) {
                        return null;
                    }

                    if (
                        self.props.desiredActivity &&
                        self.props.desiredActivity.is_validated &&
                        self.isUserInActivity(props.original)
                    ) {
                        return (
                            <button
                                className="btn btn-xs btn-primary"
                                disabled={!!this.state.submittingId}
                                onClick={() => {
                                    this.setState({ submittingId: act.id });
                                    self.props
                                        .handleRemoveStudent(
                                            act.id,
                                            self.props.desiredActivity.id,
                                            self.props.activityRef.id
                                        )
                                        .then(() =>
                                            this.setState({ submittingId: 0 })
                                        );
                                }}
                            >
                                {t("summaryActivity.removeFromSlot")} &nbsp;
                                {this.state.submittingId === act.id ? (
                                    <i className="fas fa-circle-notch fa-spin"></i>
                                ) : (
                                    ""
                                )}
                            </button>
                        );
                    }

                    if (desiredActivityInAnyActivity) {
                        return null;
                    }

                    return (
                        <React.Fragment>
                            {/* Bouton Sélectionner */}
                            <button
                                disabled={
                                    self.props.isAlreadyBusy(
                                        props.original.time_interval
                                    ) ||
                                    act.users.length >=
                                        act.activity_ref
                                            .occupation_hard_limit ||
                                    !!this.state.submittingId
                                }
                                className="btn btn-xs btn-primary m-r-sm"
                                onClick={() => {
                                    this.setState({ submittingId: act.id });
                                    self.props
                                        .handleSelectSuggestion(
                                            act.id,
                                            self.props.desiredActivity.id,
                                            self.props.activityRef.id
                                        )
                                        .then(() => {
                                            this.setState({ submittingId: 0 });
                                            this.setState((prevState) => ({
                                                actUsers: [...act.users],
                                            }));
                                        });
                                }}
                            >
                                {t("summaryActivity.select")} &nbsp;
                                {this.state.submittingId === act.id ? (
                                    <i className="fas fa-circle-notch fa-spin"></i>
                                ) : (
                                    ""
                                )}
                            </button>

                            {/* Bouton Option / Retirer l'option */}
                            <button
                                disabled={
                                    act.users.some(
                                        (u) => u.id === this.props.userId
                                    ) || !!this.state.submittingOptionId
                                }
                                className="btn btn-xs"
                                style={{
                                    color: "#FFF",
                                    backgroundColor: "#9575CD",
                                }}
                                onClick={() => {
                                    this.setState({
                                        submittingOptionId: act.id,
                                    });
                                    this.handleOptionButton(act)
                                        .then(() =>
                                            this.setState({
                                                submittingOptionId: 0,
                                            })
                                        )
                                        .catch(() =>
                                            this.setState({
                                                submittingOptionId: 0,
                                            })
                                        );
                                }}
                            >
                                {this.isSuggestionInDesiredActivityOptions(act)
                                    ? t("summaryActivity.removeOption")
                                    : t("summaryActivity.option")}
                                &nbsp;
                                {this.state.submittingOptionId === act.id ? (
                                    <i className="fas fa-circle-notch fa-spin"></i>
                                ) : (
                                    ""
                                )}
                            </button>
                        </React.Fragment>
                    );
                },
                sortable: false,
            },
        ];

        // `showPagination` below is intentionally based on `allSuggestions` (matching v6, where it
        // was computed from the same pre-filter array handed to react-table) rather than the
        // post-customFilters `suggestions`, so filtering down to a handful of rows doesn't hide
        // the pagination controls.
        const allSuggestions = this.sortSuggestions(this.props.suggestions);
        const suggestions = this.applyCustomFilters(allSuggestions);

        let actionLabel = t("summaryActivity.newRequest");
        if (this.props.application.pre_application_activity) {
            actionLabel =
                PRE_APPLICATION_ACTION_LABELS[
                    this.props.application.pre_application_activity.action
                ];
        } else if (this.props.application.pre_application_desired_activity) {
            actionLabel =
                PRE_APPLICATION_ACTION_LABELS[
                    this.props.application.pre_application_desired_activity
                        .action
                ];
        }

        let previousActivity = null;
        if (this.props.activityRef.kind === "Enfance") {
            //Look for Enfance activity in previous applications
            const previousDesired = _.chain(
                this.props.application.user.activity_applications
            )
                .filter((app) =>
                    moment(app.season.end).isSame(
                        this.props.application.season.start,
                        "year"
                    )
                )
                .map((app) => app.desired_activities)
                .flatten()
                .find((des) => des.activity_ref.kind === "Enfance")
                .value();

            if (previousDesired) {
                const applicationActivity = previousDesired.activity;

                if (applicationActivity)
                    previousActivity = (
                        <div className="col-xs-6">
                            <p>
                                <i>{t("summaryActivity.previousActivity")}</i>
                            </p>
                            <p>
                                <b>
                                    {applicationActivity.activity_ref.label},{" "}
                                    {applicationActivity.time_interval ? (
                                        <React.Fragment>
                                            {_.capitalize(
                                                moment(
                                                    applicationActivity
                                                        .time_interval.start
                                                ).format("dddd")
                                            )}{" "}
                                            {moment(
                                                applicationActivity
                                                    .time_interval.start
                                            ).format("HH:mm")}
                                            {" -› "}
                                            {moment(
                                                applicationActivity
                                                    .time_interval.end
                                            ).format("HH:mm")}
                                        </React.Fragment>
                                    ) : (
                                        t("summaryActivity.slotNotFound")
                                    )}
                                    ,{" "}
                                    {`${applicationActivity.teacher.first_name} ${applicationActivity.teacher.last_name}`}{" "}
                                </b>
                            </p>
                        </div>
                    );
            }
        } else if (this.props.application.pre_application_activity) {
            let act = this.props.application.pre_application_activity.activity;

            if (act)
                previousActivity = (
                    <div className="col-xs-6">
                        <p>
                            <i>{t("summaryActivity.previousActivity")}</i>
                        </p>
                        <p>
                            <b>
                                {act.activity_ref.label},{" "}
                                {act.time_interval ? (
                                    <React.Fragment>
                                        {_.capitalize(
                                            moment(
                                                act.time_interval.start
                                            ).format("dddd")
                                        )}{" "}
                                        {moment(act.time_interval.start).format(
                                            "HH:mm"
                                        )}
                                        {" -› "}
                                        {moment(act.time_interval.end).format(
                                            "HH:mm"
                                        )}
                                    </React.Fragment>
                                ) : (
                                    t("summaryActivity.slotNotFound")
                                )}
                                ,{" "}
                                {`${act.teacher.first_name} ${act.teacher.last_name}`}{" "}
                            </b>
                        </p>
                    </div>
                );
        }

        let level = "";

        const levelSeason = _.find(
            this.props.application.user.levels,
            (l) =>
                l.activity_ref_id === this.props.activityRef.id &&
                l.season_id === this.props.application.season_id
        );

        level =
            levelSeason !== undefined &&
            levelSeason.evaluation_level_ref !== undefined
                ? _.capitalize(levelSeason.evaluation_level_ref.label)
                : t("summaryActivity.notIndicated");

        const desiredActivities = Array.isArray(this.props.desiredActivities)
            ? this.props.desiredActivities
            : Object.values(this.props.desiredActivities);

        const daIds = desiredActivities
            .filter((da) => da.activity_ref_id !== this.props.activityRef.id)
            .map((da) => da.activity_ref_id);

        const refsOptions = _.chain(this.props.activityRefs)
            .filter((r) => !daIds.includes(r.id))
            .filter(
                (r) =>
                    this.props.activityRef.kind !== "Enfance" ||
                    r.kind === "Enfance"
            )
            .sortBy((r) => r.label)
            .map((r) => (
                <option key={r.id} value={r.id}>
                    {r.label} {self.displayDuration(r.duration)}
                </option>
            ))
            .value();

        const shouldChangeActivityQuestion =
            this.props.studentEvaluationQuestions.find(
                (q) => q.name === "should_change_activity"
            );
        const shouldChangeActivityAnswer = this.props.detectedEvaluation
            ? radioValue(
                  shouldChangeActivityQuestion,
                  findAndGet(
                      this.props.detectedEvaluation.answers,
                      (a) => a.question_id === shouldChangeActivityQuestion.id,
                      "value"
                  )
              )
            : t("summaryActivity.notSpecifiedShort");

        return (
            <React.Fragment>
                <div className="ibox activity-application">
                    <div className="ibox-title">
                        <h5>
                            <div className="btn-group m-r">
                                <button
                                    type="button"
                                    className={`btn btn-primary btn-outline ${suggestionsMode === "CUSTOM" ? "active" : ""}`}
                                    onClick={(e) =>
                                        this.handleChangeSuggestionsMode(
                                            "CUSTOM"
                                        )
                                    }
                                >
                                    {t("summaryActivity.suggestedCourses")}
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-primary btn-outline ${suggestionsMode === "ALL" ? "active" : ""}`}
                                    onClick={(e) =>
                                        this.handleChangeSuggestionsMode("ALL")
                                    }
                                >
                                    {t("summaryActivity.allCoursesOf", {
                                        name: displayActivityRef(
                                            this.props.activityRef
                                        ),
                                    })}
                                </button>
                            </div>
                            <select
                                className="custom-select m-r"
                                value={this.props.activityRef.id}
                                disabled={
                                    this.props.desiredActivity.is_validated
                                }
                                onChange={(e) =>
                                    this.props.handleChangeDesiredActivity(
                                        this.props.desiredActivity.id,
                                        parseInt(e.target.value)
                                    )
                                }
                            >
                                {refsOptions}
                            </select>
                            <span className="badge badge-warning">
                                {actionLabel}
                            </span>
                        </h5>
                    </div>

                    <div className="ibox-content">
                        <div className="row m-b-md">
                            <div className="col-xs-2">
                                <p>
                                    <i>{t("summaryActivity.studentLevel")}</i>
                                </p>
                                <p>
                                    <b>{level}</b>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            this.handleOpenLevelEditModal()
                                        }
                                        className="btn btn-xs btn-primary m-l-sm"
                                    >
                                        <i className="fas fa-edit" />
                                    </button>
                                </p>
                            </div>
                            <div className="col-xs-2">
                                <p>
                                    <i>{t("summaryActivity.groupChange")}</i>
                                </p>
                                <p>
                                    <b>{shouldChangeActivityAnswer}</b>
                                </p>
                            </div>
                            {this.props.desiredActivity.user ? (
                                <div className="col-xs-2">
                                    <p>
                                        <i>
                                            {t(
                                                "summaryActivity.accompanyingPerson"
                                            )}
                                        </i>
                                    </p>
                                    <p>
                                        <b>
                                            {`${
                                                this.props.desiredActivity.user
                                                    .first_name
                                            } ${
                                                this.props.desiredActivity.user
                                                    .last_name
                                            }`}
                                        </b>
                                    </p>
                                </div>
                            ) : null}

                            {!this.props.instruments.length == 0 ? (
                                <div className="col-xs-2">
                                    <p>
                                        <i>
                                            {t("summaryActivity.instruments")}
                                        </i>
                                    </p>
                                    <p>
                                        <b>
                                            {this.props.instruments
                                                .map(
                                                    (instrument) =>
                                                        instrument.label
                                                )
                                                .join(", ")}
                                        </b>
                                    </p>
                                </div>
                            ) : null}

                            {previousActivity}

                            <div className="col-xs-12 img-rounded p-xs flex flex-center-aligned">
                                <p className="m-r-sm">
                                    <i className="fas fa-info-circle" />{" "}
                                    {t("summaryActivity.suggestionCriteria")}
                                </p>
                                <div className="table-expanders">
                                    <button
                                        data-tippy-content={t(
                                            "summaryActivity.collapseAll"
                                        )}
                                        data-tippy-placement="right"
                                        onClick={() =>
                                            this.setState({
                                                tableState: {
                                                    ...this.state.tableState,
                                                    expanded: {},
                                                },
                                            })
                                        }
                                    >
                                        <i
                                            className="fas fa-caret-up"
                                            data-fa-transform="grow-8"
                                        />
                                    </button>
                                    <button
                                        data-tippy-content={t(
                                            "summaryActivity.expandAll"
                                        )}
                                        data-tippy-placement="right"
                                        onClick={() =>
                                            this.setState({
                                                tableState: {
                                                    ...this.state.tableState,
                                                    expanded:
                                                        createAllExpanded(
                                                            suggestions
                                                        ),
                                                },
                                            })
                                        }
                                    >
                                        <i
                                            className="fas fa-caret-down"
                                            data-fa-transform="grow-8"
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <TanStackGrid
                            tableName="table-activity-suggestions"
                            manual={false}
                            getRowId={(row) => String(row.id)}
                            data={suggestions || []}
                            columns={suggestionsColumns}
                            pages={null}
                            showPagination={allSuggestions.length > 10}
                            loading={this.state.loading}
                            minRows={1}
                            expanded={this.state.tableState.expanded}
                            onExpandedChange={(expanded) =>
                                this.setState({
                                    tableState: {
                                        ...this.state.tableState,
                                        expanded,
                                    },
                                })
                            }
                            pageSizeOptions={[5, 10, 20, 25, 50, 100]}
                            pagination={this.state.tableState.pagination}
                            onPaginationChange={({ pageIndex, pageSize }) => {
                                const pageChanged =
                                    pageIndex !==
                                    this.state.tableState.pagination.pageIndex;

                                this.setState({
                                    tableState: {
                                        ...this.state.tableState,
                                        pagination: { pageIndex, pageSize },
                                        // Reset expanded on page change only (not on page-size
                                        // change) -- same distinction v6's separate
                                        // onPageChange/onPageSizeChange callbacks made.
                                        expanded: pageChanged
                                            ? {}
                                            : this.state.tableState.expanded,
                                    },
                                });
                            }}
                            sorting={this.state.tableState.sorted}
                            onSortingChange={(sorted) =>
                                this.setState({
                                    tableState: {
                                        ...this.state.tableState,
                                        sorted,
                                        // v6 reset to page 0 on any (non-additive) sort click;
                                        // mirror that here so sorting can't strand the user on a
                                        // now out-of-range page.
                                        pagination: {
                                            ...this.state.tableState.pagination,
                                            pageIndex: 0,
                                        },
                                    },
                                })
                            }
                            getRowProps={(original) => {
                                if (
                                    this.isDesiredActivityInActivity(original)
                                ) {
                                    return {
                                        style: {
                                            color: "#d63031",
                                            fontWeight: "bold",
                                        },
                                    };
                                }

                                if (
                                    this.isSuggestionInDesiredActivityOptions(
                                        original
                                    )
                                ) {
                                    return {
                                        style: {
                                            color: "#9575CD",
                                            fontWeight: "bold",
                                        },
                                    };
                                }

                                return undefined;
                            }}
                            renderSubComponent={(row) => {
                                return row.original.activity_ref
                                    .is_work_group ? (
                                    <WorkGroupEditor
                                        activity={row.original}
                                        desiredActivity={
                                            this.props.desiredActivity
                                        }
                                        userId={this.props.application.user_id}
                                        onUpdateActivity={(a) => {
                                            this.props.handleUpdateSuggestion(
                                                a
                                            );

                                            // The suggestion keeps its own id across the update
                                            // (handleUpdateSuggestion replaces it in place, doesn't
                                            // recreate it), and `getRowId` above keys TanStack's
                                            // expanded state off that same id -- so simply
                                            // re-expanding `a.id` keeps the row open regardless of
                                            // where it lands after the refreshed suggestions are
                                            // re-sorted/re-filtered. No index bookkeeping needed.
                                            this.setState({
                                                tableState: {
                                                    ...this.state.tableState,
                                                    expanded: {
                                                        [String(a.id)]: true,
                                                    },
                                                },
                                            });
                                        }}
                                    />
                                ) : (
                                    <SubStudentList
                                        row={row}
                                        seasons={this.props.seasons}
                                        desiredActivity={
                                            this.props.desiredActivity
                                        }
                                        referenceDate={this.props.referenceDate}
                                    />
                                );
                            }}
                        />
                    </div>
                </div>
                <ReactModal
                    ariaHideApp={false}
                    isOpen={this.state.isLevelEditModalOpen}
                    onRequestClose={() => this.handleCloseLevelEditModal()}
                    style={{
                        ...modalStyle,
                        content: { maxWidth: "300px", position: "static" },
                        overlay: { justifyContent: "center" },
                    }}
                >
                    <div className="ibox">
                        <div className="ibox-title">
                            <h3>
                                {t("summaryActivity.editLevelTitle", {
                                    label: this.props.activityRef.label,
                                })}
                            </h3>
                        </div>
                        <div className="ibox-content">
                            <div className="form-group">
                                <label>{t("summaryActivity.colLevel")}</label>
                                <select
                                    className="form-control"
                                    defaultValue={
                                        (levelSeason &&
                                            levelSeason.evaluation_level_ref_id) ||
                                        ""
                                    }
                                    onChange={(e) =>
                                        this.handleStudentLevelChange(
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="">
                                        {t("summaryActivity.notSpecified")}
                                    </option>
                                    {this.props.evaluationLevelRefs.map(
                                        optionMapper()
                                    )}
                                </select>
                            </div>
                        </div>
                        <div className="ibox-footer flex flex-space-between-justified">
                            <button
                                className="btn"
                                style={{ marginRight: "auto" }}
                                type="button"
                                onClick={() => this.handleCloseLevelEditModal()}
                            >
                                <i className="fas fa-times m-r-sm" />
                                {t("common:actions.cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={() => this.handleSubmitStudentLevel()}
                                className="btn btn-primary pull-right"
                            >
                                <i className="fas fa-save m-r-sm" />
                                {t("common:actions.save")}
                            </button>
                        </div>
                    </div>
                </ReactModal>
            </React.Fragment>
        );
    }

    /**
     *
     * @param {[]} suggestions
     * @returns {any[]}
     */
    sortSuggestions(suggestions) {
        return _.sortBy(
            _.filter(
                suggestions,
                (s) => s.time_interval
                // filtre initial surcharger par modif sur le tableau (click sur colonne)
                // les valeurs sont arbitraires
            ),
            (s) => {
                if (this.isSuggestionInDesiredActivityOptions(s)) return -1;

                if (this.isDesiredActivityInActivity(s)) return -2;

                return 0;
            }
        );
    }
}

export default withTranslation("activityApplications")(Activity);
