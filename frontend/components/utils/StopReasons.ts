import i18n from "../../i18n";

export const NOT_SUITABLE_ID = "1"
export const UNSUITABLE_LEVEL_ID = "2"
export const POOR_COHESION_ID = "3"
export const WRONG_INSTRUMENT_ID = "4"
export const POOR_REPERTOIRE_ID = "5"
export const SCHEDULE_CHANGE_ID = "6"
export const MOVING_ID = "7"
export const LEVEL_NOT_SUITABLE_ID = "8"
export const OTHER_ID = "11"

// STOP_REASONS: `id` is data (persisted/compared against `d.comment` in StopList.jsx and the
// stopReasonValue state in CurrentActivityItem.jsx) and stays as-is; only `label` is display text,
// localized via `activityApplications:stopReasons.*` and kept live across a locale switch with the
// same `export let` + `languageChanged` pattern as tools/constants.ts's WEEKDAYS/KINDS_LABEL/etc.
const _loadStopReasons = () => [
    {
        id: NOT_SUITABLE_ID,
        label: i18n.t("activityApplications:stopReasons.notSuitable"),
    },
    {
        id: UNSUITABLE_LEVEL_ID,
        label: i18n.t("activityApplications:stopReasons.unsuitableLevel"),
    },
    {
        id: POOR_COHESION_ID,
        label: i18n.t("activityApplications:stopReasons.poorCohesion"),
    },
    {
        id: WRONG_INSTRUMENT_ID,
        label: i18n.t("activityApplications:stopReasons.wrongInstrument"),
    },
    {
        id: POOR_REPERTOIRE_ID,
        label: i18n.t("activityApplications:stopReasons.poorRepertoire"),
    },
    {
        id: SCHEDULE_CHANGE_ID,
        label: i18n.t("activityApplications:stopReasons.scheduleChange"),
    },
    {
        id: MOVING_ID,
        label: i18n.t("activityApplications:stopReasons.moving"),
    },
    {
        id: LEVEL_NOT_SUITABLE_ID,
        label: i18n.t("activityApplications:stopReasons.levelNotSuitable"),
    },
    {
        id: OTHER_ID,
        label: i18n.t("activityApplications:stopReasons.other"),
    },
];

export let STOP_REASONS = _loadStopReasons();

i18n.on("languageChanged", () => {
    STOP_REASONS = _loadStopReasons();
});