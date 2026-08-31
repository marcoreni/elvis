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

// The component passes `timeInterval.start` straight to `toHourMin` (which calls .getHours()),
// so these must be Date objects, not ISO strings — that's the shape the wizard hands down.
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
    });

    test("renders the English header + choice badge after switching to en", async () => {
        await i18n.changeLanguage("en");
        render(<EvaluationChoiceTable {...withSlot} />);

        expect(
            screen.getByText("Selected evaluation slots for Piano")
        ).toBeInTheDocument();
        expect(screen.getByText("Choice no. 1")).toBeInTheDocument();
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
});
