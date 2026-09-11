import React from "react";
import Modal from "react-modal";
import swal from "sweetalert2";
import { withTranslation } from "react-i18next";
import { csrfToken } from "../utils";

class SeasonActivationModal extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            isOpen: false,
            step: 1,
            loading: false,
            seasonId: null,
            seasonData: null,
            seasonDataLoading: false,
            holidays: [],
            holidaysLoading: false,
            holidaysError: null,
            showManualForm: false,
            manualLabel: "",
            manualStart: "",
            manualEnd: "",
            manualError: "",
            editingDates: false,
        };
    }

    openModal = seasonId => {
        this.setState({
            isOpen: true,
            step: 1,
            seasonId,
            seasonData: null,
            seasonDataLoading: false,
            holidays: [],
            holidaysLoading: false,
            holidaysError: null,
            showManualForm: false,
            manualLabel: "",
            manualStart: "",
            manualEnd: "",
            manualError: "",
            editingDates: false,
        });

        this.fetchSeasonData(seasonId);
        this.fetchExistingHolidays(seasonId);
    };

    fetchExistingHolidays = async seasonId => {
        try {
            const response = await fetch(`/seasons/${seasonId}.json`, {
                method: "GET",
                headers: {
                    "X-CSRF-Token": csrfToken,
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                return;
            }

            const data = await response.json();

            // Récupérer les vacances existantes de la saison
            if (data.holidays && data.holidays.length > 0) {
                // Les vacances arrivent comme des dates individuelles
                // Les transformer en plages par label
                const holidaysByLabel = {};

                data.holidays.forEach(h => {
                    const label = h.label || h.name || "Sans nom";
                    const date = h.date ? h.date.split("T")[0] : "";

                    if (!holidaysByLabel[label]) {
                        holidaysByLabel[label] = [];
                    }
                    holidaysByLabel[label].push(date);
                });

                // Créer les plages consolidées
                const consolidatedHolidays = Object.entries(holidaysByLabel)
                    .map(([label, dates]) => {
                        // Trier et déduplicer les dates
                        const uniqueDates = [...new Set(dates)].sort();

                        if (uniqueDates.length === 0) return null;

                        return {
                            label: label,
                            start: uniqueDates[0], // Première date
                            end: uniqueDates[uniqueDates.length - 1], // Dernière date
                        };
                    })
                    .filter(Boolean);

                this.setState({
                    holidays: consolidatedHolidays,
                });
            }
        } catch (error) {
            console.error("Error fetching existing holidays:", error);
        }
    };

    fetchSeasonData = async seasonId => {
        const { t } = this.props;
        this.setState({ seasonDataLoading: true });

        try {
            const response = await fetch(`/seasons/${seasonId}.json`, {
                method: "GET",
                headers: {
                    "X-CSRF-Token": csrfToken,
                    Accept: "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            // Fonction pour formater une date au format YYYY-MM-DD
            const formatDate = date => {
                if (!date) return "";
                // Gère les formats ISO 8601 (avec T) et autres formats
                const dateString =
                    typeof date === "string" ? date : String(date);
                // Prend la partie avant le T ou le premier caractère
                const datePart = dateString.split("T")[0];
                return datePart || "";
            };

            // Formater les dates au format YYYY-MM-DD pour les inputs
            const formattedData = {
                ...data,
                start: formatDate(data.start),
                end: formatDate(data.end),
                opening_date_for_applications: formatDate(
                    data.opening_date_for_applications
                ),
                opening_date_for_new_applications: formatDate(
                    data.opening_date_for_new_applications
                ),
                closing_date_for_applications: formatDate(
                    data.closing_date_for_applications
                ),
                reopen_at: formatDate(data.opening_date_for_applications),
                open_at: formatDate(data.opening_date_for_new_applications),
                close_at: formatDate(data.closing_date_for_applications),
            };

            this.setState({
                seasonData: formattedData,
                seasonDataLoading: false,
            });
        } catch (error) {
            console.error("Error fetching season data:", error);
            this.setState({ seasonDataLoading: false });

            swal({
                type: "error",
                title: t("planning:seasonActivation.toast.errorTitle"),
                text: t("planning:seasonActivation.errors.loadSeasonFailed"),
            });
        }
    };

    closeModal = () => {
        this.setState({ isOpen: false });
    };

    fetchHolidays = async () => {
        const { t } = this.props;
        const { seasonId } = this.state;
        this.setState({ holidaysLoading: true, holidaysError: null });

        try {
            const response = await fetch(`/season/${seasonId}/fetch_holidays`, {
                method: "POST",
                headers: {
                    "X-CSRF-Token": csrfToken,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(
                    t("planning:seasonActivation.errors.fetchHolidaysFailed")
                );
            }

            const data = await response.json();
            this.setState({
                holidays: data,
                holidaysLoading: false,
            });

            swal({
                type: "success",
                title: t("planning:seasonActivation.toast.successTitle"),
                text: t("planning:seasonActivation.toast.holidaysImported"),
            });
        } catch (error) {
            this.setState({
                holidaysError: error.message,
                holidaysLoading: false,
            });

            swal({
                type: "error",
                title: t("planning:seasonActivation.toast.errorTitle"),
                text: error.message,
            });
        }
    };

    goToStep = step => {
        const { t } = this.props;
        const { holidays } = this.state;

        // Si on essaie d'aller à l'étape 2 sans vacances configurées, demander une confirmation
        if (step === 2 && (!holidays || holidays.length === 0)) {
            swal({
                type: "warning",
                title: t("planning:seasonActivation.confirmNoHolidays.title"),
                text: t("planning:seasonActivation.confirmNoHolidays.text"),
                showCancelButton: true,
                confirmButtonText: t(
                    "planning:seasonActivation.confirmNoHolidays.confirm"
                ),
                cancelButtonText: t(
                    "planning:seasonActivation.confirmNoHolidays.cancel"
                ),
            }).then(result => {
                if (result.value) {
                    this.setState({ step });
                }
            });
        } else {
            this.setState({ step });
        }
    };

    addManualHoliday = async () => {
        const { t } = this.props;
        const { seasonId, manualLabel, manualStart, manualEnd } = this.state;

        if (!manualLabel || !manualStart || !manualEnd) {
            this.setState({
                manualError: t(
                    "planning:seasonActivation.errors.allFieldsRequired"
                ),
            });
            return;
        }

        if (new Date(manualStart) > new Date(manualEnd)) {
            this.setState({
                manualError: t(
                    "planning:seasonActivation.errors.startAfterEnd"
                ),
            });
            return;
        }

        this.setState({ holidaysLoading: true, manualError: "" });

        try {
            const response = await fetch(`/season/${seasonId}/holidays`, {
                method: "POST",
                headers: {
                    "X-CSRF-Token": csrfToken,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    label: manualLabel,
                    start: manualStart,
                    end: manualEnd,
                }),
            });

            if (!response.ok) {
                throw new Error(
                    t("planning:seasonActivation.errors.addHolidaysFailed")
                );
            }

            const data = await response.json();

            if (data) {
                this.setState(prevState => ({
                    holidays: [
                        ...prevState.holidays,
                        {
                            label: manualLabel,
                            start: manualStart,
                            end: manualEnd,
                        },
                    ],
                    holidaysLoading: false,
                    manualLabel: "",
                    manualStart: "",
                    manualEnd: "",
                    manualError: "",
                }));

                swal({
                    type: "success",
                    title: t("planning:seasonActivation.toast.successTitle"),
                    text: t("planning:seasonActivation.toast.holidaysAdded"),
                });
            }
        } catch (error) {
            this.setState({
                holidaysError: error.message,
                holidaysLoading: false,
            });

            swal({
                type: "error",
                title: t("planning:seasonActivation.toast.errorTitle"),
                text: error.message,
            });
        }
    };

    confirmActivation = async () => {
        const { t } = this.props;
        const { seasonId, seasonData } = this.state;
        this.setState({ loading: true });

        try {
            // Première étape : mettre à jour les dates de la saison si elles existent
            if (seasonData && seasonId) {
                const updatePayload = {
                    season: {
                        start: seasonData.start || null,
                        end: seasonData.end || null,
                        opening_date_for_applications:
                            seasonData.reopen_at || null,
                        opening_date_for_new_applications:
                            seasonData.open_at || null,
                        closing_date_for_applications:
                            seasonData.close_at || null,
                    },
                };

                const updateResponse = await fetch(`/seasons/${seasonId}`, {
                    method: "PUT",
                    headers: {
                        "X-CSRF-Token": csrfToken,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(updatePayload),
                });

                if (!updateResponse.ok) {
                    console.warn(
                        `Season update returned ${updateResponse.status}, but continuing with activation`
                    );
                }
            }

            // Deuxième étape : activer la saison
            const response = await fetch(`/season/${seasonId}/make_active`, {
                method: "POST",
                headers: {
                    "X-CSRF-Token": csrfToken,
                },
            });

            if (!response.ok) {
                throw new Error(
                    t("planning:seasonActivation.errors.activationFailed")
                );
            }

            let data = null;
            const contentType = response.headers.get("content-type");

            if (contentType && contentType.includes("application/json")) {
                const text = await response.text();
                if (text) {
                    data = JSON.parse(text);
                }
            }

            this.setState({ loading: false });
            this.closeModal();

            if (this.props.onSuccess) {
                this.props.onSuccess(data);
            }

            swal({
                type: "success",
                title: t("planning:seasonActivation.toast.successTitle"),
                text: t("planning:seasonActivation.toast.seasonActivated"),
            });

            if (data && data.new_next_season) {
                swal({
                    type: "success",
                    title: t("planning:seasonActivation.toast.infoTitle"),
                    text: t(
                        "planning:seasonActivation.toast.nextSeasonCreated"
                    ),
                });
            }
        } catch (error) {
            this.setState({ loading: false });

            swal({
                type: "error",
                title: t("planning:seasonActivation.toast.errorTitle"),
                text:
                    error.message ||
                    t("planning:seasonActivation.errors.generic"),
            });
        }
    };

    renderStep1 = () => {
        const { t } = this.props;
        const {
            holidaysLoading,
            showManualForm,
            manualLabel,
            manualStart,
            manualEnd,
            manualError,
            holidays,
        } = this.state;

        return (
            <div>
                <h3>{t("planning:seasonActivation.step1.title")}</h3>
                <p>{t("planning:seasonActivation.step1.intro")}</p>

                <div style={{ marginTop: "20px" }}>
                    <p style={{ fontSize: "14px", color: "#666" }}>
                        <i className="fas fa-info-circle"></i>{" "}
                        {t("planning:seasonActivation.step1.apiHint")}
                    </p>
                </div>

                <div style={{ marginTop: "20px", textAlign: "center" }}>
                    <button
                        className="btn btn-primary"
                        onClick={this.fetchHolidays}
                        disabled={holidaysLoading}
                        style={{ marginRight: "10px" }}
                    >
                        <i className="fas fa-download"></i>{" "}
                        {t("planning:seasonActivation.step1.importButton")}
                    </button>
                    <button
                        className="btn btn-default"
                        onClick={() =>
                            this.setState({ showManualForm: !showManualForm })
                        }
                    >
                        <i className="fas fa-plus-circle"></i>{" "}
                        {t("planning:seasonActivation.step1.addManuallyButton")}
                    </button>
                </div>

                {showManualForm && (
                    <div
                        style={{
                            marginTop: "20px",
                            padding: "15px",
                            backgroundColor: "#f5f5f5",
                            borderRadius: "4px",
                            border: "1px solid #ddd",
                        }}
                    >
                        <h4>
                            {t(
                                "planning:seasonActivation.step1.manualFormTitle"
                            )}
                        </h4>

                        {manualError && (
                            <div
                                style={{
                                    backgroundColor: "#f8d7da",
                                    color: "#721c24",
                                    padding: "10px",
                                    borderRadius: "4px",
                                    marginBottom: "10px",
                                }}
                            >
                                <i className="fas fa-exclamation-circle"></i>{" "}
                                {manualError}
                            </div>
                        )}

                        <div style={{ marginBottom: "10px" }}>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: "5px",
                                    fontWeight: "bold",
                                }}
                            >
                                {t("planning:seasonActivation.step1.nameLabel")}
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder={t(
                                    "planning:seasonActivation.step1.namePlaceholder"
                                )}
                                value={manualLabel}
                                onChange={e =>
                                    this.setState({
                                        manualLabel: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div style={{ marginBottom: "10px" }}>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: "5px",
                                    fontWeight: "bold",
                                }}
                            >
                                {t(
                                    "planning:seasonActivation.step1.startLabel"
                                )}
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                value={manualStart}
                                onChange={e =>
                                    this.setState({
                                        manualStart: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div style={{ marginBottom: "15px" }}>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: "5px",
                                    fontWeight: "bold",
                                }}
                            >
                                {t("planning:seasonActivation.step1.endLabel")}
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                value={manualEnd}
                                onChange={e =>
                                    this.setState({ manualEnd: e.target.value })
                                }
                            />
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={this.addManualHoliday}
                            disabled={holidaysLoading}
                        >
                            <i className="fas fa-plus"></i>{" "}
                            {t("planning:seasonActivation.step1.addButton")}
                        </button>
                    </div>
                )}

                {/* Section Récapitulatif des vacances */}
                <div style={{ marginTop: "20px" }}>
                    <h4 style={{ margin: "0 0 10px 0" }}>
                        {t("planning:seasonActivation.summary.title")}
                    </h4>

                    {holidays && holidays.length > 0 && (
                        <div
                            style={{
                                backgroundColor: "#fff",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                padding: "10px",
                            }}
                        >
                            <p
                                style={{
                                    fontSize: "12px",
                                    color: "#666",
                                    marginBottom: "10px",
                                }}
                            >
                                {t("planning:seasonActivation.summary.impact", {
                                    count: holidays.length,
                                    lessons: Math.ceil(holidays.length * 3),
                                })}
                            </p>
                            {this.consolidateHolidays(holidays).map(
                                (holiday, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "8px",
                                            borderBottom:
                                                index <
                                                this.consolidateHolidays(
                                                    holidays
                                                ).length -
                                                    1
                                                    ? "1px solid #eee"
                                                    : "none",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "10px",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    backgroundColor: "#ff9999",
                                                    width: "12px",
                                                    height: "12px",
                                                    borderRadius: "2px",
                                                }}
                                            ></div>
                                            <strong
                                                style={{ fontSize: "12px" }}
                                            >
                                                {holiday.label}
                                            </strong>
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "10px",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "12px",
                                                    color: "#666",
                                                }}
                                            >
                                                {holiday.start} → {holiday.end}
                                            </span>
                                            <button
                                                className="btn btn-xs btn-danger"
                                                onClick={() =>
                                                    this.deleteHoliday(
                                                        holiday.label,
                                                        holiday.start,
                                                        holiday.end
                                                    )
                                                }
                                                disabled={holidaysLoading}
                                                style={{ padding: "2px 6px" }}
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                    {(!holidays || holidays.length === 0) && (
                        <div
                            style={{
                                backgroundColor: "#f0f4f8",
                                border: "1px solid #bcc4d1",
                                borderRadius: "4px",
                                padding: "12px",
                                textAlign: "center",
                                color: "#666",
                                fontSize: "12px",
                            }}
                        >
                            <i className="fas fa-calendar-times"></i>{" "}
                            {t("planning:seasonActivation.summary.empty")}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    consolidateHolidays = holidays => {
        if (!holidays || holidays.length === 0) return [];

        // Trier les vacances par date de début
        const sorted = [...holidays].sort(
            (a, b) => new Date(a.start) - new Date(b.start)
        );

        const consolidated = [];
        let current = { ...sorted[0] };

        for (let i = 1; i < sorted.length; i++) {
            const holiday = sorted[i];

            // Vérifier si c'est le même label et si les dates sont consécutives
            const currentEnd = new Date(current.end);
            const nextStart = new Date(holiday.start);

            // Ajouter 1 jour à currentEnd pour vérifier la consécutivité
            const nextDay = new Date(currentEnd);
            nextDay.setDate(nextDay.getDate() + 1);

            if (
                current.label === holiday.label &&
                nextDay.toDateString() === nextStart.toDateString()
            ) {
                // Étendre la plage actuelle
                current.end = holiday.end;
            } else {
                // Ajouter la plage actuelle et commencer une nouvelle
                consolidated.push(current);
                current = { ...holiday };
            }
        }

        // Ajouter la dernière plage
        consolidated.push(current);

        return consolidated;
    };

    deleteHoliday = async (label, start, end) => {
        const { t } = this.props;
        const { seasonId } = this.state;

        this.setState({ holidaysLoading: true });

        try {
            const response = await fetch(`/season/${seasonId}/holidays`, {
                method: "DELETE",
                headers: {
                    "X-CSRF-Token": csrfToken,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    label: label,
                    start: start,
                    end: end,
                }),
            });

            if (!response.ok) {
                throw new Error(
                    t("planning:seasonActivation.errors.deleteHolidaysFailed")
                );
            }

            this.setState(prevState => ({
                holidays: prevState.holidays.filter(
                    h =>
                        !(
                            h.label === label &&
                            h.start === start &&
                            h.end === end
                        )
                ),
                holidaysLoading: false,
            }));

            swal({
                type: "success",
                title: t("planning:seasonActivation.toast.successTitle"),
                text: t("planning:seasonActivation.toast.holidaysDeleted"),
            });
        } catch (error) {
            this.setState({ holidaysLoading: false });

            swal({
                type: "error",
                title: t("planning:seasonActivation.toast.errorTitle"),
                text: error.message,
            });
        }
    };

    calculateNumberOfLessons = () => {
        const { seasonData, holidays } = this.state;

        if (!seasonData || !seasonData.start || !seasonData.end) {
            return 0;
        }

        const start = new Date(seasonData.start);
        const end = new Date(seasonData.end);

        let weekCount = 0;
        let currentDate = new Date(start);

        const holidayRanges = holidays.map(h => ({
            start: new Date(h.start),
            end: new Date(h.end),
        }));

        while (currentDate <= end) {
            const dayOfWeek = currentDate.getDay();

            // Compte les lundi à vendredi (1-5)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                // Vérifie si le jour est en vacances
                const isHoliday = holidayRanges.some(
                    range =>
                        currentDate >= range.start && currentDate <= range.end
                );

                if (!isHoliday) {
                    weekCount++;
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return Math.ceil(weekCount / 5); // Approximation du nombre de semaines de cours
    };

    renderStep2 = () => {
        const { t } = this.props;
        const {
            seasonData,
            holidays,
            editingDates,
            holidaysLoading,
            seasonDataLoading,
        } = this.state;

        if (seasonDataLoading || !seasonData) {
            return (
                <div style={{ textAlign: "center", padding: "20px" }}>
                    <i className="fas fa-spinner fa-spin"></i>{" "}
                    {t("planning:seasonActivation.loadingData")}
                </div>
            );
        }

        return (
            <div>
                <h3>{t("planning:seasonActivation.step2.title")}</h3>

                <h4 style={{ marginBottom: "10px" }}>
                    {t("planning:seasonActivation.step2.calendar", {
                        label: seasonData.label || "",
                    })}
                </h4>

                {/* Dates en grille 2 colonnes */}
                <div
                    style={{
                        backgroundColor: "#f9f9f9",
                        border: "1px solid #ddd",
                        padding: "15px",
                        borderRadius: "4px",
                        marginBottom: "20px",
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "15px",
                            marginBottom: "15px",
                        }}
                    >
                        <div>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: "5px",
                                    fontWeight: "bold",
                                    fontSize: "12px",
                                }}
                            >
                                {t(
                                    "planning:seasonActivation.step2.startLabel"
                                )}
                            </label>
                            <div style={{ position: "relative" }}>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={seasonData.start || ""}
                                    disabled={!editingDates}
                                    onChange={e => {
                                        const value = e.target.value;
                                        this.setState(prev => ({
                                            seasonData: {
                                                ...prev.seasonData,
                                                start: value,
                                            },
                                        }));
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: "5px",
                                    fontWeight: "bold",
                                    fontSize: "12px",
                                }}
                            >
                                {t("planning:seasonActivation.step2.endLabel")}
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                value={seasonData.end || ""}
                                disabled={!editingDates}
                                onChange={e => {
                                    const value = e.target.value;
                                    this.setState(prev => ({
                                        seasonData: {
                                            ...prev.seasonData,
                                            end: value,
                                        },
                                    }));
                                }}
                            />
                        </div>

                        <div>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: "5px",
                                    fontWeight: "bold",
                                    fontSize: "12px",
                                }}
                            >
                                {t(
                                    "planning:seasonActivation.step2.reopenLabel"
                                )}
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                value={seasonData.reopen_at || ""}
                                disabled={!editingDates}
                                onChange={e => {
                                    const value = e.target.value;
                                    this.setState(prev => ({
                                        seasonData: {
                                            ...prev.seasonData,
                                            reopen_at: value,
                                        },
                                    }));
                                }}
                            />
                        </div>

                        <div>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: "5px",
                                    fontWeight: "bold",
                                    fontSize: "12px",
                                }}
                            >
                                {t(
                                    "planning:seasonActivation.step2.openNewLabel"
                                )}
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                value={seasonData.open_at || ""}
                                disabled={!editingDates}
                                onChange={e => {
                                    const value = e.target.value;
                                    this.setState(prev => ({
                                        seasonData: {
                                            ...prev.seasonData,
                                            open_at: value,
                                        },
                                    }));
                                }}
                            />
                        </div>

                        <div>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: "5px",
                                    fontWeight: "bold",
                                    fontSize: "12px",
                                }}
                            >
                                {t(
                                    "planning:seasonActivation.step2.closeLabel"
                                )}
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                value={seasonData.close_at || ""}
                                disabled={!editingDates}
                                onChange={e => {
                                    const value = e.target.value;
                                    this.setState(prev => ({
                                        seasonData: {
                                            ...prev.seasonData,
                                            close_at: value,
                                        },
                                    }));
                                }}
                            />
                        </div>

                        <div>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: "5px",
                                    fontWeight: "bold",
                                    fontSize: "12px",
                                }}
                            >
                                {t(
                                    "planning:seasonActivation.step2.lessonCountLabel"
                                )}
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                value={this.calculateNumberOfLessons()}
                                disabled={true}
                                style={{ backgroundColor: "#e9ecef" }}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            className={
                                editingDates
                                    ? "btn btn-warning"
                                    : "btn btn-default"
                            }
                            onClick={() =>
                                this.setState({ editingDates: !editingDates })
                            }
                        >
                            <i
                                className={
                                    editingDates ? "fas fa-lock" : "fas fa-edit"
                                }
                            ></i>{" "}
                            {editingDates
                                ? t(
                                      "planning:seasonActivation.step2.lockButton"
                                  )
                                : t(
                                      "planning:seasonActivation.step2.editButton"
                                  )}
                        </button>
                    </div>
                </div>

                {/* Section Vacances & jours fériés */}
                <div style={{ marginTop: "20px" }}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "10px",
                        }}
                    >
                        <h4 style={{ margin: "0" }}>
                            {t("planning:seasonActivation.step2.holidaysTitle")}
                        </h4>
                        <div>
                            <button
                                className="btn btn-default btn-sm"
                                onClick={this.fetchHolidays}
                                disabled={holidaysLoading}
                                style={{ marginRight: "10px" }}
                            >
                                <i className="fas fa-download"></i>{" "}
                                {t(
                                    "planning:seasonActivation.step2.importButton"
                                )}
                            </button>
                            <button
                                className="btn btn-default btn-sm"
                                onClick={() =>
                                    this.setState({
                                        showManualForm: !this.state
                                            .showManualForm,
                                    })
                                }
                            >
                                <i className="fas fa-plus"></i>{" "}
                                {t("planning:seasonActivation.step2.addButton")}
                            </button>
                        </div>
                    </div>

                    {this.state.showManualForm && (
                        <div
                            style={{
                                backgroundColor: "#f5f5f5",
                                border: "1px solid #ddd",
                                padding: "10px",
                                borderRadius: "4px",
                                marginBottom: "10px",
                            }}
                        >
                            {this.state.manualError && (
                                <div
                                    style={{
                                        backgroundColor: "#f8d7da",
                                        color: "#721c24",
                                        padding: "8px",
                                        borderRadius: "4px",
                                        marginBottom: "10px",
                                        fontSize: "12px",
                                    }}
                                >
                                    <i className="fas fa-exclamation-circle"></i>{" "}
                                    {this.state.manualError}
                                </div>
                            )}
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr 1fr auto",
                                    gap: "8px",
                                }}
                            >
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder={t(
                                        "planning:seasonActivation.step2.namePlaceholder"
                                    )}
                                    value={this.state.manualLabel}
                                    onChange={e =>
                                        this.setState({
                                            manualLabel: e.target.value,
                                        })
                                    }
                                    style={{ fontSize: "12px" }}
                                />
                                <input
                                    type="date"
                                    className="form-control"
                                    value={this.state.manualStart}
                                    onChange={e =>
                                        this.setState({
                                            manualStart: e.target.value,
                                        })
                                    }
                                    style={{ fontSize: "12px" }}
                                />
                                <input
                                    type="date"
                                    className="form-control"
                                    value={this.state.manualEnd}
                                    onChange={e =>
                                        this.setState({
                                            manualEnd: e.target.value,
                                        })
                                    }
                                    style={{ fontSize: "12px" }}
                                />
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={this.addManualHoliday}
                                    disabled={holidaysLoading}
                                >
                                    <i className="fas fa-check"></i>
                                </button>
                            </div>
                        </div>
                    )}

                    {holidays && holidays.length > 0 && (
                        <div
                            style={{
                                backgroundColor: "#fff",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                padding: "10px",
                            }}
                        >
                            <p
                                style={{
                                    fontSize: "12px",
                                    color: "#666",
                                    marginBottom: "10px",
                                }}
                            >
                                {t("planning:seasonActivation.summary.impact", {
                                    count: holidays.length,
                                    lessons: Math.ceil(holidays.length * 3),
                                })}
                            </p>
                            {this.consolidateHolidays(holidays).map(
                                (holiday, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "8px",
                                            borderBottom:
                                                index <
                                                this.consolidateHolidays(
                                                    holidays
                                                ).length -
                                                    1
                                                    ? "1px solid #eee"
                                                    : "none",
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "10px",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    backgroundColor: "#ff9999",
                                                    width: "12px",
                                                    height: "12px",
                                                    borderRadius: "2px",
                                                }}
                                            ></div>
                                            <strong
                                                style={{ fontSize: "12px" }}
                                            >
                                                {holiday.label}
                                            </strong>
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "10px",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "12px",
                                                    color: "#666",
                                                }}
                                            >
                                                {holiday.start} → {holiday.end}
                                            </span>
                                            <button
                                                className="btn btn-xs btn-danger"
                                                onClick={() =>
                                                    this.deleteHoliday(
                                                        holiday.label,
                                                        holiday.start,
                                                        holiday.end
                                                    )
                                                }
                                                disabled={holidaysLoading}
                                                style={{ padding: "2px 6px" }}
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    render() {
        const { t } = this.props;
        const { isOpen, step, loading } = this.state;

        const modalStyles = {
            content: {
                maxHeight: "75vh",
                width: "750px",
                margin: "auto",
                padding: 0,
                border: "1px solid #ccc",
                borderRadius: "4px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
            },
            overlay: {
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            },
        };

        return (
            <Modal
                isOpen={isOpen}
                onRequestClose={this.closeModal}
                style={modalStyles}
                ariaHideApp={false}
            >
                <div
                    className="ibox"
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                    }}
                >
                    <div className="ibox-title">
                        <h5>{t("planning:seasonActivation.title")}</h5>
                        <div className="ibox-tools">
                            <button
                                className="btn btn-xs"
                                onClick={this.closeModal}
                                style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                }}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <div
                        className="ibox-content"
                        style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "10px 15px",
                        }}
                    >
                        <div style={{ marginBottom: "20px" }}>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-around",
                                    marginBottom: "20px",
                                }}
                            >
                                {[1, 2].map(stepNum => (
                                    <div
                                        key={stepNum}
                                        style={{
                                            flex: 1,
                                            textAlign: "center",
                                            paddingBottom: "10px",
                                            borderBottom:
                                                step === stepNum
                                                    ? "3px solid #3498db"
                                                    : "1px solid #ddd",
                                            color:
                                                step === stepNum
                                                    ? "#3498db"
                                                    : "#999",
                                            fontWeight:
                                                step === stepNum
                                                    ? "bold"
                                                    : "normal",
                                            marginRight: "5px",
                                            fontSize: "12px",
                                        }}
                                    >
                                        {t(
                                            "planning:seasonActivation.stepLabel",
                                            { n: stepNum }
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            {step === 1 && this.renderStep1()}
                            {step === 2 && this.renderStep2()}
                        </div>
                    </div>

                    <div className="ibox-footer flex flex-space-between-justified m-t">
                        <button
                            className="btn btn-default"
                            onClick={this.closeModal}
                            disabled={loading}
                        >
                            <i className="fas fa-times m-r-sm"></i>
                            {t("common:actions.cancel")}
                        </button>

                        <div>
                            {step > 1 && (
                                <button
                                    className="btn btn-default"
                                    onClick={() => this.goToStep(step - 1)}
                                    disabled={loading}
                                    style={{ marginRight: "10px" }}
                                >
                                    <i className="fas fa-arrow-left m-r-sm"></i>
                                    {t(
                                        "planning:seasonActivation.footer.previous"
                                    )}
                                </button>
                            )}

                            {step < 2 && (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => this.goToStep(step + 1)}
                                    disabled={loading}
                                >
                                    <i className="fas fa-arrow-right m-r-sm"></i>
                                    {t("planning:seasonActivation.footer.next")}
                                </button>
                            )}

                            {step === 2 && (
                                <button
                                    className="btn btn-success"
                                    onClick={this.confirmActivation}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin"></i>{" "}
                                            {t(
                                                "planning:seasonActivation.footer.activating"
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-play-circle"></i>{" "}
                                            {t(
                                                "planning:seasonActivation.footer.activate"
                                            )}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>
        );
    }
}

// withRef so SeasonsList's modalRef.current.openModal(...) still reaches the inner component.
export default withTranslation("planning", { withRef: true })(
    SeasonActivationModal
);
