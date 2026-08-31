// i18n extraction tests for ActivityRefApplication (i18n-06 "activities" domain, lot 2c).
//
// ActivityRefApplication is the "Inscription" tab body of the activity-ref form: a class
// component wrapped in `withTranslation("activities")`. It renders react-final-form `<Field>`s,
// so it is mounted inside `<Form onSubmit render={() => <ActivityRefApplication/>} />`.
//
// Leaf children that only forward copy are stubbed to render their `label` prop:
//   `../common/Checkbox`, `../common/Radio`.
//
// The interesting bits:
//  - The three `<Trans>` help lines inside `<p class="row-sm text-muted">` use numeric child
//    indexing (`<1>` / `<3>` for the `<strong>` tags). The tests assert the *rendered* DOM:
//    the sentence text, the `<strong>` contents, and that no literal "<1>" / "&lt;1&gt;" leaks.
//  - `AllowsTimeslotSelectionButtonGroup` is a module-local fn component using
//    `useTranslation("activities")`; it is only mounted when the `substitutable` radio is
//    "true", so a test sets `initialValues={{substitutable: "true"}}` to reveal it and prove
//    the hook path resolves.
//
// Language is driven through the frontend/i18n singleton; `afterEach` restores "fr".

import React from "react";
import {render, screen} from "@testing-library/react";
import {Form} from "react-final-form";
import i18n from "../../i18n";
import ActivityRefApplication from "./ActivityRefApplication";

vi.mock("../common/Checkbox", () => ({default: props => <div>{props.label}</div>}));
vi.mock("../common/Radio", () => ({default: props => <div>{props.label}</div>}));

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

const props = {activityRefs: []};

function renderApplication(initialValues = {}) {
    return render(
        <Form
            onSubmit={() => {}}
            initialValues={initialValues}
            render={() => <ActivityRefApplication {...props} />}
        />,
    );
}

describe("ActivityRefApplication", () => {
    test("it is wrapped in withTranslation()", () => {
        expect(ActivityRefApplication.WrappedComponent).toBeDefined();
    });

    describe("fr", () => {
        test("section headings", async () => {
            await i18n.changeLanguage("fr");
            renderApplication();

            expect(screen.getByText("Réinscription")).toBeInTheDocument();
            expect(screen.getByText("Visibilité")).toBeInTheDocument();
            expect(screen.getByText("Choix des activités")).toBeInTheDocument();
            expect(screen.getByText("Evaluation")).toBeInTheDocument();
        });

        test("checkbox / radio labels (via stubs)", async () => {
            await i18n.changeLanguage("fr");
            renderApplication();

            expect(
                screen.getByText("Ce cours peut être selectionné lors d'une inscription"),
            ).toBeInTheDocument();
            expect(
                screen.getByText("Rattacher cette activité à sa famille"),
            ).toBeInTheDocument();
            expect(
                screen.getByText("Ce cours nécessite une évaluation pour les nouveaux élèves"),
            ).toBeInTheDocument();
        });

        test("the three <Trans> help lines render with <strong> and no literal tags", async () => {
            await i18n.changeLanguage("fr");
            const {container} = renderApplication();

            const p = container.querySelector("p.row-sm.text-muted");
            expect(p).toBeTruthy();

            expect(p.textContent).toContain("Sélectionner plusieurs activités avec CTRL.");
            expect(p.textContent).toContain(
                "Sélectionner la totalité entre deux activités avec MAJ/SHIFT.",
            );
            expect(p.textContent).toContain("Vous pouvez combiner CTRL et MAJ/SHIFT.");

            const strongs = [...p.querySelectorAll("strong")].map(s => s.textContent);
            expect(strongs).toEqual(["CTRL", "MAJ/SHIFT", "CTRL", "MAJ/SHIFT"]);

            expect(p.textContent).not.toContain("<1>");
            expect(p.textContent).not.toContain("<3>");
            expect(p.innerHTML).not.toMatch(/&lt;[13]&gt;/);
        });

        test("substitutable=true reveals the timeslot radio group (useTranslation fn component)", async () => {
            await i18n.changeLanguage("fr");
            renderApplication({substitutable: "true"});

            expect(
                screen.getByText("Proposer à l'élève des créneaux de cours"),
            ).toBeInTheDocument();
            expect(
                screen.getByText("Demander à l'élève de saisir ses disponibilités"),
            ).toBeInTheDocument();
        });
    });

    describe("en", () => {
        test("section headings", async () => {
            await i18n.changeLanguage("en");
            renderApplication();

            expect(screen.getByText("Re-enrollment")).toBeInTheDocument();
            expect(screen.getByText("Visibility")).toBeInTheDocument();
            expect(screen.getByText("Choice of activities")).toBeInTheDocument();
            expect(screen.getByText("Evaluation")).toBeInTheDocument();
        });

        test("checkbox / radio labels (via stubs)", async () => {
            await i18n.changeLanguage("en");
            renderApplication();

            expect(
                screen.getByText("This course can be selected during a registration"),
            ).toBeInTheDocument();
            expect(
                screen.getByText("Attach this activity to its family"),
            ).toBeInTheDocument();
            expect(
                screen.getByText("This course requires an evaluation for new students"),
            ).toBeInTheDocument();
        });

        test("the three <Trans> help lines render with <strong> and no literal tags", async () => {
            await i18n.changeLanguage("en");
            const {container} = renderApplication();

            const p = container.querySelector("p.row-sm.text-muted");
            expect(p).toBeTruthy();

            expect(p.textContent).toContain("Select multiple activities with CTRL.");
            expect(p.textContent).toContain(
                "Select everything between two activities with SHIFT.",
            );
            expect(p.textContent).toContain("You can combine CTRL and SHIFT.");

            const strongs = [...p.querySelectorAll("strong")].map(s => s.textContent);
            expect(strongs).toEqual(["CTRL", "SHIFT", "CTRL", "SHIFT"]);

            expect(p.textContent).not.toContain("<1>");
            expect(p.textContent).not.toContain("<3>");
            expect(p.innerHTML).not.toMatch(/&lt;[13]&gt;/);
        });

        test("substitutable=true reveals the timeslot radio group (useTranslation fn component)", async () => {
            await i18n.changeLanguage("en");
            renderApplication({substitutable: "true"});

            expect(
                screen.getByText("Propose course slots to the student"),
            ).toBeInTheDocument();
            expect(
                screen.getByText("Ask the student to enter their availabilities"),
            ).toBeInTheDocument();
        });
    });
});
