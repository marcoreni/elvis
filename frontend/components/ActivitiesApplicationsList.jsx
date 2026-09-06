import React, { Fragment } from "react";
import { withTranslation, useTranslation } from "react-i18next";
import _ from "lodash";
import ReactTable from "react-table";
import Select from "react-select";
import Loader from "react-loader-spinner";
import swal from "sweetalert2";

import {
    age,
    levelDisplay,
    levelDisplayLabel,
} from "./planning/TimeIntervalHelpers";
import { csrfToken, optionMapper, USER_OPTIONS_SHORT } from "./utils";
import { makeDebounce } from "../tools/inputs";
import { PRE_APPLICATION_ACTION_LABELS } from "../tools/constants";
import ListPreferences from "./common/ListPreferences";
import StopList from "./StopList";
import UserWithInfos from "./common/UserWithInfos";
import ButtonModal from "./common/ButtonModal";
import ActivitiesApplicationsDashboard from "./ActivitiesApplicationsDashboard";
import JobProgress from "./JobProgress";
import ReactDOM from "react-dom";

import {
    ACTIVITY_ATTRIBUTED_ID,
    ACTIVITY_PROPOSED_ID,
    PROPOSAL_ACCEPTED_ID,
    CANCELED_ID,
} from "./utils/ActivityApplicationsStatuses";
import Swal from "sweetalert2";

import moment from "moment";

const FILTER_STORAGE_KEY = "activities_application_list_filters";
const PREFERENCES_STORAGE_KEY = "activities_applications_list_preferences";

const displayActivityName = a =>
    a.activity_type === "child" || a.activity_type === "cham"
        ? a.label
        : a.kind;

const requestData = (pageSize, page, sorted, filtered, format) => {
    return fetch(`/inscriptions/list${format ? `.${format}` : ""}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/csv",
            "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
            pageSize,
            page,
            sorted: sorted[0],
            filtered,
        }),
    });
};

const defaultTableProps = () => ({
    page: 0,
    pageSize: 16,
    sorted: [{ id: "date", desc: true }],
    filtered: [],
    resized: [],
    expanded: {},
});

const debounce = makeDebounce();

class ActivitiesApplicationsList extends React.Component {
    constructor(props) {
        super(props);
        console.log("Props initiaux :", props);

        const localStorageFilter = localStorage.getItem(FILTER_STORAGE_KEY);
        const filter =
            localStorageFilter != null
                ? JSON.parse(localStorageFilter)
                : defaultTableProps();

        const localStoragePrefs = localStorage.getItem(PREFERENCES_STORAGE_KEY);
        const listPreferences =
            localStoragePrefs && JSON.parse(localStoragePrefs);

        this.state = {
            data: [],
            pages: 0,
            loading: true,
            listPreferences,
            filter,
            bulkTargets: [],
            bulkEdit: {
                activity_application_status_id: "",
            },
            jobSubmitted: false,
            jobId: null,
        };

        this.fileInput = React.createRef();

        this.statusFilterContainsTerminalStatus = this.statusFilterContainsTerminalStatus.bind(
            this
        );
    }

    showJobProgressModal(jobId) {
        const { t } = this.props;
        const container = document.createElement("div");
        ReactDOM.render(
            <JobProgress
                jobId={jobId}
                onError={res =>
                    swal({
                        title: t("common:jobProgress.errorTitle"),
                        text: res,
                        type: "error",
                    })
                }
            />,
            container
        );

        swal({
            title: t("activityApplications:list.jobProgressTitle"),
            html: container,
            showCloseButton: true,
            focusConfirm: false,
            confirmButtonText: "OK",
        });
    }
    componentDidMount() {
        this.fetchData(this.state.filter);
    }

    componentDidUpdate(prevProps, prevState) {
        localStorage.setItem(
            FILTER_STORAGE_KEY,
            JSON.stringify(this.state.filter)
        );
    }

    handleUpdateListPreferences(prefs) {
        this.setState(
            {
                listPreferences: prefs,
            },
            () =>
                localStorage.setItem(
                    PREFERENCES_STORAGE_KEY,
                    JSON.stringify(prefs)
                )
        );
    }

    downloadExport() {
        this.setState({
            exportOngoing: true,
        });
        requestData(
            this.state.filter.pageSize,
            this.state.filter.page,
            this.state.filter.sorted,
            this.state.filter.filtered,
            "csv"
        )
            .then(res => res.blob())
            .then(file => {
                this.setState({ exportOngoing: false });

                const download = document.createElement("a");
                download.download = `${moment().format(
                    "DD_MM_YYYY-HH_mm_ss"
                )}.csv`;
                download.href = URL.createObjectURL(file);
                document.body.appendChild(download);
                download.click();
                document.body.removeChild(download);
            });
    }

    handleFileSelect() {
        const file = this.fileInput.current.files[0];
        const formData = new FormData();
        formData.append("file", file);

        this.setState({
            importOngoing: true,
        });
        fetch("/inscriptions/create_import_csv", {
            method: "POST",
            headers: {
                "X-Csrf-Token": csrfToken,
            },
            body: formData,
        })
            .then(res => {
                this.setState({
                    importOngoing: false,
                });

                return res.json();
            })
            .then(data => {
                if (data.error) {
                    swal({
                        title: this.props.t(
                            "activityApplications:list.importErrorTitle"
                        ),
                        text: data.error,
                        type: "error",
                    });
                } else {
                    this.setState({
                        jobId: data.jobId,
                    });
                    this.showJobProgressModal(data.jobId);
                }
            });
    }

    handleUpdateBulkEdit(name, value) {
        this.setState({
            bulkEdit: {
                ...this.state.bulkEdit,
                [name]: value,
            },
        });
    }

    handleBulkEdit() {
        const { t } = this.props;
        // Vérification spéciale pour le statut "Annulé"
        if (
            this.state.bulkEdit.activity_application_status_id === CANCELED_ID
        ) {
            const selectedCount =
                this.state.bulkTargets === "all"
                    ? this.state.total
                    : this.state.bulkTargets.length;

            const confirmationText = t(
                "activityApplications:list.cancelWarningBody",
                { count: selectedCount }
            );

            swal({
                title: t("activityApplications:list.cancelWarningTitle"),
                text: confirmationText,
                type: "warning",
                showCancelButton: true,
                confirmButtonText: t(
                    "activityApplications:list.cancelWarningConfirm"
                ),
                cancelButtonText: t("common:actions.cancel"),
                confirmButtonColor: "#d33",
                reverseButtons: true,
            }).then(result => {
                if (result.value) {
                    this.performBulkEdit();
                }
            });
        } else {
            this.performBulkEdit();
        }
    }

    performBulkEdit() {
        fetch("/inscriptions/bulk", {
            method: "POST",
            headers: {
                "X-Csrf-Token": csrfToken,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                filter: {
                    ...this.state.filter,
                    sorted: this.state.filter.sorted[0],
                },
                targets: this.state.bulkTargets,
                application: this.state.bulkEdit,
            }),
        })
            .then(res => res.json())
            .then(data => ({
                data: data.applications,
                pages: data.pages,
                total: data.total,
            }))
            .then(res => {
                this.setState({
                    ...res,
                    bulkTargets: [],
                    loading: false,
                });
                //close modal
                //TODO close it in a cleaner way
                document.querySelector("#applications-bulk-edit-modal").click();
            });
    }

    handleBulkDelete() {
        const { t } = this.props;
        const selectedCount =
            this.state.bulkTargets === "all"
                ? this.state.total // Total pour "tout sélectionner"
                : this.state.bulkTargets.length;

        const confirmationText = t(
            "activityApplications:list.deleteConfirmBody",
            { count: selectedCount }
        );

        Swal.fire({
            title: t("activityApplications:list.deleteConfirmTitle"),
            text: confirmationText,
            type: "warning",
            showCancelButton: true,
            cancelButtonText: t("common:actions.cancel"),
            confirmButtonText: `<i class="fas fa-trash mr-2"></i>  ${t(
                "common:actions.delete"
            )}`,
            confirmButtonColor: "#ec4758",
            reverseButtons: true,
        }).then(r => {
            if (r.value) {
                fetch("/inscriptions", {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-Token": csrfToken,
                    },
                    body: JSON.stringify({
                        targets: this.state.bulkTargets,
                    }),
                })
                    .catch(res => console.error(res))
                    .then(res => {
                        const remainingItems = this.state.total - selectedCount;
                        const newTotalPages = Math.ceil(
                            remainingItems / this.state.filter.pageSize
                        );

                        const newPage = Math.min(
                            this.state.filter.page, // Page actuelle
                            newTotalPages - 1 // Dernière page disponible
                        );

                        this.setState(
                            {
                                data:
                                    this.state.bulkTargets === "all"
                                        ? []
                                        : this.state.data.filter(
                                              d =>
                                                  !this.state.bulkTargets.includes(
                                                      d.id
                                                  )
                                          ),
                                bulkTargets: [],
                                total: remainingItems,
                                pages: newTotalPages,
                                filter: {
                                    ...this.state.filter,
                                    page: newPage, // Mettre à jour la page actuelle
                                },
                            },
                            () => {
                                // Recharger les données pour la nouvelle page
                                this.fetchData(this.state.filter);
                            }
                        );
                    });
            } else {
                this.setState({ bulkTargets: [] });
            }
        });
    }

    resetFilters() {
        localStorage.setItem(
            FILTER_STORAGE_KEY,
            JSON.stringify(defaultTableProps())
        );
        this.setState({ filter: defaultTableProps() }, () => {
            this.fetchData(this.state.filter);
        });
    }

    updateBulkTarget(id, checked) {
        if (checked) {
            //add target to bulk targets list
            this.setState({
                bulkTargets: [...this.state.bulkTargets, id],
            });
        } else {
            if (this.state.bulkTargets === "all")
                this.setState({
                    bulkTargets: this.state.data
                        .map(d => d.id)
                        .filter(d => d !== id),
                });
            else
                this.setState({
                    bulkTargets: this.state.bulkTargets.filter(r => r !== id),
                });
        }
    }

    //Displays an alert which gives information about how many rows are selected
    //And also suggests the user select all data (across pages) when he checked
    //The "all" checkbox. Bulk actions are on the right of the alert
    bulkAlert() {
        const { t } = this.props;
        const count =
            (this.state.bulkTargets === "all" && this.state.total) ||
            this.state.bulkTargets.length;

        return (
            <div
                className="alert alert-info m-t-sm"
                style={{ marginBottom: "0" }}
            >
                <div className="flex flex-space-between-justified flex-center-aligned">
                    <div id="targets-infos">
                        {t("activityApplications:list.selectedInfo", { count })}{" "}
                        {this.state.bulkTargets.length ===
                            this.state.data.length &&
                        Math.max(
                            this.state.total - this.state.bulkTargets.length,
                            0
                        ) ? (
                            <button
                                onClick={() =>
                                    this.setState({ bulkTargets: "all" })
                                }
                                className="btn btn-info m-l-sm"
                            >
                                {t(
                                    "activityApplications:list.selectRemaining",
                                    {
                                        count:
                                            this.state.total -
                                            this.state.bulkTargets.length,
                                    }
                                )}
                            </button>
                        ) : null}
                    </div>
                    <div id="targets-actions">
                        {this.props.currentUserIsAdmin &&
                            this.statusFilterContainsTerminalStatus() && (
                                <button
                                    onClick={() =>
                                        this.sendGroupConfirmationMail()
                                    }
                                    className="btn btn-primary m-r-sm"
                                    data-tippy-content={t(
                                        "activityApplications:list.groupMailTooltip"
                                    )}
                                    disabled={false}
                                >
                                    <i className="fas fa-envelope" />
                                </button>
                            )}

                        <a
                            href="#"
                            data-toggle="modal"
                            data-target="#applications-bulk-edit-modal"
                            className="btn btn-primary m-r-sm"
                        >
                            <i className="fas fa-edit m-r-xs" />
                            {t("activityApplications:list.bulkEdit")}
                        </a>
                        {this.props.currentUserIsAdmin &&
                            !this.statusFilterContainsTerminalStatus() && (
                                <button
                                    className="btn btn-danger"
                                    onClick={this.handleBulkDelete.bind(this)}
                                >
                                    {t("common:actions.delete")}
                                </button>
                            )}
                    </div>
                </div>
            </div>
        );
    }

    fetchData(filter) {
        this.setState({ loading: true, filter });

        debounce(() => {
            requestData(
                filter.pageSize,
                filter.page,
                filter.sorted,
                filter.filtered,
                "json"
            )
                .then(response => response.json())
                .then(data => {
                    const res = {
                        data: data.applications,
                        pages: data.pages,
                        total: data.total,
                        pendingTotal: data.pending_total,
                    };

                    return res;
                })
                .then(res => {
                    this.setState({
                        ...res,
                        loading: false,
                        bulkTargets: [],
                    });
                });
        }, 400);
    }

    handleToggleNoAvailabilityFilter() {
        const newFilter = [...this.state.filter.filtered];
        const indexOfFilter = newFilter.findIndex(
            f => f.id === "nb_availabilities"
        );

        if (indexOfFilter === -1) {
            newFilter.push({
                id: "nb_availabilities",
                value: 0,
            });
        } else {
            newFilter.splice(indexOfFilter, 1);
        }

        this.fetchData({
            ...this.state.filter,
            filtered: newFilter,
        });
    }

    sendGroupConfirmationMail() {
        const { t } = this.props;
        swal({
            title: t("activityApplications:list.notifyStudentTitle"),
            html: t("activityApplications:list.notifyStudentBody"),
            type: "question",
            showCancelButton: true,
            cancelButtonText: t("common:actions.cancel"),
            reverseButtons: true,
            input: "checkbox",
            inputValue: 0,
            inputPlaceholder: t(
                "activityApplications:list.notifyStudentResendPlaceholder"
            ),
        }).then(v => {
            if (v.value !== undefined) {
                fetch(`/inscriptions/send_all_confirmation_mail`, {
                    method: "POST",
                    headers: {
                        "X-Csrf-Token": csrfToken,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        filter: {
                            ...this.state.filter,
                            sorted: this.state.filter.sorted[0],
                        },
                        targets: this.state.bulkTargets,
                        application: this.state.bulkEdit,
                        forceResend: v.value,
                    }),
                })
                    .then(response => response.json())
                    .then(res => {
                        if (res.success)
                            swal(
                                "",
                                t(
                                    "activityApplications:list.notifyStudentQueued"
                                ),
                                "success"
                            );
                        else swal("", res.message, "error");
                    });
            }
        });
    }

    statusFilterContainsTerminalStatus() {
        if (this.state.bulkTargets === "all") {
            const allSelectedArePending =
                this.state.pendingTotal === this.state.total;
            return !allSelectedArePending;
        }

        const selectedStatuses = this.state.bulkTargets
            .map(id => {
                const demande = this.state.data.find(d => d.id === id);
                return demande ? demande.activity_application_status_id : null;
            })
            .filter(status => status !== null);

        const containsTerminalStatus = selectedStatuses.some(s =>
            [
                ACTIVITY_ATTRIBUTED_ID,
                ACTIVITY_PROPOSED_ID,
                PROPOSAL_ACCEPTED_ID,
            ].includes(s)
        );

        return containsTerminalStatus;
    }

    render() {
        const { t } = this.props;
        const activitiesFilterOptions = _.chain(this.props.activities)
            .uniq()
            .map(a => ({
                label: a.label,
                value: a.label,
            }))
            .sortBy("label")
            .value();

        const activitiesKindsFilterOptions = _.chain(this.props.activities)
            .filter(a => a.kind != undefined)
            .map(a => ({
                label: a.kind,
                value: a.kind,
            }))
            .uniqBy("label")
            .sortBy("label")
            .value();

        const applicationStatusesFilterOptions = _(this.props.statuses)
            .orderBy(s => s.label)
            .map(s => ({
                value: s.id,
                label: s.label,
            }))
            .value();

        const applicationActionsFilterOptions = Object.keys(
            PRE_APPLICATION_ACTION_LABELS
        ).map(l => ({
            label: PRE_APPLICATION_ACTION_LABELS[l],
            value: l,
        }));

        const columns = [
            {
                Header: "",
                id: "selection",
                width: 25,
                accessor: r => this.state.bulkTargets.includes(r.id),
                Filter: () => (
                    <input
                        type="checkbox"
                        defaultChecked={this.state.bulkTargets === "all"}
                        checked={
                            this.state.bulkTargets.length ===
                            this.state.data.length
                        }
                        onChange={e => {
                            if (e.target.checked) {
                                this.setState({
                                    bulkTargets: this.state.data.map(r => r.id),
                                });
                            } else {
                                this.setState({ bulkTargets: [] });
                            }
                        }}
                    />
                ),
                Cell: d => (
                    <input
                        type="checkbox"
                        defaultChecked={
                            this.state.bulkTargets === "all" || d.value
                        }
                        onClick={e =>
                            this.updateBulkTarget(
                                d.original.id,
                                e.target.checked
                            )
                        }
                    />
                ),
            },
            {
                Header: t("activityApplications:list.columns.adherentNumber"),
                id: "adherent_number",
                width: 70,
                filterable: true,
                accessor: r => (
                    <a href={`/users/${r.user_id}`}>{r.user.adherent_number}</a>
                ),
            },
            {
                Header: t("activityApplications:list.columns.requestNumber"),
                id: "id",
                width: 70,
                filterable: true,
                accessor: r => <a /*href={`/inscriptions/${r.id}`}*/>{r.id}</a>,
            },
            {
                Header: t("activityApplications:list.columns.date"),
                accessor: d => moment(d.created_at),
                width: 100,
                id: "date",
                filterable: false,
                Cell: d => d.value.format("DD MMM YYYY"),
            },
            {
                id: "name",
                Header: t("activityApplications:list.columns.name"),
                width: 175,
                accessor: d => (
                    <UserWithInfos userId={d.user_id}>
                        {`${d.user.first_name} ${d.user.last_name}`}
                    </UserWithInfos>
                ),
            },
            {
                id: "age",
                Header: t("activityApplications:list.columns.age"),
                width: 50,
                accessor: d => (d.user.birthday && age(d.user.birthday)) || "?",
            },
            {
                id: "level",
                Header: t("activityApplications:list.columns.level"),
                width: 130,
                Filter: ({ filter, onChange }) => (
                    <select
                        onChange={e => onChange(e.target.value)}
                        value={filter ? filter.value : ""}
                    >
                        <option value="" />
                        {this.props.evaluationLevelRefs.map(r => (
                            <option key={r.id} value={r.id}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                ),
                accessor: d =>
                    (d.user &&
                        d.activity_refs[0] &&
                        levelDisplayLabel(
                            levelDisplay(
                                [d.user],
                                d.activity_refs[0].id,
                                d.season_id
                            )
                        )) ||
                    "?",
            },
            {
                id: "activity_ref_id",
                Header: t("activityApplications:list.columns.activity"),
                width: 200,
                sortable: false,
                accessor: d => {
                    return d.activity_refs.map(a => a.label).join(", ");
                },
                Filter: ({ filter, onChange }) => (
                    <Select
                        options={activitiesFilterOptions}
                        isMulti={true}
                        isClearable={true}
                        value={
                            (filter &&
                                filter.value &&
                                activitiesFilterOptions.filter(o =>
                                    filter.value.includes(o.value)
                                )) ||
                            "all"
                        }
                        onChange={v =>
                            onChange((v.length && v.map(v => v.value)) || "")
                        }
                        styles={{
                            option: base => ({
                                ...base,
                                textAlign: "left",
                            }),
                            dropdownIndicator: base => ({
                                ...base,
                                display: "none",
                            }),
                        }}
                    />
                ),
            },
            {
                id: "activity_ref_kind_id",
                Header: t("activityApplications:list.columns.activityFamily"),
                width: 200,
                sortable: false,
                accessor: d => {
                    return d.activity_refs
                        .map(a => a.kind)
                        .filter(a => a != undefined)
                        .join(", ");
                },
                Filter: ({ filter, onChange }) => (
                    <Select
                        options={activitiesKindsFilterOptions}
                        isMulti={true}
                        isClearable={true}
                        value={
                            (filter &&
                                filter.value &&
                                activitiesKindsFilterOptions.filter(o =>
                                    filter.value.includes(o.value)
                                )) ||
                            "all"
                        }
                        onChange={v =>
                            onChange((v.length && v.map(v => v.value)) || "")
                        }
                        styles={{
                            option: base => ({
                                ...base,
                                textAlign: "left",
                            }),
                            dropdownIndicator: base => ({
                                ...base,
                                display: "none",
                            }),
                        }}
                    />
                ),
            },
            {
                Header: t("activityApplications:list.columns.action"),
                id: "action",
                width: 150,
                sortable: false,
                accessor: d => {
                    if (d.pre_application_desired_activity) {
                        return PRE_APPLICATION_ACTION_LABELS[
                            d.pre_application_desired_activity.action
                        ];
                    } else if (d.pre_application_activity) {
                        return PRE_APPLICATION_ACTION_LABELS[
                            d.pre_application_activity.action
                        ];
                    }

                    return PRE_APPLICATION_ACTION_LABELS.new;
                },
                Filter: ({ filter, onChange }) => (
                    <Select
                        options={applicationActionsFilterOptions}
                        isMulti={true}
                        isClearable={true}
                        value={
                            (filter &&
                                filter.value &&
                                applicationActionsFilterOptions.filter(o =>
                                    filter.value.includes(o.value)
                                )) ||
                            "all"
                        }
                        onChange={v =>
                            onChange((v.length && v.map(v => v.value)) || "")
                        }
                        styles={{
                            option: base => ({
                                ...base,
                                textAlign: "left",
                            }),
                            dropdownIndicator: base => ({
                                ...base,
                                display: "none",
                            }),
                        }}
                    />
                ),
            },
            this.props.currentUserIsAdmin
                ? {
                      id: "season_id",
                      Header: t("activityApplications:list.columns.season"),
                      width: 150,
                      accessor: d => (d.season ? d.season.label : "n/a"),
                      sortable: false,
                      Filter: ({ filter, onChange }) => (
                          <select
                              onChange={event => onChange(event.target.value)}
                              style={{ width: "100%" }}
                              value={filter ? filter.value : "all"}
                          >
                              <option value="all">
                                  {t("activityApplications:list.allSeasons")}
                              </option>
                              {_.map(this.props.seasons, (s, i) => (
                                  <option key={i} value={s.id}>
                                      {s.label}
                                  </option>
                              ))}
                          </select>
                      ),
                  }
                : null,
            {
                id: "referent_id",
                Header: t("activityApplications:list.columns.referent"),
                width: 125,
                accessor: d => d.referent,
                Cell: c =>
                    (c.value &&
                        `${c.value.first_name} ${c.value.last_name.charAt(
                            0
                        )}.`) ||
                    "",
                Filter: ({ filter, onChange }) => (
                    <select
                        className="form-control"
                        defaultValue={(filter && filter.value) || ""}
                        onChange={e => onChange(e.target.value)}
                    >
                        <option value=""></option>
                        {_.sortBy(this.props.admins, "first_name").map(
                            optionMapper(USER_OPTIONS_SHORT)
                        )}
                    </select>
                ),
            },
            this.props.currentUserIsAdmin
                ? {
                      id: "mail_sent",
                      Header: t("activityApplications:list.columns.mailSent"),
                      width: 75,
                      accessor: d =>
                          d.mail_sent === true
                              ? t("activityApplications:list.yes")
                              : t("activityApplications:list.no"),
                      sortable: false,
                      Filter: ({ filter, onChange }) => (
                          <select
                              onChange={event => onChange(event.target.value)}
                              style={{ width: "100%" }}
                              value={filter ? filter.value : "all"}
                          >
                              <option value="all">
                                  {t("activityApplications:list.all")}
                              </option>
                              <option value="true">
                                  {t("activityApplications:list.yes")}
                              </option>
                              <option value="false">
                                  {t("activityApplications:list.no")}
                              </option>
                          </select>
                      ),
                  }
                : null,
            {
                id: "activity_application_status_id",
                Header: t("activityApplications:list.columns.status"),
                accessor: d => d.activity_application_status_id,
                sortable: false,
                filterMethod: (filter, row) => {
                    if (filter.value === "all") {
                        return true;
                    }

                    return row.activity_application_status_id == filter.value;
                },
                Cell: row => {
                    let status = _.find(
                        this.props.statuses,
                        status => status.id === row.value
                    );
                    const referent = row.original.referent;
                    return (
                        (status &&
                            `${status.label} ${
                                row.original.status_updated_at
                                    ? `(${moment(
                                          row.original.status_updated_at
                                      ).fromNow()})`
                                    : ""
                            }`) ||
                        "??"
                    );
                },
                Filter: ({ filter, onChange }) => (
                    <Select
                        options={applicationStatusesFilterOptions}
                        isMulti={true}
                        isClearable={true}
                        value={
                            (filter &&
                                filter.value &&
                                applicationStatusesFilterOptions.filter(o =>
                                    filter.value.includes(o.value)
                                )) ||
                            "all"
                        }
                        onChange={v =>
                            onChange((v.length && v.map(v => v.value)) || "")
                        }
                        styles={{
                            option: base => ({
                                ...base,
                                textAlign: "left",
                            }),
                            dropdownIndicator: base => ({
                                ...base,
                                display: "none",
                            }),
                        }}
                    />
                ),
            },
        ].filter(c => c);

        const withoutAvailabilityMode = this.state.filter.filtered.find(
            f => f.id === "nb_availabilities"
        );

        let filteredColumns = [...columns];

        if (this.state.listPreferences) {
            filteredColumns = [
                columns[0],
                // Only take enabled columns, and order them according to prefs order
                ..._(columns)
                    .filter(c =>
                        _.find(this.state.listPreferences, {
                            id: c.id,
                            disabled: false,
                        })
                    )
                    .sortBy(c =>
                        _.findIndex(this.state.listPreferences, { id: c.id })
                    )
                    .value(),
            ];
        }

        return (
            <div className="row p-sm">
                <div className="ibox">
                    <div className="ibox-content">
                        <div className="flex flex-column">
                            <div className="flex flex-space-between-justified">
                                <div className="flex">
                                    <h3 className="m-r">
                                        {t(
                                            "activityApplications:list.pendingHeading",
                                            {
                                                count:
                                                    this.state.pendingTotal ||
                                                    0,
                                            }
                                        )}
                                    </h3>
                                    <ListPreferences
                                        preferences={this.state.listPreferences}
                                        columns={columns.slice(1)}
                                        className="m-r-sm"
                                        onSubmit={prefs =>
                                            this.handleUpdateListPreferences(
                                                prefs
                                            )
                                        }
                                    />
                                    <button
                                        className="btn btn-primary m-r-sm"
                                        data-tippy-content={t(
                                            "activityApplications:list.tooltips.resetFilters"
                                        )}
                                        onClick={() => this.resetFilters()}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                    <button
                                        className="btn btn-primary m-r-sm"
                                        data-tippy-content={t(
                                            "activityApplications:list.tooltips.refreshData"
                                        )}
                                        onClick={() =>
                                            this.fetchData(this.state.filter)
                                        }
                                    >
                                        <i className="fas fa-sync"></i>
                                    </button>
                                    <input
                                        type="file"
                                        ref={this.fileInput}
                                        style={{ display: "none" }}
                                        onChange={this.handleFileSelect.bind(
                                            this
                                        )}
                                        accept=".csv"
                                    />
                                    {this.props.currentUserIsAdmin && (
                                        <Fragment>
                                            <button
                                                className="btn btn-primary m-r-sm"
                                                data-tippy-content={t(
                                                    "activityApplications:list.tooltips.importFile"
                                                )}
                                                onClick={() =>
                                                    this.fileInput.current.click()
                                                }
                                            >
                                                {this.state.importOngoing ? (
                                                    <Loader
                                                        type="Oval"
                                                        color="white"
                                                        height={15}
                                                        width={15}
                                                    />
                                                ) : (
                                                    <i className="fas fa-download" />
                                                )}
                                            </button>
                                            <button
                                                className="btn btn-primary m-r-sm"
                                                data-tippy-content={t(
                                                    "activityApplications:list.tooltips.exportCsv"
                                                )}
                                                onClick={this.downloadExport.bind(
                                                    this
                                                )}
                                            >
                                                {this.state.exportOngoing ? (
                                                    <Loader
                                                        type="Oval"
                                                        color="white"
                                                        height={15}
                                                        width={15}
                                                    />
                                                ) : (
                                                    <i className="fas fa-upload" />
                                                )}
                                            </button>
                                        </Fragment>
                                    )}
                                    <button
                                        onClick={e =>
                                            this.handleToggleNoAvailabilityFilter()
                                        }
                                        data-tippy-content={t(
                                            "activityApplications:list.tooltips.showNoAvailability"
                                        )}
                                        className={`btn m-r-sm btn-${
                                            withoutAvailabilityMode
                                                ? "primary"
                                                : "muted"
                                        }`}
                                    >
                                        <strong>
                                            <i className="fas fa-calendar-times"></i>
                                        </strong>
                                    </button>
                                </div>
                                {this.props.currentUserIsAdmin && (
                                    <div className="flex">
                                        <ButtonModal
                                            modalProps={{
                                                style: {
                                                    content: {
                                                        width: "750px",
                                                        margin: "auto",
                                                        inset: "unset",
                                                    },
                                                },
                                            }}
                                            className="btn btn-primary m-r-sm"
                                            tooltip={t(
                                                "activityApplications:list.tooltips.stats"
                                            )}
                                            label={
                                                <i className="fas fa-chart-pie" />
                                            }
                                        >
                                            <ActivitiesApplicationsDashboard
                                                {...this.props.dashboardInfos}
                                            />
                                        </ButtonModal>
                                        <StopList
                                            seasons={this.props.seasons}
                                        />
                                    </div>
                                )}
                            </div>
                            {this.state.bulkTargets.length > 0
                                ? this.bulkAlert()
                                : null}
                        </div>
                    </div>
                    <div className="ibox-content no-padding">
                        <ReactTable
                            data={this.state.data}
                            manual
                            pages={this.state.pages}
                            loading={this.state.loading}
                            columns={filteredColumns}
                            defaultSorted={[{ id: "date", desc: true }]}
                            filterable={true}
                            defaultFilterMethod={(filter, row) => {
                                if (row[filter.id] !== null) {
                                    return row[filter.id]
                                        .toString()
                                        .toLowerCase()
                                        .startsWith(filter.value.toLowerCase());
                                }
                            }}
                            page={this.state.filter.page}
                            pageSize={this.state.filter.pageSize}
                            sorted={this.state.filter.sorted}
                            filtered={this.state.filter.filtered}
                            onPageChange={page =>
                                this.fetchData({ ...this.state.filter, page })
                            }
                            onPageSizeChange={(pageSize, page) =>
                                this.fetchData({
                                    ...this.state.filter,
                                    page,
                                    pageSize,
                                })
                            }
                            onSortedChange={sorted =>
                                this.fetchData({ ...this.state.filter, sorted })
                            }
                            onFilteredChange={filtered =>
                                this.fetchData({
                                    ...this.state.filter,
                                    filtered,
                                })
                            }
                            previousText={t("common:reactTable.previousText")}
                            nextText={t("common:reactTable.nextText")}
                            loadingText={t("common:reactTable.loadingText")}
                            noDataText={t("common:reactTable.noDataText")}
                            pageText={t("common:reactTable.pageText")}
                            ofText={t("common:reactTable.ofText")}
                            rowsText={t("common:reactTable.rowsText")}
                            pageSizeOptions={[5, 10, 15, 16, 20]}
                            getTdProps={(state, rowInfo, column, instance) => {
                                if (
                                    column.id !== "selection" &&
                                    column.id !== "name"
                                )
                                    return {
                                        onClick: (e, handleOriginal) => {
                                            window.open(
                                                `/inscriptions/${rowInfo.original.id}`
                                            );

                                            if (handleOriginal) {
                                                handleOriginal();
                                            }
                                        },
                                    };

                                return {};
                            }}
                        />

                        <div className="flex flex-center-justified m-t-xs">
                            <h3>
                                {t("activityApplications:list.totalCount", {
                                    count: this.state.total,
                                })}
                            </h3>
                        </div>
                    </div>
                </div>

                <BulkEditModal
                    statuses={this.props.statuses}
                    targets={this.state.bulkTargets}
                    state={this.state.bulkEdit}
                    onChange={(name, value) =>
                        this.handleUpdateBulkEdit(name, value)
                    }
                    onSave={() => this.handleBulkEdit()}
                />
            </div>
        );
    }
}

const BulkEditModal = ({ targets, state, statuses, onChange, onSave }) => {
    const { t } = useTranslation("activityApplications");

    return (
        <div
            id="applications-bulk-edit-modal"
            tabIndex="-1"
            role="dialog"
            aria-hidden="true"
            className="modal inmodal"
        >
            <div className="modal-dialog">
                <div className="modal-content animated">
                    <div className="modal-header">
                        {t("activityApplications:list.modalTitle")}
                    </div>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>
                                {t("activityApplications:list.modalStatus")}
                            </label>
                            <select
                                value={state.activity_application_status_id}
                                onChange={e =>
                                    onChange(
                                        e.target.name,
                                        parseInt(e.target.value)
                                    )
                                }
                                name="activity_application_status_id"
                                className="form-control"
                            >
                                <option value=""></option>
                                {statuses.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="modal-footer flex flex-space-between-justified">
                        <button
                            type="button"
                            className="btn"
                            data-dismiss="modal"
                        >
                            <i className="fas fa-times m-r-sm"></i>
                            {t("common:actions.cancel")}
                        </button>
                        <button
                            onClick={() => onSave()}
                            disabled={targets.length === 0}
                            className="btn btn-primary"
                        >
                            <i className="fas fa-check m-r-xs" />
                            {t("common:actions.validate")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default withTranslation("activityApplications")(
    ActivitiesApplicationsList
);
