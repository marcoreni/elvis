// Regression coverage for SeasonSwitch, added alongside the react-switch 6->7 bump
// (chore/bump-react-switch). Not currently mounted from any Rails view (no react_component
// "SeasonSwitch" call, no importer elsewhere in frontend/) -- left in place per this repo's
// don't-delete-on-"looks dead" convention -- but it's still a direct react-switch call site and
// had zero test coverage before this file.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SeasonSwitch from "./SeasonSwitch";

describe("SeasonSwitch", () => {
    test("clicking the switch checks it and forwards season_id to handleSwitch", async () => {
        const handleSwitch = vi.fn();
        render(
            <SeasonSwitch
                checked={false}
                season_id={7}
                handleSwitch={handleSwitch}
            />
        );

        const toggle = screen.getByRole("switch");
        expect(toggle).not.toBeChecked();

        await userEvent.click(toggle);

        expect(toggle).toBeChecked();
        expect(handleSwitch).toHaveBeenCalledWith(7);
    });

    test("disabled switch ignores clicks and never calls handleSwitch", async () => {
        const handleSwitch = vi.fn();
        render(
            <SeasonSwitch
                checked={false}
                disabled
                season_id={7}
                handleSwitch={handleSwitch}
            />
        );

        const toggle = screen.getByRole("switch");
        await userEvent.click(toggle);

        expect(toggle).not.toBeChecked();
        expect(handleSwitch).not.toHaveBeenCalled();
    });
});
