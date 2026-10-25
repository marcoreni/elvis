// Dedicated behavior coverage for CreateActivityModal (exported as CreateIntervalModal) --
// jsx-to-tsx batch 3. The i18n-lot test (PlanningModals2b.test.jsx) already covers the French/
// English copy and the admin-recurrence screen navigation; this file covers the class-to-hooks
// conversion's actual logic: season auto-detection, the kind downgrade in handleSave, and the
// interval shape handed to handleCloseAndOpenDetails.

import React from "react";
import moment from "moment";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import i18n from "../../i18n";
import CreateIntervalModal from "./CreateActivityModal";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

const seasons = [
    { id: 1, label: "2025-2026", start: "2025-09-01", end: "2026-08-31" },
    { id: 2, label: "2026-2027", start: "2026-09-01", end: "2027-08-31" },
];

function baseProps() {
    return {
        newInterval: {
            start: moment("2026-09-15T10:00:00"),
            end: moment("2026-09-15T11:00:00"),
        },
        seasons,
        closeModal: vi.fn(),
        handleCloseAndOpenDetails: vi.fn(),
    };
}

describe("CreateIntervalModal -- season auto-detection", () => {
    test("pre-selects the season whose range contains the slot's start date", async () => {
        await i18n.changeLanguage("fr");
        render(<CreateIntervalModal {...baseProps()} />);

        const select = screen.getByRole("combobox") as HTMLSelectElement;
        expect(select.value).toBe("2");
    });

    test("falls back to '' when neither the slot's date nor today falls in any season", () => {
        // Deliberately long-past seasons, so getSeasonFromDate(today, seasons) can't match
        // "today" either, regardless of when this test actually runs.
        render(
            <CreateIntervalModal
                {...baseProps()}
                seasons={[
                    {
                        id: 1,
                        label: "1999-2000",
                        start: "1999-09-01",
                        end: "2000-08-31",
                    },
                ]}
                newInterval={{
                    start: moment("2001-01-01T10:00:00"),
                    end: moment("2001-01-01T11:00:00"),
                }}
            />
        );

        const select = screen.getByRole("combobox") as HTMLSelectElement;
        expect(select.value).toBe("");
    });
});

describe("CreateIntervalModal -- handleSave", () => {
    test("downgrades kind 'c' to 'o' when the slot has no activity", async () => {
        const handleCloseAndOpenDetails = vi.fn();
        render(
            <CreateIntervalModal
                {...baseProps()}
                handleCloseAndOpenDetails={handleCloseAndOpenDetails}
                kind="c"
            />
        );

        await userEvent.click(screen.getByText("Enregistrer"));

        expect(handleCloseAndOpenDetails).toHaveBeenCalledWith(
            expect.objectContaining({ kind: "o", recurrentType: null })
        );
    });

    test("keeps kind 'c' when the slot has an activity", async () => {
        const handleCloseAndOpenDetails = vi.fn();
        render(
            <CreateIntervalModal
                {...baseProps()}
                handleCloseAndOpenDetails={handleCloseAndOpenDetails}
                kind="c"
                newInterval={{
                    start: moment("2026-09-15T10:00:00"),
                    end: moment("2026-09-15T11:00:00"),
                    activity: { id: 1 },
                }}
            />
        );

        await userEvent.click(screen.getByText("Enregistrer"));

        expect(handleCloseAndOpenDetails).toHaveBeenCalledWith(
            expect.objectContaining({ kind: "c", recurrentType: null })
        );
    });

    test("selecting a different kind via the radios is reflected in the saved interval", async () => {
        const handleCloseAndOpenDetails = vi.fn();
        render(
            <CreateIntervalModal
                {...baseProps()}
                handleCloseAndOpenDetails={handleCloseAndOpenDetails}
            />
        );

        await userEvent.click(screen.getByLabelText("Évaluation"));
        await userEvent.click(screen.getByText("Enregistrer"));

        expect(handleCloseAndOpenDetails).toHaveBeenCalledWith(
            expect.objectContaining({ kind: "e" })
        );
    });

    test("closeModal fires on Cancel", async () => {
        const closeModal = vi.fn();
        render(
            <CreateIntervalModal {...baseProps()} closeModal={closeModal} />
        );

        await userEvent.click(screen.getByText("Annuler"));

        expect(closeModal).toHaveBeenCalledTimes(1);
    });
});

describe("CreateIntervalModal -- admin recurrence flow", () => {
    test("picking the availability choice shows the recurrence checkbox, and toggling it reveals the type select", async () => {
        render(
            <CreateIntervalModal
                {...baseProps()}
                currentUserIsAdmin
                recurrenceActivated
            />
        );

        await userEvent.click(screen.getByText("Ajout d'une disponibilité"));
        expect(
            screen.getByText("Ce créneau est récurrent")
        ).toBeInTheDocument();
        expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

        await userEvent.click(
            screen.getByLabelText("Ce créneau est récurrent")
        );
        expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    test("saving from the recurrence screen includes the chosen recurrentType", async () => {
        const handleCloseAndOpenDetails = vi.fn();
        render(
            <CreateIntervalModal
                {...baseProps()}
                handleCloseAndOpenDetails={handleCloseAndOpenDetails}
                currentUserIsAdmin
                recurrenceActivated
            />
        );

        await userEvent.click(screen.getByText("Ajout d'une disponibilité"));
        await userEvent.click(
            screen.getByLabelText("Ce créneau est récurrent")
        );
        await userEvent.click(screen.getByText("Enregistrer"));

        expect(handleCloseAndOpenDetails).toHaveBeenCalledWith(
            expect.objectContaining({ kind: "o", recurrentType: "weekly" })
        );
    });

    test("clicking the course choice calls handleCloseAndOpenDetails with the raw slot immediately", async () => {
        const handleCloseAndOpenDetails = vi.fn();
        const newInterval = {
            start: moment("2026-09-15T10:00:00"),
            end: moment("2026-09-15T11:00:00"),
        };
        render(
            <CreateIntervalModal
                {...baseProps()}
                newInterval={newInterval}
                handleCloseAndOpenDetails={handleCloseAndOpenDetails}
                currentUserIsAdmin
                recurrenceActivated
            />
        );

        await userEvent.click(screen.getByText("Ajout d'un cours"));

        expect(handleCloseAndOpenDetails).toHaveBeenCalledWith(newInterval);
    });
});
