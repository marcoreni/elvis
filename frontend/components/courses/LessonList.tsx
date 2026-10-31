import React, { useEffect, useState } from "react";
import TanStackGrid, {
    FetchDataFilter,
    LegacyColumn,
} from "../common/baseDataTable/TanStackGrid";
import FilterSelect from "../common/baseDataTable/FilterSelect";
import FilterReactSelect from "../common/baseDataTable/FilterReactSelect";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import moment from "moment";
import Modal from "react-modal";
import MessageModal from "../generalPayments/MessageModal";
import ListPreferences from "../common/ListPreferences";
import DeleteCourseModal from "./DeleteCourseModal";
import * as api from "../../tools/api";
import swal from "sweetalert2";
import type { ColumnFiltersState } from "@tanstack/react-table";

import * as TimeIntervalHelpers from "../planning/TimeIntervalHelpers";
import {
    DownloadButton,
    optionMapper,
    ISO_DATE_FORMAT,
    csrfToken,
    findAndGet,
} from "../utils";
import {
    formatActivityHeadcount,
    isActivityWithOnlyOneOption,
    dateOnly,
} from "../../tools/format";
import _ from "lodash";
import { SCHOOL_DATE_FORMAT_OPTIONS } from "../../tools/timezone";
import type {
    Activity,
    ActivityRef,
    EvaluationLevelRef,
    Location,
    Room,
    Season,
    Teacher,
    User,
} from "../utils/entities";

const FILTER_STORAGE_KEY = "lessons_list_filters";
const PREFERENCES_STORAGE_KEY = "lessons_list_preferences";

const NB_DISPLAYED_RECIPIENTS = 3;
const MESSAGE_MODAL_ID = "messagesModal";

const defaultTableProps = (): FetchDataFilter => ({
    page: 0,
    pageSize: 20,
    sorted: [],
    filtered: [
        { id: "reference_date", value: moment().format(ISO_DATE_FORMAT) },
    ],
});

// ActivityController#activities_list_json's own `as_json` (not ActivitySerializer) emits every
// raw `activities` column plus a few custom-built associations (`location`, `activity_instance`)
// -- same situation as RawPlanning.tsx's `evaluation_level_ref_id` (see docs/KnownIssues.md).
// Kept as a local extension rather than widening the shared `Activity` entity, which other
// (ActivitySerializer-fed) consumers don't get these fields from.
interface LessonActivity extends Activity {
    location: Location;
    time_interval_id: number;
    evaluation_level_ref?: EvaluationLevelRef | null;
    activity_instance?: { id: number; room_id: number | null } | null;
    // Added client-side by fetchData below, not part of the API response itself.
    isOnlyOneOption?: boolean;
}

// `activity/index.html.erb` sends `is_next` via `@seasons.as_json(methods: [:is_next])` -- not a
// field every Season payload carries, so kept as a local extension rather than widening the
// shared Season entity (same reasoning as LessonActivity above).
type SeasonWithIsNext = Season & { is_next?: boolean };

interface ListPreference {
    id?: string;
    name?: React.ReactNode;
    disabled: boolean;
}

interface Message {
    title: string;
    content: string;
    isEmail: boolean;
    isSMS: boolean;
}

// desired_activity_controller.rb renders evaluation_level_ref as a bare string, not an object --
// a different shape from the real EvaluationLevelRef entity activities_list_json sends (see
// LessonActivity.evaluation_level_ref above and the comment in UserRow below).
interface DesiredActivityResponse {
    id: number;
    evaluation_level_ref?: string | null;
    activity_application_id?: number | null;
}

// Filter object shape accepted by fetchData/fetchInstancesList. `page`/`pageSize` are optional
// here (not on FetchDataFilter itself) only because downloadStudentsList() below deliberately
// strips them before calling fetchInstancesList, to fetch every matching row unpaged.
type FetchFilterArg = Pick<FetchDataFilter, "sorted" | "filtered"> &
    Partial<Pick<FetchDataFilter, "page" | "pageSize">>;

interface LessonListResult {
    data: LessonActivity[];
    pages: number;
    total: number;
}

function fetchInstancesList(
    filter: FetchFilterArg,
    format: "csv"
): Promise<Blob | undefined>;
function fetchInstancesList(
    filter: FetchFilterArg,
    format?: "json"
): Promise<LessonListResult | undefined>;
function fetchInstancesList(filter: FetchFilterArg, format: string = "json") {
    return fetch(`/activities.${format}`, {
        method: "POST",
        headers: {
            "X-Csrf-Token": csrfToken,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            sorted: filter.sorted[0],
            filtered: filter.filtered,
            page: filter.page,
            page_size: filter.pageSize,
        }),
    })
        .then((res) => {
            if (!res.ok) throw new Error();

            switch (format) {
                case "csv":
                    return res.blob();
                case "json":
                default:
                    return res.json();
            }
        })
        .catch((error) => {
            console.error(error);
            toast.error(i18n.t("courses:lessonList.fetchError"), {
                autoClose: 3000,
            });
            return undefined;
        });
}

interface LessonListProps {
    activityRefs: ActivityRef[];
    teachers: Teacher[];
    seasons?: Season[];
    rooms: Room[];
    locations: Location[];
    evaluationLevelRefs: EvaluationLevelRef[];
    isTeacherView?: boolean;
    // `currentUser` is also passed by app/views/activity/index.html.erb but has never been read
    // here (confirmed by grep) -- not declared, deliberately.
}

function LessonList({
    activityRefs,
    teachers,
    seasons,
    rooms,
    locations,
    evaluationLevelRefs,
    isTeacherView,
}: LessonListProps) {
    const { t } = useTranslation("courses");

    const [filter, setFilter] = useState<FetchDataFilter>(() => {
        const localStorageValue = localStorage.getItem(FILTER_STORAGE_KEY);
        return localStorageValue != null
            ? (JSON.parse(localStorageValue) as FetchDataFilter)
            : defaultTableProps();
    });
    const [listPreferences, setListPreferences] = useState<
        ListPreference[] | null
    >(() => {
        const localStoragePrefs = localStorage.getItem(PREFERENCES_STORAGE_KEY);
        return localStoragePrefs
            ? (JSON.parse(localStoragePrefs) as ListPreference[])
            : null;
    });

    const [data, setData] = useState<LessonActivity[]>([]);
    const [pages, setPages] = useState<number | null>(null);
    const [targets, setTargets] = useState<number[] | "all">([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<Message>(() => ({
        title: t("lessonList.messageDefaultTitle"),
        content: "",
        isEmail: true,
        isSMS: false,
    }));
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activity, setActivity] = useState<LessonActivity | undefined>(
        undefined
    );
    const [currentAppsSeason, setCurrentAppsSeason] =
        useState<SeasonWithIsNext | null>(null);
    const [filterApplied, setFilterApplied] = useState(false);

    const fetchData = (newFilter: FetchDataFilter) => {
        const hasSeasonChanged =
            findAndGet(filter.filtered, (f) => f.id === "season_id", "value") !=
            findAndGet(
                newFilter.filtered,
                (f) => f.id === "season_id",
                "value"
            );

        if (hasSeasonChanged) {
            const seasonId = findAndGet(
                newFilter.filtered,
                (f) => f.id === "season_id",
                "value"
            );
            const season =
                seasonId &&
                (seasons?.find((s) => s.id == seasonId) as
                    SeasonWithIsNext | undefined);
            const refDateFilter = _.find(
                newFilter.filtered,
                (f) => f.id === "reference_date"
            );

            if (refDateFilter && season?.is_next)
                refDateFilter.value = moment(season.start)
                    .add(1, "week")
                    .format(ISO_DATE_FORMAT);
            // Trusts the data the same way the original class did (always finds a
            // reference_date entry here) -- see docs/Jsx-To-Tsx-Migration-Playbook.md's
            // "no new optional-chaining guards" policy.
            else refDateFilter!.value = moment().format(ISO_DATE_FORMAT);
        }

        setLoading(true);
        setFilter(newFilter);

        debounce(() =>
            fetchInstancesList(newFilter).then((result) => {
                // fetchInstancesList resolves to undefined on a fetch error (its own .catch
                // swallows and toasts). TanStackGrid assumes an array (reads .length) and render()
                // does `pages - 1` for the current-page clamp -- default all three rather than
                // propagate undefined into a render-time crash/NaN.
                const { data = [], pages = 1, total = 0 } = result || {};
                const processedData = data.map((lesson) => {
                    const referenceDate = findAndGet(
                        newFilter.filtered,
                        (f) => f.id === "reference_date",
                        "value"
                    );

                    const isOnlyOneOption = isActivityWithOnlyOneOption(
                        lesson,
                        referenceDate
                    );

                    return {
                        ...lesson,
                        isOnlyOneOption,
                    };
                });

                setLoading(false);
                setData(processedData);
                setPages(pages);
                setTotal(total);
            })
        );
    };

    // componentDidMount: resolve the current season once from props (mirrors the original class
    // -- props.seasons is never re-read after mount), kick off the initial fetch.
    useEffect(() => {
        const currentSeason = seasons?.find((s) => s.is_current);

        if (currentSeason) {
            setCurrentAppsSeason(currentSeason);
            fetchData({
                ...filter,
                // Dead weight even in the original: fetchData's hasSeasonChanged check only ever
                // reads filter.filtered's own "season_id" entry, never this flat property, so this
                // fetch behaves identically to one with no season filter at all. Preserved
                // faithfully -- the real season filter is applied by the effect below, same as the
                // original's render-time Filter hack it replaces.
                season_id: currentSeason.id || "",
            } as FetchDataFilter);
        } else {
            fetchData(filter);
        }
        // Mount-only, matching componentDidMount -- intentionally not reacting to later
        // seasons/filter changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // componentDidUpdate: persist the filter whenever it actually changes (the original wrote
    // unconditionally on every update, which was always a no-op rewrite when filter itself hadn't
    // changed).
    useEffect(() => {
        localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filter));
    }, [filter]);

    // Fix for the former render-time setState documented in docs/KnownIssues.md ("courses/
    // LessonList.jsx's 'season' filter calls setState during render"): the season column's Filter
    // used to call onChange()/this.setState() unconditionally from its own render body. Moved
    // here, keyed off currentAppsSeason becoming available (the same dependency
    // componentDidMount already established) plus filterApplied so it only ever fires once.
    useEffect(() => {
        if (currentAppsSeason && !filterApplied) {
            const indexFiltered = _.keyBy(filter.filtered, "id");
            indexFiltered.season_id = {
                id: "season_id",
                value: currentAppsSeason.id || "",
            };

            fetchData({
                ...filter,
                filtered: Object.values(indexFiltered) as ColumnFiltersState,
                page: 0,
            });
            setFilterApplied(true);
        }
    }, [currentAppsSeason, filterApplied]);

    const toggleModal = () => setIsModalOpen((prev) => !prev);

    const onSubmit = (values: {
        repetition: string;
        instanceIds: number[];
        timeIntervalIds: number[];
    }) => {
        if (!activity) return;

        if (values.repetition === "all") {
            api.set()
                .success(() => {
                    swal.fire({
                        title: t("lessonList.successTitle"),
                        icon: "success",
                        allowOutsideClick: false,
                        text: t("lessonList.courseDeleted"),
                        width: "400px",
                        confirmButtonText: t("lessonList.ok"),
                    }).then((res) => {
                        if (res.isConfirmed) {
                            window.location.href = `/activities?auth_token=${csrfToken}`;
                        }
                    });
                })
                .error((errorMsg) => {
                    console.log("error deleting course : ", errorMsg);
                    swal.fire({
                        icon: "error",
                        title: t("lessonList.genericError"),
                    });
                })
                .del(`/activity/${activity.id}`);
        } else {
            api.set()
                .success(() => {
                    swal.fire({
                        title: t("lessonList.successTitle"),
                        icon: "success",
                        allowOutsideClick: false,
                        text: t("lessonList.selectedInstancesDeleted"),
                        width: "400px",
                        confirmButtonText: t("lessonList.ok"),
                    }).then((res) => {
                        if (res.isConfirmed) {
                            window.location.href = `/activities?auth_token=${csrfToken}`;
                        }
                    });
                })
                .error((errorMsg) => {
                    console.log("error deleting course : ", errorMsg);
                    swal.fire({
                        icon: "error",
                        title: t("lessonList.genericError"),
                    });
                })
                .del(
                    `/activity_instances?instance_ids=${values.instanceIds}&time_interval_ids=${values.timeIntervalIds}&activity_id=${activity.id}`
                );
        }
    };

    const downloadExport = () => {
        fetchInstancesList(filter, "csv").then((file) => {
            if (!file) return;
            const download = document.createElement("a");
            download.download = `${moment().format("DD_MM_YYYY-HH_mm_ss")}.csv`;
            download.href = URL.createObjectURL(file);
            document.body.appendChild(download);
            download.click();
            document.body.removeChild(download);
        });
    };

    const downloadStudentsList = async () => {
        let activityIds: number[];
        if (targets === "all") {
            const { page: _page, pageSize: _pageSize, ...rest } = filter;
            const res = await fetchInstancesList(rest, "json");
            activityIds = (res?.data || []).map((item) => item.id);
        } else {
            activityIds = targets;
        }

        if (activityIds.length === 0) {
            swal.fire({
                icon: "error",
                title: t("lessonList.noCourseSelectedTitle"),
                text: t("lessonList.noCourseSelectedText"),
            });
        } else {
            const download = document.createElement("a");
            let activityIdsString = activityIds
                .map((id) => `activity_ids[]=${id}`)
                .join("&");
            download.href = `/students.pdf?${activityIdsString}`;
            document.body.appendChild(download);
            download.click();
            document.body.removeChild(download);
        }
    };

    const handleChangeReferenceDate = (value: string) => {
        const indexFiltered = _.keyBy(filter.filtered, "id");

        indexFiltered.reference_date = { id: "reference_date", value };

        fetchData({
            ...filter,
            filtered: Object.values(indexFiltered) as ColumnFiltersState,
        });
    };

    const updateTarget = (id: number, checked: boolean) => {
        if (checked) {
            // Unreachable in practice when targets === "all": the row checkbox already renders
            // checked in that state (see the selection column's Cell below), so a user can only
            // uncheck it from there, never check it again -- the original's equivalent branch
            // (`[...this.state.targets, id]`) would have spread the string "all" character by
            // character if it were ever reached. Kept as a safe no-op instead of replicating that.
            setTargets((prev) => (prev === "all" ? prev : [...prev, id]));
        } else if (targets === "all") {
            setTargets(data.map((d) => d.id).filter((d) => d !== id));
        } else {
            setTargets((prev) =>
                prev === "all" ? prev : prev.filter((r) => r !== id)
            );
        }
    };

    const resetFilters = () => {
        localStorage.setItem(
            FILTER_STORAGE_KEY,
            JSON.stringify(defaultTableProps())
        );
        fetchData(defaultTableProps());
    };

    const sendReminderMail = (
        referenceDate: string | undefined = undefined
    ) => {
        const to = _.chain(data)
            .filter(({ id }) => targets !== "all" && targets.includes(id))
            .map((d) => d.users)
            .flatten()
            .filter(
                (u) =>
                    referenceDate == undefined ||
                    ((dateOnly(u.begin_at) as string) <= referenceDate &&
                        (dateOnly(u.stopped_at) == undefined ||
                            (dateOnly(u.stopped_at) as string) > referenceDate))
            )
            .compact()
            .map((u) => u.id)
            .uniq()
            .value();

        swal.fire({
            title: t("lessonList.sendConfirmTitle"),
            text: t("common:confirm.sure"),
            icon: "question",
            showCancelButton: true,
        })
            .then((v) => {
                if (v.isConfirmed) {
                    return fetch("/messages/create", {
                        method: "POST",
                        headers: {
                            "X-Csrf-Token": csrfToken,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            message,
                            to,
                        }),
                    });
                }
            })
            .then((res) => {
                if (res) {
                    if (res.ok)
                        swal.fire({
                            title: t("lessonList.successTitle"),
                            text: t("lessonList.messageSent"),
                            icon: "success",
                        });
                    else
                        throw new Error(
                            t("lessonList.httpError", {
                                status: res.status,
                                statusText: res.statusText,
                            })
                        );
                }
            })
            .catch((reason) =>
                swal.fire({
                    title: t("lessonList.errorTitle"),
                    text: reason,
                    icon: "error",
                })
            );
    };

    const handleUpdateListPreferences = (prefs: ListPreference[]) => {
        setListPreferences(prefs);
        localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
    };

    const renderTargetsAlert = () => {
        const count = (targets === "all" && total) || targets.length;

        return (
            <div className="alert alert-info m-t-sm" style={{ width: "100%" }}>
                <div className="flex flex-space-between-justified flex-center-aligned">
                    <div id="targets-infos">
                        {t("lessonList.selectedCount", { count })}{" "}
                        {targets !== "all" &&
                        targets.length === data.length &&
                        Math.max(total - targets.length, 0) ? (
                            <button
                                onClick={() => setTargets("all")}
                                className="btn btn-sm btn-info m-l-sm"
                            >
                                {t("lessonList.selectRemaining", {
                                    count: total - targets.length,
                                })}
                            </button>
                        ) : null}
                    </div>
                    <div id="targets-actions">
                        <button
                            className="btn btn-sm btn-primary m-r"
                            onClick={() => downloadStudentsList()}
                        >
                            {t("lessonList.downloadStudentList")}
                        </button>
                        <button
                            className="btn btn-sm btn-primary m-r"
                            disabled={targets === "all"}
                            data-toggle="modal"
                            data-target={`#${MESSAGE_MODAL_ID}`}
                        >
                            {t("lessonList.sendMessage")}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const refsOptions = _.sortBy(activityRefs, (r) => r.label).map(
        optionMapper({})
    );

    const teachersOptions = _.sortBy(
        teachers,
        (teacher) => teacher.last_name
    ).map(
        optionMapper({
            label: (teacher) => `${teacher.last_name} ${teacher.first_name}`,
        })
    );

    const seasonsOptions = _.sortBy(seasons || [], (s) => s.label).map(
        optionMapper({})
    );

    const roomsOptions = _.sortBy(rooms, (r) => r.label).map(optionMapper({}));

    const locationsOptions = _.sortBy(locations, (l) => l.label).map(
        optionMapper({})
    );

    const now = moment();

    const daysOptions = [1, 2, 3, 4, 5, 6, 0].map((i) => {
        const day = now.day(i);
        return (
            <option key={i} value={i}>
                {_.capitalize(day.format("dddd"))}
            </option>
        );
    });

    const referenceDate =
        (findAndGet(
            filter.filtered,
            (f) => f.id === "reference_date",
            "value"
        ) as string) || moment().format(ISO_DATE_FORMAT);

    const totalRecipients = _.chain(data)
        .filter((d) => targets === "all" || targets.includes(d.id))
        .map((d) => d.users)
        .flatten()
        .filter(
            (u) =>
                referenceDate == undefined ||
                ((dateOnly(u.begin_at) as string) <= referenceDate &&
                    (dateOnly(u.stopped_at) == undefined ||
                        (dateOnly(u.stopped_at) as string) > referenceDate))
        )
        .compact()
        .uniqBy((u) => u.id)
        .value();

    let recipientsToDisplay = totalRecipients.slice(0, NB_DISPLAYED_RECIPIENTS);

    let recipients = recipientsToDisplay
        .map((u) => `${u.first_name} ${u.last_name}`)
        .join(", ");

    const restCount = Math.max(
        0,
        targets === "all"
            ? total - NB_DISPLAYED_RECIPIENTS
            : totalRecipients.length - NB_DISPLAYED_RECIPIENTS
    );
    if (restCount)
        recipients += t("lessonList.andNOthers", { count: restCount });

    const isTargeted = (r: LessonActivity) =>
        targets !== "all" && targets.includes(r.id);
    const averageAge = (d: LessonActivity) =>
        TimeIntervalHelpers.averageAge(d.users);

    const tableColumns: LegacyColumn<LessonActivity>[] = [
        {
            Header: "",
            id: "selection",
            width: 25,
            sortable: false,
            accessor: isTargeted,
            Filter: () => (
                <input
                    type="checkbox"
                    checked={
                        targets === "all" || targets.length === data.length
                    }
                    onChange={(e) =>
                        e.target.checked
                            ? setTargets(data.map((r) => r.id))
                            : setTargets([])
                    }
                />
            ),
            Cell: (d) => (
                <input
                    type="checkbox"
                    checked={targets === "all" || isTargeted(d.original)}
                    onChange={(e) =>
                        updateTarget(d.original.id, e.target.checked)
                    }
                />
            ),
        },
        {
            Header: t("lessonList.columns.day"),
            id: "day",
            accessor: (d) => d.time_interval,
            Cell: (c) =>
                c.original.time_interval
                    ? moment(c.original.time_interval.start).format("dddd")
                    : "?",
            Filter: ({ filter: f, onChange }) => (
                <FilterSelect
                    value={(f && (f.value as string)) || ""}
                    onChange={(e) => onChange(e.target.value)}
                >
                    <option value="" />
                    {daysOptions}
                </FilterSelect>
            ),
        },
        {
            Header: t("lessonList.columns.schedule"),
            id: "time_interval",
            sortable: false,
            accessor: (d) => d.time_interval,
            Filter: ({ filter: f, onChange }) => {
                const value =
                    (f && (f.value as { start?: string; end?: string })) || {};
                const start = value.start || "";
                const end = value.end || "";

                return (
                    <div className="flex flex-space-around-justified">
                        <input
                            type="time"
                            className="form-control form-control-small"
                            value={start}
                            onChange={(e) =>
                                onChange({ ...value, start: e.target.value })
                            }
                        />
                        <input
                            type="time"
                            className="form-control form-control-small"
                            value={end}
                            onChange={(e) =>
                                onChange({ ...value, end: e.target.value })
                            }
                        />
                    </div>
                );
            },
            Cell: (c) => {
                if (c.original.time_interval) {
                    return `${moment(c.original.time_interval.start).format(
                        "HH:mm"
                    )} ➝ ${moment(c.original.time_interval.end).format("HH:mm")}`;
                } else {
                    return "?";
                }
            },
        },
        {
            Header: t("lessonList.columns.group"),
            id: "group_name",
            accessor: (d) => d.group_name,
            Cell: (c) => <strong>{c.original.group_name}</strong>,
        },
        {
            Header: t("lessonList.columns.activity"),
            id: "activity_ref_id",
            accessor: (d) => d.activity_ref_id,
            Cell: (c) => {
                return (
                    <span>
                        {
                            activityRefs.find(
                                (r) => r.id === c.original.activity_ref_id
                            )?.label
                        }
                    </span>
                );
            },
            Filter: ({ filter: f, onChange }) => (
                <FilterSelect
                    onChange={(e) => onChange(e.target.value)}
                    value={f ? (f.value as string) : ""}
                >
                    <option value="" />
                    {refsOptions}
                </FilterSelect>
            ),
        },
        ...(!isTeacherView
            ? [
                  {
                      Header: t("lessonList.columns.teacher"),
                      id: "teacher_id",
                      accessor: (d: LessonActivity) => d.teacher,
                      Cell: (c: { original: LessonActivity }) =>
                          `${c.original.teacher?.first_name} ${c.original.teacher?.last_name}`,
                      Filter: ({
                          filter: f,
                          onChange,
                      }: {
                          filter?: { value: unknown };
                          onChange: (value: unknown) => void;
                      }) => (
                          <FilterSelect
                              onChange={(e) => onChange(e.target.value)}
                              value={f ? (f.value as string) : ""}
                          >
                              <option value="" />
                              {teachersOptions}
                          </FilterSelect>
                      ),
                  },
              ]
            : []),
        {
            Header: t("lessonList.columns.room"),
            id: "room",
            accessor: (a) => {
                // filtre les salles en fonction de celle de la premiere instance trouvée. Ne devrais pas contenir plus d'une salle
                const matchingRooms = rooms.filter(
                    (r) => r.id === a.activity_instance?.room_id
                );

                // affiche le nom de la salle de la première instance ou le nom de la salle enregistré dans l'activité sinon. (pas la bonne dans certains cas)
                return matchingRooms.length > 0
                    ? matchingRooms[0].label
                    : a.room?.label;
            },
            Filter: ({ filter: f, onChange }) => (
                <FilterSelect
                    style={{ maxWidth: "115px" }}
                    onChange={(e) => onChange(e.target.value)}
                    value={f ? (f.value as string) : ""}
                >
                    <option value="" />
                    {roomsOptions}
                </FilterSelect>
            ),
        },
        {
            Header: t("lessonList.columns.location"),
            id: "location",
            accessor: (a) => a.location.label,
            Filter: ({ filter: f, onChange }) => (
                <FilterSelect
                    style={{ maxWidth: "115px" }}
                    onChange={(e) => onChange(e.target.value)}
                    value={f ? (f.value as string) : ""}
                >
                    <option value="" />
                    {locationsOptions}
                </FilterSelect>
            ),
        },
        {
            Header: t("lessonList.columns.occupation"),
            id: "occupation",
            Cell: (c) => formatActivityHeadcount(c.original, referenceDate),
            Filter: ({ filter: f, onChange }) => {
                const options = [
                    {
                        value: null,
                        text: t("lessonList.occupation.all"),
                        icon: "Ω",
                    },
                    {
                        value: "EMPTY",
                        text: t("lessonList.occupation.empty"),
                        icon: "fas fa-circle",
                        faIcon: true,
                    },
                    {
                        value: "NOR_EMPTY_NOR_FULL",
                        text: t("lessonList.occupation.notEmpty"),
                        icon: "fas fa-adjust",
                        faIcon: true,
                    },
                    {
                        value: "NOT_FULL",
                        text: t("lessonList.occupation.notFull"),
                        icon: "fas fa-adjust fa-flip-horizontal",
                        faIcon: true,
                    },
                    {
                        value: "FULL",
                        text: t("lessonList.occupation.full"),
                        icon: "fas fa-circle",
                        faIcon: true,
                        color: "#d63031",
                    },
                ];

                const value = options.find((o) => o.value == (f && f.value));

                return (
                    <FilterReactSelect
                        options={options}
                        defaultValue={options[0]}
                        value={value}
                        onChange={(v: (typeof options)[number]) =>
                            onChange(v.value)
                        }
                        isSearchable={false}
                        isMulti={false}
                        // react-select's `getOptionLabel` is typed to return a plain string (used
                        // for aria labels / search filtering) -- the original passed a JSX element
                        // through it instead, a type mismatch invisible before this conversion.
                        // `formatOptionLabel` is the real, ReactNode-typed hook for custom
                        // rendering (covers both the menu options and the selected value here,
                        // same as the original's single getOptionLabel did); kept getOptionLabel
                        // too, now returning real text, so aria/search get a sane fallback instead
                        // of "[object Object]".
                        getOptionLabel={({ text }: (typeof options)[number]) =>
                            text
                        }
                        formatOptionLabel={({
                            text,
                            icon,
                            faIcon,
                        }: (typeof options)[number]) => (
                            <React.Fragment>
                                <b>
                                    {faIcon ? (
                                        <i className={icon + " m-r-xs"} />
                                    ) : (
                                        icon
                                    )}
                                </b>{" "}
                                {text}
                            </React.Fragment>
                        )}
                        styles={{
                            option: (styles: any, { data }: any) => {
                                return {
                                    ...styles,
                                    color: data.color || "inherit",
                                };
                            },
                            singleValue: (styles: any, { data }: any) => ({
                                ...styles,
                                color: data.color || "inherit",
                            }),
                            dropdownIndicator: (styles: any) => ({
                                ...styles,
                                display: "none",
                            }),
                            indicatorSeparator: (styles: any) => ({
                                ...styles,
                                display: "none",
                            }),
                        }}
                    />
                );
            },
        },
        {
            Header: t("lessonList.columns.age"),
            id: "average_age",
            accessor: averageAge,
            Cell: (c) =>
                TimeIntervalHelpers.averageAgeDisplay(averageAge(c.original)),
        },
        {
            Header: t("lessonList.columns.level"),
            id: "level",
            accessor: (d) => d,
            Filter: ({ filter: f, onChange }) => (
                <FilterSelect
                    onChange={(e) => onChange(e.target.value)}
                    value={f ? (f.value as string) : ""}
                >
                    <option value="" />
                    <option value="TBD">{t("lessonList.toBeSpecified")}</option>
                    {evaluationLevelRefs.map((r) => (
                        <option key={r.id} value={r.id}>
                            {r.label}
                        </option>
                    ))}
                </FilterSelect>
            ),
            Cell: (c) =>
                TimeIntervalHelpers.levelDisplayLabel(
                    TimeIntervalHelpers.levelDisplayForActivity(
                        c.original,
                        seasons || []
                    )
                ),
        },
        {
            Header: t("lessonList.columns.season"),
            id: "season_id",
            accessor: (d) => d.time_interval,
            Cell: (c) => {
                const season = TimeIntervalHelpers.getSeasonFromDate(
                    c.original.time_interval && c.original.time_interval.start,
                    seasons || []
                );
                return (season && season.label) || "ø";
            },
            Filter: ({ filter: f, onChange }) => (
                <FilterSelect
                    onChange={(e) => onChange(e.target.value)}
                    value={(f?.value as string) ?? ""}
                >
                    <option value="" />
                    {seasonsOptions}
                </FilterSelect>
            ),
        },
        {
            Header: t("lessonList.columns.action"),
            id: "action",
            filterable: false,
            sortable: false,
            Cell: (c) => (
                <div className="btn-toolbar">
                    <a
                        className="btn btn-sm btn-primary"
                        data-tippy-content={t("lessonList.actions.view")}
                        style={{ cursor: "pointer" }}
                        href={
                            c.original.time_interval
                                ? `/planning/${
                                      c.original.teacher?.planning?.id
                                  }/${moment(
                                      c.original.time_interval.start
                                  ).format(ISO_DATE_FORMAT)}`
                                : "/activities"
                        }
                    >
                        <i className="fas fa-eye" />
                    </a>
                    <DownloadButton
                        url={`/activity/${c.original.id}/users.csv`}
                        data-tippy-content={t(
                            "lessonList.actions.exportContacts"
                        )}
                    >
                        <i className="fas fa-table" />
                    </DownloadButton>
                    <button
                        className="btn btn-sm btn-warning"
                        data-tippy-content={t("lessonList.actions.delete")}
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                            toggleModal();
                            setActivity(c.original);
                        }}
                    >
                        <i className="fas fa-trash" />
                    </button>
                </div>
            ),
        },
    ];

    let filteredColumns = [...tableColumns];
    if (listPreferences) {
        filteredColumns = [
            tableColumns[0],
            ..._(tableColumns.slice(1))
                .filter((c) =>
                    Boolean(
                        _.find(listPreferences, { id: c.id, disabled: false })
                    )
                )
                .sortBy((c) => _.findIndex(listPreferences, { id: c.id }))
                .value(),
        ];
    }

    return (
        <div className="ibox">
            <div className="ibox-title">
                <div className="flex flex-center-aligned">
                    <h2 className="m-r" style={{ whiteSpace: "nowrap" }}>
                        {t("lessonList.courseCount", { count: total })}
                    </h2>
                    <ListPreferences
                        preferences={listPreferences}
                        columns={tableColumns.slice(1)}
                        className="m-r"
                        onSubmit={(prefs: ListPreference[]) =>
                            handleUpdateListPreferences(prefs)
                        }
                    />
                    <button
                        className="btn btn-primary m-r"
                        data-tippy-content={t("lessonList.resetFilters")}
                        onClick={() => resetFilters()}
                    >
                        <i className="fas fa-times" />
                    </button>
                    <button
                        className="btn btn-primary m-r"
                        data-tippy-content={t("lessonList.exportCsv")}
                        onClick={() => downloadExport()}
                    >
                        <i className="fas fa-download" />
                    </button>
                    <div
                        className="flex flex-end-justified"
                        style={{ flex: "auto" }}
                    >
                        <div
                            className="input-group"
                            data-tippy-content={t(
                                "lessonList.referenceDateTooltip"
                            )}
                            style={{ maxWidth: "250px" }}
                        >
                            <div className="input-group-addon">
                                <i className="fas fa-calendar" />
                            </div>
                            <input
                                id="headcount-reference"
                                type="date"
                                className="form-control"
                                value={referenceDate}
                                onChange={(e) =>
                                    handleChangeReferenceDate(e.target.value)
                                }
                            />
                            <a
                                className="input-group-addon ui-pg-button"
                                onClick={() => {
                                    swal.fire({
                                        icon: "info",
                                        // Real bug found during this conversion: sweetalert2 v11's
                                        // `customClass` takes a per-element map, not a bare string
                                        // (that was the v7 shape) -- silently inert since the v11
                                        // bump (roadmap item 7), surfaced now because this field
                                        // is actually typed. `.bigSwal` still exists in
                                        // packs/application.scss, so this restores its effect.
                                        customClass: { popup: "bigSwal" },
                                        title: t("lessonList.help.title"),
                                        html: t("lessonList.help.body"),
                                    });
                                }}
                            >
                                <i className="fas fa-question-circle"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <div className="ibox-content">
                {targets.length > 0 ? renderTargetsAlert() : null}
                <TanStackGrid<LessonActivity>
                    tableName="table-lessons"
                    style={{ backgroundColor: "white" }}
                    data={data}
                    pages={pages}
                    totalCount={total}
                    columns={filteredColumns}
                    loading={loading}
                    pageSizeOptions={[5, 10, 15, 20, 50, 100]}
                    pagination={{
                        pageIndex:
                            pages !== null && filter.page <= pages
                                ? filter.page
                                : (pages ?? 1) - 1,
                        pageSize: filter.pageSize,
                    }}
                    onPaginationChange={({ pageIndex, pageSize }) =>
                        fetchData({ ...filter, page: pageIndex, pageSize })
                    }
                    sorting={filter.sorted}
                    onSortingChange={(sorted) =>
                        fetchData({ ...filter, sorted })
                    }
                    columnFilters={filter.filtered}
                    onColumnFiltersChange={(filtered) =>
                        fetchData({ ...filter, filtered, page: 0 })
                    }
                    getRowProps={(original) =>
                        original.isOnlyOneOption
                            ? { style: { color: "#9575CD" } }
                            : undefined
                    }
                    renderSubComponent={(row) => {
                        let hasUser =
                            row.original.users.filter(
                                (u) =>
                                    referenceDate == undefined ||
                                    ((dateOnly(u.begin_at) as string) <=
                                        referenceDate &&
                                        (dateOnly(u.stopped_at) == undefined ||
                                            (dateOnly(u.stopped_at) as string) >
                                                referenceDate))
                            ).length > 0;

                        if (
                            hasUser ||
                            (row.original.options?.length || 0) > 0
                        ) {
                            return (
                                <UserList
                                    activity={row.original}
                                    seasons={seasons}
                                    referenceDate={referenceDate}
                                />
                            );
                        } else {
                            return null;
                        }
                    }}
                />
                <MessageModal
                    id={MESSAGE_MODAL_ID}
                    recipients={recipients}
                    message={message}
                    onChange={(
                        e: React.ChangeEvent<
                            HTMLInputElement | HTMLTextAreaElement
                        >
                    ) =>
                        setMessage({
                            ...message,
                            [e.target.name]: e.target.value,
                        })
                    }
                    onSend={() => sendReminderMail(referenceDate)}
                />
                <Modal
                    isOpen={isModalOpen}
                    ariaHideApp={false}
                    contentLabel={t("lessonList.deleteModalLabel")}
                    onRequestClose={toggleModal}
                    style={{
                        content: {
                            top: "5%",
                            left: "auto",
                            right: "auto",
                            bottom: "auto",
                        },
                    }}
                >
                    <DeleteCourseModal
                        seasons={seasons}
                        activity={activity}
                        time_interval={
                            activity ? activity.time_interval : undefined
                        }
                        startTime={
                            activity && activity.time_interval
                                ? moment(activity.time_interval.start)
                                : undefined
                        }
                        onSubmit={onSubmit}
                        onClose={toggleModal}
                    />
                </Modal>
            </div>
        </div>
    );
}

// Module-singleton debounce, shared across every LessonList instance -- matches the original's
// module-scope `_.debounce`, unaffected by the class -> function conversion.
const debounce = _.debounce((f: () => void, ..._args: unknown[]) => {
    return f();
}, 400);

interface UserListProps {
    activity: LessonActivity;
    seasons?: Season[];
    referenceDate?: string;
}

const UserList = ({
    activity,
    seasons,
    referenceDate = undefined,
}: UserListProps) => {
    const { t } = useTranslation("courses");
    return (
        <div className="flex-column">
            <div className="flex" style={{ padding: "15px" }}>
                <h3 className="m-r">
                    {t("lessonList.userList.evaluationsFilled", {
                        done: activity.student_evaluations.length,
                        total: activity.users.length,
                    })}
                </h3>
                <a
                    className="btn btn-primary"
                    href={`/users/${activity.teacher?.id}/activity/${activity.id}/evaluate`}
                >
                    {t("lessonList.userList.viewEvaluations")}
                </a>
            </div>
            <table className="table table-bordered">
                <thead>
                    <tr>
                        <th>{t("lessonList.userList.name")}</th>
                        <th>{t("lessonList.columns.age")}</th>
                        <th>{t("lessonList.columns.level")}</th>
                        {activity.activity_ref.is_work_group && (
                            <th>{t("lessonList.userList.instrument")}</th>
                        )}
                        <th>{t("lessonList.userList.startedOn")}</th>
                        <th>{t("lessonList.userList.stoppedOn")}</th>
                    </tr>
                </thead>
                <tbody>
                    {_.orderBy(activity.users, (u) => u.last_name).map((u) => (
                        <UserRow
                            key={u.id}
                            user={u}
                            seasons={seasons}
                            activity={activity}
                            referenceDate={referenceDate}
                        />
                    ))}
                    {_.orderBy(activity.options, (o) => o.user.last_name).map(
                        (o) => (
                            <UserRow
                                key={o.user.id}
                                isOption={true}
                                user={o.user}
                                seasons={seasons}
                                activity={activity}
                            />
                        )
                    )}
                </tbody>
            </table>
        </div>
    );
};

interface UserRowProps {
    user: User;
    seasons?: Season[];
    activity: LessonActivity;
    isOption?: boolean;
    referenceDate?: string;
}

const UserRow = ({
    user,
    seasons,
    activity,
    isOption = false,
    referenceDate = undefined,
}: UserRowProps) => {
    const { t } = useTranslation("courses");
    const customStyle: React.CSSProperties = isOption
        ? { color: "#9575CD" }
        : {};

    if (referenceDate !== undefined) {
        if ((dateOnly(user.begin_at) as string) > referenceDate)
            customStyle.color = "#fca000";
        if (
            dateOnly(user.stopped_at) !== undefined &&
            (dateOnly(user.stopped_at) as string) <= referenceDate
        )
            customStyle.color = "#ff001a";
    }

    const {
        time_interval,
        activity_ref_id,
        activity_ref: activityRef,
        activity_ref: { is_work_group: isWorkGroup },
    } = activity;
    const users = [user];

    const userInstrument =
        (isWorkGroup &&
            (activity.activities_instruments || [])
                .filter((ai) => ai.user_id === user.id)
                .map((ai) => ai.instrument?.label)
                .join(", ")) ||
        t("lessonList.userRow.notAssigned");

    const [studentLevel, setStudentLevel] = useState<string | null>(null);
    const [activityApplicationId, setActivityApplicationId] = useState<
        number | null
    >(null);

    useEffect(() => {
        let isMounted = true;
        api.set()
            .error((error: unknown) => {
                if (!isMounted) return;
                console.error(
                    "Erreur lors de la récupération de la demande d'inscription:",
                    error
                );
            })
            .success((data: DesiredActivityResponse) => {
                if (!isMounted || !data) return;
                if (data.evaluation_level_ref) {
                    // desired_activity_controller.rb renders evaluation_level_ref as a bare string,
                    // not an object -- Activity.jsx (activityApplications/summary) handles the same
                    // endpoint this way already. `.label` on a string is always undefined, so
                    // studentLevel never got set at all and every row fell through to the
                    // levelDisplayForActivity recompute below, regardless of what the API actually
                    // returned. (The LEVEL_NOT_INDICATED fast path in displayLevel() below is a
                    // separate, still effectively dead branch: the API's evaluation_level_ref is a
                    // real DB label, never the JS "NON INDIQUÉ" sentinel -- see LEVEL_NOT_INDICATED's
                    // own definition -- so that comparison isn't expected to fire either way.)
                    setStudentLevel(data.evaluation_level_ref);
                }

                setActivityApplicationId(data.activity_application_id ?? null);
            })
            .get(
                `/desired_activities/user/${user.id}/activity/${activity.id}/ref/${activity.activity_ref_id}/time/${activity.time_interval_id}`
            );
        return () => {
            isMounted = false;
        };
    }, [
        user.id,
        activity.id,
        activity.activity_ref_id,
        activity.time_interval_id,
    ]);

    const inscriptionUrl = activityApplicationId
        ? `/inscriptions/${activityApplicationId}`
        : "#";

    // Modification principale : priorité à studentLevel, puis vérification explicite
    const displayLevel = () => {
        if (studentLevel === TimeIntervalHelpers.LEVEL_NOT_INDICATED) {
            return t("lessonList.userRow.notSpecified");
        }
        if (studentLevel) {
            return studentLevel;
        }

        const computedLevel = TimeIntervalHelpers.levelDisplayForActivity(
            {
                users,
                activity_ref_id,
                time_interval,
                activity_ref: activityRef,
            },
            seasons
        );

        // levelDisplayForActivity returns the TimeIntervalHelpers.LEVEL_* sentinels for the
        // no-level case — map both to the translated placeholder so an English row doesn't
        // show a lone French cell.
        return computedLevel &&
            computedLevel !== TimeIntervalHelpers.LEVEL_TO_SPECIFY &&
            computedLevel !== TimeIntervalHelpers.LEVEL_NOT_INDICATED
            ? computedLevel
            : t("lessonList.userRow.notSpecified");
    };

    return (
        <tr style={customStyle}>
            <td>
                <a href={inscriptionUrl}>
                    {user.first_name} {user.last_name}
                </a>
            </td>
            <td>
                {t("lessonList.userRow.ageYears", {
                    age: TimeIntervalHelpers.age(user.birthday),
                })}
            </td>
            <td>{displayLevel()}</td>
            {isWorkGroup && <td>{userInstrument}</td>}
            <td>
                {(user.begin_at &&
                    Intl.DateTimeFormat(
                        i18n.language,
                        SCHOOL_DATE_FORMAT_OPTIONS
                    ).format(new Date(user.begin_at))) ||
                    ""}
            </td>
            <td>
                {(user.stopped_at &&
                    Intl.DateTimeFormat(
                        i18n.language,
                        SCHOOL_DATE_FORMAT_OPTIONS
                    ).format(new Date(user.stopped_at))) ||
                    ""}
            </td>
        </tr>
    );
};

export default LessonList;
