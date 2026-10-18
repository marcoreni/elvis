import React, { Fragment, useEffect, useRef, useState } from "react";
import AvailabilityManager from "../../availability/AvailabilityManager";
import * as api from "../../../tools/api";
import swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import type { Season, TimeInterval } from "../../utils/entities";

interface SchoolAvailabilitiesProps {
    planningId?: number;
    authToken?: string;
    // `seasons.find(...)` below is called unguarded -- real callers always pass this (the lone
    // propTypes `PropTypes.array`, with no `.isRequired`, undersold it).
    seasons: Season[];
}

export default function SchoolAvailabilities({
    planningId,
    authToken,
    seasons,
}: SchoolAvailabilitiesProps) {
    const { t } = useTranslation("parameters");
    const [intervals, setIntervals] = useState<TimeInterval[]>([]);
    const [season, setSeason] = useState<Partial<Season>>(
        seasons.find((s) => s.is_current) || seasons[0] || {}
    );
    // AvailabilityManager (frontend/components/availability/AvailabilityManager.jsx) is an
    // untyped class component wrapped in `withTranslation(..., { withRef: true })`; manually
    // re-invoking its `componentDidMount()` below is a forced-refresh pattern that predates this
    // conversion, out of scope to retype here. Logged in docs/KnownIssues.md.
    const availabilityRef = useRef<any>(null);

    const convertToFirstWeekOfSeason = (seasonStart?: string) => {
        if (!seasonStart) return null;

        const startDate = new Date(seasonStart);
        const monday = new Date(startDate);
        const currentDay = monday.getDay();

        if (currentDay === 0) {
            monday.setDate(monday.getDate() + 1);
        } else if (currentDay > 1) {
            monday.setDate(monday.getDate() + (8 - currentDay));
        }

        const month = (monday.getMonth() + 1).toString().padStart(2, "0");
        const day = monday.getDate().toString().padStart(2, "0");
        return `${monday.getFullYear()}-${month}-${day}`;
    };

    const onAdd = (newIntervals: TimeInterval[]) => {
        setIntervals(intervals.concat(newIntervals));
    };

    const onDelete = (intervals: TimeInterval[]) => {
        setIntervals(intervals);
    };

    useEffect(() => {
        const firstMonday = convertToFirstWeekOfSeason(season.start);

        api.set()
            .success((data: { intervals: TimeInterval[] }) => {
                setIntervals(data.intervals);
                availabilityRef.current.componentDidMount();
            })
            .error(() => {
                swal.fire({
                    title: t("plannings.schoolAvailabilities.fetchError"),
                    icon: "error",
                });
            })
            .get(`/planning/${planningId}/intervals/week/${firstMonday}`);
    }, [season]);

    return (
        <Fragment>
            <h4>{t("plannings.schoolAvailabilities.heading")}</h4>
            <p className="mb-5">{t("plannings.schoolAvailabilities.hint")}</p>

            <div style={{ margin: "-30px" }}>
                <AvailabilityManager
                    ref={availabilityRef}
                    locked={false}
                    isTeacher={false}
                    authToken={authToken}
                    planningId={planningId}
                    kinds={["p"]}
                    day={season.start}
                    seasonId={season.id}
                    forSeason
                    onAdd={onAdd}
                    onDelete={onDelete}
                    intervals={intervals}
                />
            </div>
        </Fragment>
    );
}
