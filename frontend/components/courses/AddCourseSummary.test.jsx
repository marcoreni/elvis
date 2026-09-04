// Component test for the i18n extraction on the "courses" domain lot 1 — AddCourseSummary.
//
// AddCourseSummary is a class component wrapped in `withTranslation("courses")`. It is purely
// presentational: it renders a recap ("Récapitulatif" / "Summary") table straight from its
// `summary` prop, with no fetch on mount, so it can be rendered and asserted on directly.
//
// Same language-switching pattern as the earlier i18n branches: drive the
// frontend/i18n/index.js singleton with i18n.changeLanguage(...); no <I18nextProvider> needed
// because the singleton is wired through initReactI18next.
//
// The component pulls WEEKDAYS / MONTHS from tools/constants — since the constants-i18n pass these
// follow the active UI language (sourced from the `common` namespace), so the recap slot line
// reads "Lundi ... Juin" in fr and "Monday ... June" in en. It also reads
// `firstDayStartTime._d.getDate()` etc. plus `firstDayStartTime.format(...)` — a plain stub with
// a `_d` Date and a `format` fn is enough, no moment dependency needed here.

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../../i18n";
import AddCourseSummary from "./AddCourseSummary";

// 2025-06-16 is a Monday -> WEEKDAYS[dayOfWeek % 7] === WEEKDAYS[1] === "Lundi" / "Monday",
// MONTHS[5] === "Juin" / "June".
const timeStub = (hour, minute) => ({
    _d: new Date(2025, 5, 16, hour, minute, 0),
    format: () => `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
});

const fullSummary = {
    activityRef: "Guitare",
    dayOfWeek: 1,
    firstDayStartTime: timeStub(8, 0),
    firstDayEndTime: timeStub(9, 0),
    teacher: {first_name: "Ada", last_name: "Lovelace"},
    location: "Conservatoire",
    room: "Salle 12",
};

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("AddCourseSummary", () => {
    test("renders the French section labels by default", async () => {
        await i18n.changeLanguage("fr");
        render(<AddCourseSummary summary={fullSummary} />);

        expect(screen.getByText("Récapitulatif")).toBeInTheDocument();
        expect(screen.getByText("Activité")).toBeInTheDocument(); // summary.activity <h4>
        expect(screen.getByText("Créneau")).toBeInTheDocument();
        expect(screen.getByText("Professeur")).toBeInTheDocument();
        // summary.place and summary.location are both "Lieu" in French.
        expect(screen.getAllByText("Lieu")).toHaveLength(2);
        expect(screen.getByText("Salle")).toBeInTheDocument();
        // summary.timeFrom ("de") + summary.timeTo ("à") inside the split slot line.
        expect(screen.getByText(/de 08h00 à 09h00/)).toBeInTheDocument();
        // WEEKDAYS / MONTHS now follow the locale: French day + month names in the recap line.
        expect(screen.getByText(/Lundi 16 Juin 2025/)).toBeInTheDocument();
    });

    test("renders the English section labels when the active language is en", async () => {
        await i18n.changeLanguage("en");
        render(<AddCourseSummary summary={fullSummary} />);

        expect(screen.getByText("Summary")).toBeInTheDocument();
        expect(screen.getByText("Activity")).toBeInTheDocument();
        expect(screen.getByText("Slot")).toBeInTheDocument();
        expect(screen.getByText("Teacher")).toBeInTheDocument();
        expect(screen.getByText("Place")).toBeInTheDocument(); // summary.place <h4>
        expect(screen.getByText("Location")).toBeInTheDocument(); // summary.location <strong>
        expect(screen.getByText("Room")).toBeInTheDocument();
        // summary.timeFrom ("from") + summary.timeTo ("to").
        expect(screen.getByText(/from 08h00 to 09h00/)).toBeInTheDocument();
        // WEEKDAYS / MONTHS now follow the locale: English day + month names in the recap line.
        expect(screen.getByText(/Monday 16 June 2025/)).toBeInTheDocument();
    });
});
