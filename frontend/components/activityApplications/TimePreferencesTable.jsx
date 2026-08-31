import React, { useMemo } from 'react';
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import {toDate, toHourMin} from "../../tools/format";
import {WEEKDAYS} from "../../tools/constants";
import _ from 'lodash';

function createTimeRow(item, i) {
    const start = toDate(item.start);
    const end = toDate(item.end);

    return (
        <tr key={i} style={{color: "#00283B"}}>
            <td>
                <span className="font-weight-bold">
                    {WEEKDAYS[start.getDay()]}
                </span><br/>
                {toHourMin(start)}{" "}{"\u2192"}{toHourMin(end)}
            </td>
            <td style={{textAlign: "right"}}>
                <span className="badge badge-pill badge-primary p-3" style={{borderRadius: 40, backgroundColor: "#0079BF"}}>
                    {i18n.t("activityApplications:choices.choiceN", { n: i + 1 })}
                </span>
            </td>
        </tr>
    );
}

function createIntervalRow(intervals) {
    return _.chain(intervals)
        .orderBy(i => i.start)
        .map((int, i) => (
            <tr key={i} style={{color: "#00283B"}}>
                <td>
                    <span className="font-weight-bold">
                        {WEEKDAYS[toDate(int.start).getDay()]}
                    </span><br/>
                    {toHourMin(toDate(int.start))}{" "}{"\u2192"}{toHourMin(toDate(int.end))}
                </td>
            </tr>
        ))
        .value() ;
}

export default function TimePreferencesTable({ preferences = [], intervals = [], activityRef = {} }) {
    const { t, i18n } = useTranslation("activityApplications");
    // createTimeRow reads the i18n singleton directly (it's module-level, no hook), so re-run the
    // memo on a language change too — otherwise the "Choix n°" badges freeze at mount-time locale.
    const timeRow = useMemo(() => preferences.length > 0 ? preferences.map(createTimeRow) : null, [preferences, i18n.language]);
    const intervalRow = useMemo(() => createIntervalRow(intervals), [intervals]);

    return (
        <table className="table m-0">
            {preferences.length > 0 && (
                <thead>
                <tr style={{backgroundColor: "#F7FBFC", color: "#8AA4B1"}}>
                    <th scope="col">{t("timePreferencesTable.myChoicesFor", { label: activityRef.label })}</th>
                </tr>
                </thead>
            )}
            <tbody>
            {intervalRow}
            {timeRow}
            </tbody>
        </table>
    );
};