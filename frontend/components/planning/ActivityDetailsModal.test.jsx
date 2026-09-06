// Component tests for the i18n extraction on ActivityDetailsModal.jsx (planning lot 5).
//
// The default export `ActivityDetailsModal` is a ~2000-line class that mounts TabbedComponent,
// the withSave HOC, YearlyCalendar and AttendanceControl (from ../PresenceSheet) — none of which
// render cleanly in jsdom. The pieces that actually carry the extracted copy were exported as
// standalone function components for this purpose, so they are exercised directly here.
//
// Language switching goes through the frontend/i18n singleton (useTranslation("planning")); no
// I18nextProvider is needed. Each component is rendered in both fr and en and asserted against
// the real translated copy.

import React from "react";
import {render, screen} from "@testing-library/react";
import moment from "moment";
import i18n from "../../i18n";

import {
    TimeSelection,
    LocationSelection,
    RoomSelection,
    TeacherCoveringEditor,
    EditGroupNameInput,
    ActivitySelection,
    GroupNameInput,
} from "./ActivityDetailsModal";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

// Phase 07 P0 (docs/I18n-Roadmap.md §P0): the per-sub-component "renders the fr labels /
// renders the en labels" pairs for TimeSelection, LocationSelection, RoomSelection,
// GroupNameInput and ActivitySelection were pure string-echoes. They are collapsed into this one
// bilingual smoke that still mounts each of them per locale and checks the representative
// translated copy plus the absence of a "translation missing" marker. The behaviour-carrying
// blocks below (TeacherCoveringEditor's conditional hours-counted question, EditGroupNameInput's
// `t`-prop reactivity) are kept.
describe.each(["fr", "en"])("ActivityDetailsModal sub-selectors — bilingual smoke (%s)", lng => {
    const REPRESENTATIVE = {
        fr: {time: ["Début", "Fin"], location: "Choisir un Lieu", room: "Choisir une salle", activity: "Choisir une activité", groupName: "Nom du groupe"},
        en: {time: ["Start", "End"], location: "Choose a location", room: "Choose a room", activity: "Choose an activity", groupName: "Group name"},
    };

    test("TimeSelection / LocationSelection / RoomSelection / ActivitySelection / GroupNameInput render translated copy", async () => {
        await i18n.changeLanguage(lng);
        const rep = REPRESENTATIVE[lng];

        const {unmount: u1} = render(
            <TimeSelection
                startTime={moment("2026-09-01T10:00:00")}
                endTime={moment("2026-09-01T11:30:00")}
                handleSelectTime={() => {}}
            />,
        );
        for (const label of rep.time) expect(screen.getByText(label)).toBeInTheDocument();
        u1();

        const {unmount: u2} = render(
            <LocationSelection
                locations={[{id: 1, label: "Conservatoire"}, {id: 2, label: "Annexe"}]}
                locationId={null}
                handleSelectLocation={() => {}}
            />,
        );
        expect(screen.getByText(rep.location)).toBeInTheDocument();
        u2();

        const {unmount: u3} = render(
            <RoomSelection
                roomsConstrained={[]}
                roomId={null}
                roomRefs={[{id: 10, label: "Salle Debussy"}, {id: 11, label: "Salle Ravel"}]}
                handleSelectRoom={() => {}}
            />,
        );
        expect(screen.getByText(rep.room)).toBeInTheDocument();
        u3();

        const {unmount: u4} = render(
            <ActivitySelection activities={[]} activityId={0} handleSelectActivity={() => {}} />,
        );
        expect(screen.getByText(rep.activity)).toBeInTheDocument();
        u4();

        // RESTORED BY CODE REVIEW: the trailing comment in this file claimed GroupNameInput was
        // "still mounted per locale by the smoke describe above", but the prune removed it from
        // the import list and never rendered it — it was left with zero coverage.
        render(<GroupNameInput value="" onChange={() => {}} />);
        expect(screen.getByText(rep.groupName)).toBeInTheDocument();

        expect(document.body.textContent).not.toMatch(/translation missing/i);
    });
});

describe("TeacherCoveringEditor", () => {
    const baseProps = {
        teacher: {id: 1, first_name: "Ada", last_name: "Lovelace"},
        areHoursCounted: false,
        potentialCoveringTeachers: [],
        teachers: [],
        onChange: () => {},
    };

    // The substitute-for label is split across text nodes ({t(...)} {first_name}{" "}{last_name}) —
    // kept (not a plain string-echo) to pin that the interpolated teacher name lands inside the
    // translated label in both locales. fr/en merged into one rerender under Phase 07 P0.
    test("interpolates the covered teacher's name into the substitute-for label (fr + en)", async () => {
        await i18n.changeLanguage("fr");
        const {rerender} = render(<TeacherCoveringEditor {...baseProps} coverTeacherId={null} />);
        expect(screen.getByText("Ada", {exact: false})).toHaveTextContent("Remplaçant de Ada Lovelace");
        expect(screen.getByText("PAS DE REMPLAÇANT")).toBeInTheDocument();

        await i18n.changeLanguage("en");
        rerender(<TeacherCoveringEditor {...baseProps} coverTeacherId={null} />);
        expect(screen.getByText("Ada", {exact: false})).toHaveTextContent("Substitute for Ada Lovelace");
        expect(screen.getByText("NO SUBSTITUTE")).toBeInTheDocument();
    });

    test("shows the hours-counted question only once a covering teacher is picked (French)", async () => {
        await i18n.changeLanguage("fr");
        const {rerender} = render(
            <TeacherCoveringEditor {...baseProps} coverTeacherId={null} />,
        );
        expect(
            screen.queryByText("Heures comptées pour le professeur absent ?"),
        ).not.toBeInTheDocument();

        rerender(<TeacherCoveringEditor {...baseProps} coverTeacherId={42} />);
        expect(
            screen.getByText("Heures comptées pour le professeur absent ?"),
        ).toBeInTheDocument();
    });

    test("shows the hours-counted question only once a covering teacher is picked (English)", async () => {
        await i18n.changeLanguage("en");
        const {rerender} = render(
            <TeacherCoveringEditor {...baseProps} coverTeacherId={null} />,
        );
        expect(
            screen.queryByText("Hours counted for the absent teacher?"),
        ).not.toBeInTheDocument();

        rerender(<TeacherCoveringEditor {...baseProps} coverTeacherId={42} />);
        expect(
            screen.getByText("Hours counted for the absent teacher?"),
        ).toBeInTheDocument();
    });
});

describe("EditGroupNameInput", () => {
    // Class component that reads `t` from props (the parent modal threads `t={t}` in) — no
    // useTranslation, so the test must supply a getFixedT bound to the "planning" namespace.
    const baseProps = {
        value: "Groupe X",
        onChange: () => {},
        onSave: () => {},
    };

    // The plain fr / en "renders the addon, save button and help alert" pair was a string-echo
    // (Phase 07 P0). The `t`-prop reactivity test below already asserts the fr copy, switches
    // language, and asserts the en copy — it is the mechanic worth keeping (this class reads `t`
    // from props rather than useTranslation, so a stale prop would silently keep the old locale).
    test("picks up a fresh t prop when the language changes", async () => {
        await i18n.changeLanguage("fr");
        const {rerender} = render(
            <EditGroupNameInput {...baseProps} t={i18n.getFixedT(null, "planning")} />,
        );
        expect(screen.getByText("Nom du groupe")).toBeInTheDocument();
        expect(screen.getByText("Enregistrer")).toBeInTheDocument();

        await i18n.changeLanguage("en");
        rerender(<EditGroupNameInput {...baseProps} t={i18n.getFixedT(null, "planning")} />);
        expect(screen.queryByText("Nom du groupe")).not.toBeInTheDocument();
        expect(screen.getByText("Group name")).toBeInTheDocument();
        expect(screen.getByText("Save")).toBeInTheDocument();
    });
});

// GroupNameInput and ActivitySelection had fr/en "renders the label" string-echo pairs only —
// removed under Phase 07 P0. Both components are mounted per locale by the "ActivityDetailsModal
// sub-selectors — bilingual smoke" describe above. (GroupNameInput's mount was RESTORED BY CODE
// REVIEW: the prune dropped it from the import list and never re-rendered it, so this comment had
// become false and the component was left with zero coverage anywhere in the suite.)
