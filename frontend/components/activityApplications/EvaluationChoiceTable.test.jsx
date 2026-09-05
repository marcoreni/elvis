// i18n extraction test — i18n-06 "activities" domain, lot 3a (`activityApplications` namespace).
//
// EvaluationChoiceTable is a function component using `useTranslation("activityApplications")`.
// The single <th> carries evaluationChoiceTable.selectedSlotsForKind ({kind} interpolation,
// derived from the last matched activityRef). A `data` row with a `timeInterval` renders a
// "Choix n°N" badge (choices.choiceN, {n} interpolation); a row with `timeInterval: null`
// renders the evaluationChoice.noIntervalMessage fallback via the same `??` as EvaluationChoice.

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../../i18n";
import EvaluationChoiceTable from "./EvaluationChoiceTable";

// The component now wraps `timeInterval.start`/`.end` in `toDate()` before `toHourMin`, so it
// accepts both Date objects (this fixture) and ISO strings (the `withStringSlot` regression).
const withSlot = {
    data: [
        {
            refId: 1,
            timeInterval: {
                start: new Date("2025-09-01T10:00:00"),
                end: new Date("2025-09-01T11:00:00"),
            },
        },
    ],
    activityRefs: [{id: 1, kind: "Piano"}],
};

const noSlot = {
    data: [{refId: 1, timeInterval: null}],
    activityRefs: [{id: 1, kind: "Piano"}],
};

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("EvaluationChoiceTable", () => {
    test("renders the French header + choice badge by default", async () => {
        await i18n.changeLanguage("fr");
        render(<EvaluationChoiceTable {...withSlot} />);

        expect(
            screen.getByText("Créneaux d'évaluation sélectionnés pour Piano")
        ).toBeInTheDocument();
        expect(screen.getByText("Choix n°1")).toBeInTheDocument();
        // The slot's weekday cell comes from WEEKDAYS (tools/constants) — 2025-09-01 is a Monday.
        expect(screen.getByText("Lundi")).toBeInTheDocument();
    });

    test("renders the English header + choice badge after switching to en", async () => {
        await i18n.changeLanguage("en");
        render(<EvaluationChoiceTable {...withSlot} />);

        expect(
            screen.getByText("Selected evaluation slots for Piano")
        ).toBeInTheDocument();
        expect(screen.getByText("Choice no. 1")).toBeInTheDocument();
        // WEEKDAYS follows the active language since constants-i18n lot 1.
        expect(screen.getByText("Monday")).toBeInTheDocument();
    });

    test("a null timeInterval row falls back to the translated no-slot message", async () => {
        await i18n.changeLanguage("fr");
        render(<EvaluationChoiceTable {...noSlot} />);

        expect(
            screen.getByText(/Aucun créneau d'évaluation disponible actuellement/)
        ).toBeInTheDocument();
    });

    test("an explicit noIntervalMessage prop overrides the translated fallback (?? branch)", async () => {
        await i18n.changeLanguage("fr");
        render(
            <EvaluationChoiceTable {...noSlot} noIntervalMessage="Message sur mesure" />
        );

        expect(screen.getByText("Message sur mesure")).toBeInTheDocument();
        expect(
            screen.queryByText(/Aucun créneau d'évaluation disponible actuellement/)
        ).not.toBeInTheDocument();
    });

    // Regression: the wizard can hand `timeInterval.start`/`.end` down as ISO strings rather
    // than Date objects. `toHourMin` calls `.getHours()`, which is undefined on a string, so
    // the time cell renders "NaN:NaN" unless the component wraps each bound in `toDate()`
    // first (matching the sibling TimePreferencesTable). Revert the two `toDate()` wraps in
    // EvaluationChoiceTable.jsx and this test fails.
    const withStringSlot = {
        data: [
            {
                refId: 1,
                timeInterval: {
                    start: "2025-09-01T17:00:00",
                    end: "2025-09-01T18:30:00",
                },
            },
        ],
        activityRefs: [{id: 1, kind: "Piano"}],
    };

    test("renders real HH:MM → HH:MM when timeInterval bounds are ISO strings, not NaN:NaN", async () => {
        await i18n.changeLanguage("fr");
        render(<EvaluationChoiceTable {...withStringSlot} />);

        const cell = screen.getByText("Lundi").closest("td");
        expect(cell).toHaveTextContent("17:00");
        expect(cell).toHaveTextContent("18:30");
        expect(cell.textContent).toMatch(/17:00\s*→\s*18:30/);
        expect(cell.textContent).not.toMatch(/NaN/);
    });
});
