import React, { useState, useEffect, Fragment } from "react";
import ReactTable from "react-table";
import { csrfToken } from "../utils";
import { useTranslation } from "react-i18next";

const PackUtilization = () => {
    const { t } = useTranslation("activityApplications");
    const [data, setData] = useState([]);
    const [pages, setPages] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingTable, setLoadingTable] = useState(true);
    const [filter, setFilter] = useState({});
    const [tableState, setTableState] = useState({});
    const [subComponent, setSubComponent] = useState(null);
    const [selectedTeacher, setSelectedTeacher] = useState("");
    const [selectedActivityRef, setSelectedActivityRef] = useState("");
    const [selectedSeason, setSelectedSeason] = useState("");
    const [teachers, setTeachers] = useState([]);
    const [activityRefs, setActivityRefs] = useState([]);
    const [seasonsList, setSeasonsList] = useState([]);
    const [nbStudents, setNbStudents] = useState(0);

    const columns = [
        {
            Header: t("activityApplications:packs.columns.number"),
            accessor: "id",
            width: 75,
        },
        {
            id: "lastname",
            Header: t("activityApplications:packs.columns.name"),
            accessor: u => u.user.last_name,
        },
        {
            id: "firstname",
            Header: t("activityApplications:packs.columns.firstName"),
            accessor: u => u.user.first_name,
        },
        {
            id: "nb_lessons",
            Header: t("activityApplications:packs.columns.remainingLessons"),
            accessor: d =>
                t("activityApplications:packs.remainingLessonsOf", {
                    remaining: d.lessons_remaining,
                    total:
                        d.activity_ref_pricing.pricing_category.number_lessons,
                }),
        },
        {
            id: "activity",
            Header: t("activityApplications:packs.columns.activity"),
            accessor: d => d.activity_ref.label,
        },
    ];

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (
            selectedSeason !== tableState.selectedSeason ||
            selectedTeacher !== tableState.selectedTeacher ||
            selectedActivityRef !== tableState.selectedActivityRef
        ) {
            fetchTableData(tableState, null);
        }
    }, [selectedSeason, selectedTeacher, selectedActivityRef]);

    const fetchData = () => {
        setLoading(true);

        fetch(`/get_student_packs_attendance`, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "X-CSRF-Token": csrfToken,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
        })
            .then(response => response.json())
            .then(result => {
                setTeachers(result.teachers);
                setActivityRefs(result.activity_refs);
                setSeasonsList(result.seasons);
                setNbStudents(result.nb_students);
                setLoading(false);
            });
    };

    const fetchTableData = (state, instance) => {
        setLoadingTable(true);
        setFilter(state);
        setTableState(state);

        requestData(state.pageSize, state.page, state.sorted, state.filtered)
            .then(response => response.json())
            .then(result => {
                setData(result.packs);
                setLoadingTable(false);
            });
    };

    const requestData = (pageSize, page, sorted, filtered, format) => {
        return fetch(
            `/get_student_packs_attendance_by_filter${
                format ? "." + format : ""
            }`,
            {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "X-CSRF-Token": csrfToken,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    pageSize,
                    page,
                    sorted: sorted ? sorted[0] : { id: "id", desc: true },
                    filtered,
                    selectedSeason,
                    selectedTeacher,
                    selectedActivityRef,
                }),
            }
        );
    };

    const handleSelectChange = (event, data) => {
        switch (data) {
            case "selectedTeacher":
                setSelectedTeacher(event.target.value);
                break;
            case "selectedActivityRef":
                setSelectedActivityRef(event.target.value);
                break;
            case "selectedSeason":
                setSelectedSeason(event.target.value);
                break;
            default:
                break;
        }
    };

    if (loading) {
        return <p>{t("activityApplications:packs.loadingData")}</p>;
    }

    return (
        <Fragment>
            <div className="row wrapper border-bottom white-bg page-heading">
                <h1>{t("activityApplications:packs.studentTracking")}</h1>
            </div>

            <div className="white-bg pt-5 pb-5 p-1 mt-4">
                <div className="d-flex justify-content-end mb-3">
                    <select
                        className="custom-select mr-2"
                        value={selectedTeacher}
                        onChange={event =>
                            handleSelectChange(event, "selectedTeacher")
                        }
                    >
                        <option value="">
                            {t("activityApplications:packs.filters.teachers")}
                        </option>
                        {teachers.map(teacher => (
                            <option key={teacher.id} value={teacher.id}>
                                {teacher.first_name} {teacher.last_name}
                            </option>
                        ))}
                    </select>

                    <select
                        className="custom-select mr-2"
                        value={selectedActivityRef}
                        onChange={event =>
                            handleSelectChange(event, "selectedActivityRef")
                        }
                    >
                        <option value="">
                            {t("activityApplications:packs.filters.activities")}
                        </option>
                        {activityRefs.map(activity => (
                            <option key={activity.id} value={activity.id}>
                                {activity.label}
                            </option>
                        ))}
                    </select>

                    <select
                        className="custom-select mr-4"
                        value={selectedSeason}
                        onChange={event =>
                            handleSelectChange(event, "selectedSeason")
                        }
                    >
                        <option value="">
                            {t(
                                "activityApplications:packs.filters.selectSeason"
                            )}
                        </option>
                        {seasonsList.map(season => (
                            <option key={season.id} value={season.id}>
                                {season.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="col">
                    <ReactTable
                        data={data}
                        manual
                        pages={pages}
                        loading={loadingTable}
                        onFetchData={(state, instance) =>
                            fetchTableData(state, instance)
                        }
                        columns={columns}
                        defaultSorted={[{ id: "id", desc: true }]}
                        resizable={false}
                        previousText={t("common:reactTable.previousText")}
                        nextText={t("common:reactTable.nextText")}
                        loadingText={t("common:reactTable.loadingText")}
                        noDataText={t("common:reactTable.noDataText")}
                        pageText={t("common:reactTable.pageText")}
                        ofText={t("common:reactTable.ofText")}
                        rowsText={t("common:reactTable.rowsText")}
                        minRows={1}
                        SubComponent={subComponent}
                    />
                </div>

                <div className="d-flex justify-content-center mt-5">
                    <p className="mt-4 font-size-big">
                        {t("activityApplications:packs.totalStudents", {
                            n: nbStudents,
                        })}
                    </p>
                </div>
            </div>
        </Fragment>
    );
};

export default PackUtilization;
