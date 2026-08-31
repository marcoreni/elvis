// i18n extraction test — i18n-06 "activities" domain, lot 3a (`activityApplications` namespace).
//
// EvaluationChoice is a function component using `useTranslation("activityApplications")`. The
// `<ItemPreferences>` child is mocked out. With a single `data` entry whose `timeInterval` is
// null the component renders:
//  - the panel title  -> evaluationChoice.selectedSlots
//  - a per-kind heading -> evaluationChoice.forKind ({kind} interpolation)
//  - the no-slot fallback paragraph -> evaluationChoice.noIntervalMessage
//    (unless a `noIntervalMessage` prop is passed, which wins via the `??`).

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../../i18n";
import EvaluationChoice from "./EvaluationChoice";

vi.mock("./ItemPreferences", () => ({default: () => null}));

const props = {
    data: [{refId: 1, timeInterval: null, teacher: {}}],
    activityRefs: [{id: 1, kind: "Piano"}],
};

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("EvaluationChoice", () => {
    test("renders the French copy + interpolated kind by default", async () => {
        await i18n.changeLanguage("fr");
        render(<EvaluationChoice {...props} />);

        expect(screen.getByText("Créneaux d'évaluation sélectionnés")).toBeInTheDocument();
        expect(screen.getByText("Pour Piano")).toBeInTheDocument();
        expect(
            screen.getByText(/Aucun créneau d'évaluation disponible actuellement/)
        ).toBeInTheDocument();
    });

    test("renders the English copy + interpolated kind after switching to en", async () => {
        await i18n.changeLanguage("en");
        render(<EvaluationChoice {...props} />);

        expect(screen.getByText("Selected evaluation slots")).toBeInTheDocument();
        expect(screen.getByText("For Piano")).toBeInTheDocument();
        expect(
            screen.getByText(/No evaluation slot is available at the moment/)
        ).toBeInTheDocument();
    });

    test("an explicit noIntervalMessage prop overrides the translated fallback (?? branch)", async () => {
        await i18n.changeLanguage("fr");
        render(<EvaluationChoice {...props} noIntervalMessage="custom" />);

        expect(screen.getByText("custom")).toBeInTheDocument();
        expect(
            screen.queryByText(/Aucun créneau d'évaluation disponible actuellement/)
        ).not.toBeInTheDocument();
    });
});
