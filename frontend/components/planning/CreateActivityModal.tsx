import React, { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Moment } from "moment";

import { getSeasonFromDate } from "./TimeIntervalHelpers";
import { RECURRENCE_TYPES } from "../../tools/constants";
import { toFullDateFr } from "../../tools/format";
import Checkbox from "../common/Checkbox";
import type { Season } from "../utils/entities";

// The real shape of a slot being created (Planning.jsx's `state.newInterval`, built from a
// Calendar.tsx select callback): `start`/`end` are real `Moment` instances (confirmed by
// PlanningModals2b.test.jsx's fixture), everything else is spread through as-is by handleSave
// below, so an index signature covers whatever Planning.jsx's caller puts on it beyond that.
export interface NewInterval {
    start: Moment;
    end: Moment;
    activity?: unknown;
    kind?: string;
    [key: string]: unknown;
}

interface CreateActivityModalProps {
    newInterval: NewInterval;
    seasons: Season[];
    closeModal: () => void;
    // Called unconditionally with no guard from 2 call sites below -- every real caller
    // (Planning.jsx) must supply this for the component to be usable at all.
    handleCloseAndOpenDetails: (interval: NewInterval) => void;
    kind?: string;
    currentUserIsAdmin?: boolean;
    recurrenceActivated?: boolean;
}

// Dropped from the old propTypes: `onSave` (declared `.isRequired`, never read anywhere in this
// file -- confirmed by grep; Planning.jsx's real `onSave` pass-through is simply ignored, same as
// before). Tightened `handleCloseAndOpenDetails` to required -- see the comment above.

function CreateIntervalModal({
    newInterval,
    seasons,
    closeModal,
    handleCloseAndOpenDetails,
    kind: kindProp,
    currentUserIsAdmin,
    recurrenceActivated,
}: CreateActivityModalProps) {
    const { t } = useTranslation("planning");

    // All computed once, from the initial props only -- the class constructor never recomputed
    // any of this in a componentDidUpdate.
    const [season, setSeason] = useState(() => {
        const detectedSeason = getSeasonFromDate(
            newInterval.start.toDate(),
            seasons
        );
        const currentSeason = getSeasonFromDate(new Date(), seasons);
        return detectedSeason?.id || currentSeason?.id || "";
    });
    // Par défaut, c'est une disponibilité ("o")
    const [kind, setKind] = useState(kindProp || "o");
    const [
        isAdminSelectIntervalRecurrence,
        setIsAdminSelectIntervalRecurrence,
    ] = useState(false);
    const [isRecurrent, setIsRecurrent] = useState(false);
    const [recurrentType, setRecurrentType] = useState(
        RECURRENCE_TYPES.getDefault()
    );

    function handleOptionChange(e: React.ChangeEvent<HTMLInputElement>) {
        setKind(e.target.value);
    }

    function handleSave() {
        let finalKind = kind;
        if (finalKind === "c" && !newInterval.activity) {
            finalKind = "o";
        }

        const interval = {
            ...newInterval,
            kind: finalKind,
            recurrentType: isRecurrent ? recurrentType : null,
        };

        handleCloseAndOpenDetails(interval);
    }

    let component;

    if (currentUserIsAdmin && recurrenceActivated) {
        if (isAdminSelectIntervalRecurrence) {
            component = (
                <div className="mb-3">
                    <h3>
                        {kind === "p"
                            ? t("createActivityModal.creatingPause")
                            : t("createActivityModal.creatingAvailability")}
                    </h3>
                    <hr />

                    <div className="row">
                        <div className="col-sm-12">
                            {t("createActivityModal.slotWillBeAddedFor")} <br />
                            <strong>
                                {toFullDateFr(newInterval.start.toISOString())}
                            </strong>{" "}
                            {t("createActivityModal.timeFrom")} &nbsp;
                            <strong>
                                {newInterval.start
                                    .toDate()
                                    .toLocaleTimeString()}
                            </strong>{" "}
                            {t("createActivityModal.timeTo")} &nbsp;
                            <strong>
                                {newInterval.end.toDate().toLocaleTimeString()}
                            </strong>
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-sm-12 py-3">
                            <Checkbox
                                id="isRecurrent"
                                label={t("createActivityModal.slotIsRecurrent")}
                                input={{
                                    checked: isRecurrent,
                                    onChange: (
                                        e: React.ChangeEvent<HTMLInputElement>
                                    ) => setIsRecurrent(e.target.checked),
                                }}
                            />
                        </div>

                        {isRecurrent && (
                            <div className="col-sm-12">
                                <select
                                    className="form-control"
                                    value={recurrentType}
                                    onChange={(e) =>
                                        setRecurrentType(e.target.value)
                                    }
                                >
                                    {RECURRENCE_TYPES.getAll()
                                        .filter((type) => {
                                            if (kind === "p") {
                                                return (
                                                    type !== "daily" &&
                                                    type !== "yearly"
                                                );
                                            }
                                            return true;
                                        })
                                        .map((type, i) => (
                                            <option key={i} value={type}>
                                                {RECURRENCE_TYPES.toString(
                                                    type
                                                )}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            );
        } else {
            component = (
                <div className="mb-3">
                    <h3>{toFullDateFr(newInterval.start.toISOString())}</h3>
                    <hr />

                    <div
                        className="row btn w-100 p-4 border-hover"
                        onClick={() => handleCloseAndOpenDetails(newInterval)}
                    >
                        <div className="col-sm-1">
                            <i className="fas fa-calendar-day"></i>
                        </div>
                        <div className="col-md-11 text-left">
                            {t("createActivityModal.addCourse")}
                        </div>
                    </div>

                    <div
                        className="row btn w-100 p-4 border-hover"
                        onClick={() => {
                            setIsAdminSelectIntervalRecurrence(true);
                            setKind("o");
                        }}
                    >
                        <div className="col-sm-1">
                            <i className="far fa-calendar-check"></i>
                        </div>
                        <div className="col-md-11 text-left">
                            {t("createActivityModal.addAvailability")}
                        </div>
                    </div>

                    <div
                        className="row btn w-100 p-4 border-hover"
                        onClick={() => {
                            setIsAdminSelectIntervalRecurrence(true);
                            setKind("p");
                        }}
                    >
                        <div className="col-sm-1">
                            <i className="fas fa-coffee"></i>
                        </div>
                        <div className="col-md-11 text-left">
                            {t("createActivityModal.addPause")}
                        </div>
                    </div>
                </div>
            );
        }
    } else {
        component = (
            <Fragment>
                <h3>{t("createActivityModal.title")}</h3>
                <hr />
                <form className="m-b">
                    <label className="label-control">
                        {t("createActivityModal.createAvailabilityLabel")}
                    </label>
                    <select
                        className="form-control"
                        value={season}
                        onChange={(e) => setSeason(e.target.value)}
                    >
                        <option key={-1} value="">
                            {t("createActivityModal.onSelectedSlotOption")}
                        </option>
                        {seasons.map((s, i) => (
                            <option key={i} value={s.id}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                    <p style={{ margin: "10px" }}>
                        <i className="fas fa-info-circle m-r-sm"></i>
                        {season === ""
                            ? t("createActivityModal.infoSelectedSlot")
                            : t("createActivityModal.infoFirstWeek")}
                    </p>

                    <label className="label-control">
                        {t("createActivityModal.typeLabel")}
                    </label>

                    <span className="radio radio-primary">
                        <input
                            type="radio"
                            name="dispo"
                            id="c"
                            value="c"
                            checked={kind === "c"}
                            onChange={handleOptionChange}
                        />
                        <label htmlFor="c">
                            <span>{t("kinds.course")}</span>
                        </label>
                    </span>

                    <span className="radio radio-primary">
                        <input
                            id="o"
                            name="dispo"
                            type="radio"
                            value="o"
                            checked={kind === "o"}
                            onChange={handleOptionChange}
                        />
                        <label htmlFor="o">
                            <span>{t("kinds.option")}</span>
                        </label>
                    </span>

                    <span className="radio radio-primary">
                        <input
                            type="radio"
                            name="dispo"
                            id="e"
                            value="e"
                            checked={kind === "e"}
                            onChange={handleOptionChange}
                        />
                        <label htmlFor="e">
                            <span>{t("kinds.evaluation")}</span>
                        </label>
                    </span>

                    <span className="radio radio-primary">
                        <input
                            type="radio"
                            name="dispo"
                            id="p"
                            value="p"
                            checked={kind === "p"}
                            onChange={handleOptionChange}
                        />
                        <label htmlFor="p">
                            <span>{t("kinds.pause")}</span>
                        </label>
                    </span>
                </form>
            </Fragment>
        );
    }

    return (
        <div>
            {component}
            <div className="flex flex-space-between-justified">
                <button type="button" onClick={closeModal} className="btn">
                    <i className="fas fa-times m-r-sm"></i>
                    {t("common:actions.cancel")}
                </button>
                <button
                    className="btn btn-primary"
                    onClick={() => handleSave()}
                >
                    {t("common:actions.save")}
                </button>
            </div>
        </div>
    );
}

export default CreateIntervalModal;
