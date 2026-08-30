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
    GroupNameInput,
    ActivitySelection,
} from "./ActivityDetailsModal";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("TimeSelection", () => {
    const props = {
        startTime: moment("2026-09-01T10:00:00"),
        endTime: moment("2026-09-01T11:30:00"),
        handleSelectTime: () => {},
    };

    test("renders the start/end labels in French", async () => {
        await i18n.changeLanguage("fr");
        render(<TimeSelection {...props} />);
        expect(screen.getByText("Début")).toBeInTheDocument();
        expect(screen.getByText("Fin")).toBeInTheDocument();
    });

    test("renders the start/end labels in English", async () => {
        await i18n.changeLanguage("en");
        render(<TimeSelection {...props} />);
        expect(screen.getByText("Start")).toBeInTheDocument();
        expect(screen.getByText("End")).toBeInTheDocument();
    });
});

describe("LocationSelection", () => {
    // Two+ locations so the <select> branch (not the single-location static branch) renders.
    const props = {
        locations: [
            {id: 1, label: "Conservatoire"},
            {id: 2, label: "Annexe"},
        ],
        locationId: null,
        handleSelectLocation: () => {},
    };

    test("renders the disabled choose-location option in French", async () => {
        await i18n.changeLanguage("fr");
        render(<LocationSelection {...props} />);
        expect(screen.getByText("Choisir un Lieu")).toBeInTheDocument();
    });

    test("renders the disabled choose-location option in English", async () => {
        await i18n.changeLanguage("en");
        render(<LocationSelection {...props} />);
        expect(screen.getByText("Choose a location")).toBeInTheDocument();
    });
});

describe("RoomSelection", () => {
    // roomsConstrained = [] -> the React.Fragment fallback branch with the "no suitable rooms"
    // paragraph plus a second choose-room <select> built from roomRefs.
    const props = {
        roomsConstrained: [],
        roomId: null,
        roomRefs: [
            {id: 10, label: "Salle Debussy"},
            {id: 11, label: "Salle Ravel"},
        ],
        handleSelectRoom: () => {},
    };

    test("renders the no-suitable-rooms and choose-room copy in French", async () => {
        await i18n.changeLanguage("fr");
        render(<RoomSelection {...props} />);
        expect(
            screen.getByText("Aucune salle adaptée disponible pour ce cours, autres salles:"),
        ).toBeInTheDocument();
        expect(screen.getByText("Choisir une salle")).toBeInTheDocument();
    });

    test("renders the no-suitable-rooms and choose-room copy in English", async () => {
        await i18n.changeLanguage("en");
        render(<RoomSelection {...props} />);
        expect(
            screen.getByText("No suitable room available for this course, other rooms:"),
        ).toBeInTheDocument();
        expect(screen.getByText("Choose a room")).toBeInTheDocument();
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

    test("renders the substitute-for label and react-select placeholder in French", async () => {
        await i18n.changeLanguage("fr");
        render(<TeacherCoveringEditor {...baseProps} coverTeacherId={null} />);
        // Label text is split across nodes ({t(...)} {first_name}{" "}{last_name}) -> regex match.
        expect(screen.getByText(/Remplaçant de/)).toBeInTheDocument();
        expect(screen.getByText("Ada", {exact: false})).toHaveTextContent(
            "Remplaçant de Ada Lovelace",
        );
        expect(screen.getByText("PAS DE REMPLAÇANT")).toBeInTheDocument();
    });

    test("renders the substitute-for label and react-select placeholder in English", async () => {
        await i18n.changeLanguage("en");
        render(<TeacherCoveringEditor {...baseProps} coverTeacherId={null} />);
        expect(screen.getByText(/Substitute for/)).toBeInTheDocument();
        expect(screen.getByText("Ada", {exact: false})).toHaveTextContent(
            "Substitute for Ada Lovelace",
        );
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

    test("renders the addon, save button and help alert in French", async () => {
        await i18n.changeLanguage("fr");
        render(<EditGroupNameInput {...baseProps} t={i18n.getFixedT(null, "planning")} />);
        expect(screen.getByText("Nom du groupe")).toBeInTheDocument();
        expect(screen.getByText("Enregistrer")).toBeInTheDocument();
        expect(
            screen.getByText(
                "Changer le nom du groupe pour cette instance le modifiera pour toutes les occurences de cette activité.",
            ),
        ).toBeInTheDocument();
    });

    test("renders the addon, save button and help alert in English", async () => {
        await i18n.changeLanguage("en");
        render(<EditGroupNameInput {...baseProps} t={i18n.getFixedT(null, "planning")} />);
        expect(screen.getByText("Group name")).toBeInTheDocument();
        expect(screen.getByText("Save")).toBeInTheDocument();
        expect(
            screen.getByText(
                "Changing the group name for this instance will change it for all occurrences of this activity.",
            ),
        ).toBeInTheDocument();
    });

    test("picks up a fresh t prop when the language changes", async () => {
        await i18n.changeLanguage("fr");
        const {rerender} = render(
            <EditGroupNameInput {...baseProps} t={i18n.getFixedT(null, "planning")} />,
        );
        expect(screen.getByText("Nom du groupe")).toBeInTheDocument();

        await i18n.changeLanguage("en");
        rerender(<EditGroupNameInput {...baseProps} t={i18n.getFixedT(null, "planning")} />);
        expect(screen.queryByText("Nom du groupe")).not.toBeInTheDocument();
        expect(screen.getByText("Group name")).toBeInTheDocument();
        expect(screen.getByText("Save")).toBeInTheDocument();
    });
});

describe("GroupNameInput", () => {
    // Function component, useTranslation("planning"). Props are `value` / `onChange`
    // (destructured directly in the source, not groupName/handleChangeGroupName).
    const props = {
        value: "",
        onChange: () => {},
    };

    test("renders the group-name label in French", async () => {
        await i18n.changeLanguage("fr");
        render(<GroupNameInput {...props} />);
        expect(screen.getByText("Nom du groupe")).toBeInTheDocument();
    });

    test("renders the group-name label in English", async () => {
        await i18n.changeLanguage("en");
        render(<GroupNameInput {...props} />);
        expect(screen.getByText("Group name")).toBeInTheDocument();
    });
});

describe("ActivitySelection", () => {
    const props = {
        activities: [],
        activityId: 0,
        handleSelectActivity: () => {},
    };

    test("renders the activity label and disabled choose-activity option in French", async () => {
        await i18n.changeLanguage("fr");
        render(<ActivitySelection {...props} />);
        expect(screen.getByText("Activité")).toBeInTheDocument();
        expect(screen.getByText("Choisir une activité")).toBeInTheDocument();
    });

    test("renders the activity label and disabled choose-activity option in English", async () => {
        await i18n.changeLanguage("en");
        render(<ActivitySelection {...props} />);
        expect(screen.getByText("Activity")).toBeInTheDocument();
        expect(screen.getByText("Choose an activity")).toBeInTheDocument();
    });
});
