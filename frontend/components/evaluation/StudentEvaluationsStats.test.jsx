// Regression test: this component's react-table instance didn't pass the shared
// common:reactTable.* props, so react-table fell back to its English-only defaults regardless of
// the active locale (found during the i18n PRs #7-10 re-review, docs/Modernization-Roadmap.md).

import React from "react";
import { render, screen, within } from "@testing-library/react";
import i18n from "../../i18n";
import StudentEvaluationsStats from "./StudentEvaluationsStats";

const stats = [
    {
        teacher: { id: 1, last_name: "Dupont", first_name: "Jean" },
        nb_students: 10,
        nb_evaluated_students: 5,
        nb_redirections: 1,
        nb_informed_redirections: 1,
        evaluations_completion_rate: 50,
        evaluations_completion_rate_level: "warning",
        redirection_information_rate_level: "success",
    },
];

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("StudentEvaluationsStats", () => {
    test("react-table chrome is translated in French", async () => {
        await i18n.changeLanguage("fr");
        render(<StudentEvaluationsStats stats={stats} />);

        expect(screen.getByText("Précédent")).toBeInTheDocument();
        expect(screen.getByText("Suivant")).toBeInTheDocument();
        expect(screen.queryByText("Previous")).not.toBeInTheDocument();
    });

    test("renders real headers and a real data row (TanStack migration)", async () => {
        await i18n.changeLanguage("fr");
        render(<StudentEvaluationsStats stats={stats} />);

        expect(
            screen.getByRole("columnheader", { name: "Professeur" })
        ).toBeInTheDocument();
        expect(
            screen.getByRole("columnheader", { name: "Nombre élèves" })
        ).toBeInTheDocument();

        // Cell renderers read `c.value as string`/`as number` post-migration -- assert the
        // actual accessed values render, not just placeholder chrome. Scoped to the table
        // itself: the pageSizeOptions selector (added for F3) also renders "5"/"10" as
        // <option> text in the pagination footer, outside the table.
        const table = screen.getByRole("table");
        expect(screen.getByText("Dupont Jean")).toBeInTheDocument();
        expect(within(table).getByText("10")).toBeInTheDocument();
        expect(within(table).getByText("5")).toBeInTheDocument();
        expect(within(table).getByText("50%")).toBeInTheDocument();
    });

    test("react-table chrome is translated in English", async () => {
        await i18n.changeLanguage("en");
        render(<StudentEvaluationsStats stats={stats} />);

        expect(screen.getByText("Previous")).toBeInTheDocument();
        expect(screen.getByText("Next")).toBeInTheDocument();
    });
});
