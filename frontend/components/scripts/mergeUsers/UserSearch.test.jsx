// Regression test for the off-by-one debounced search trigger.
//
// handleChange used to check `this.state.first_name.length >= 2 || this.state.last_name.length >=
// 2` right after calling `this.setState({[evt.target.name]: evt.target.value, ...})` -- reading
// state synchronously right after setting it is always stale in a plain event handler, so the
// field just typed into is checked against its *previous* value, one keystroke behind. That meant
// the 2nd typed character never scheduled the debounced search; only the 3rd did. Fixed by reading
// `evt.target.value` directly for whichever field just changed, falling back to `this.state` only
// for the other, untouched field.
//
// `tools/api` is stubbed with a single persistent chain object so `post` can be asserted on
// directly; `withTranslation("users")` needs a real i18n instance for the title/label copy.

import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import i18n from "../../../i18n";
import UserSearch from "./UserSearch";

vi.mock("../../../tools/api", () => {
    const postSpy = vi.fn();
    const chain = {
        before: () => chain,
        success: () => chain,
        error: () => chain,
        post: (...args) => postSpy(...args),
    };
    return { set: () => chain, __postSpy: postSpy };
});

import * as api from "../../../tools/api";

const props = {
    season: { id: 1 },
    onSelect: () => {},
};

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(async () => {
    act(() => vi.runOnlyPendingTimers());
    vi.useRealTimers();
    vi.clearAllMocks();
    await i18n.changeLanguage("fr");
});

describe("UserSearch (mergeUsers) -- debounced search trigger", () => {
    test("typing a 2-character first name schedules the debounced search on that same keystroke", () => {
        const { container } = render(<UserSearch {...props} />);
        const input = container.querySelector('input[name="first_name"]');

        fireEvent.change(input, { target: { name: "first_name", value: "A" } });
        fireEvent.change(input, {
            target: { name: "first_name", value: "Ab" },
        });

        act(() => vi.advanceTimersByTime(400));

        expect(api.__postSpy).toHaveBeenCalledTimes(1);
        expect(api.__postSpy).toHaveBeenCalledWith(
            "/users/search_for_admin",
            expect.objectContaining({ first_name: "Ab", last_name: "" })
        );
    });

    test("typing a 2-character last name schedules the debounced search, keeping the other field's current value", () => {
        const { container } = render(<UserSearch {...props} />);
        const firstNameInput = container.querySelector(
            'input[name="first_name"]'
        );
        const lastNameInput = container.querySelector(
            'input[name="last_name"]'
        );

        fireEvent.change(firstNameInput, {
            target: { name: "first_name", value: "A" },
        });
        act(() => vi.advanceTimersByTime(400));
        expect(api.__postSpy).not.toHaveBeenCalled();

        fireEvent.change(lastNameInput, {
            target: { name: "last_name", value: "Xy" },
        });
        act(() => vi.advanceTimersByTime(400));

        expect(api.__postSpy).toHaveBeenCalledTimes(1);
        expect(api.__postSpy).toHaveBeenCalledWith(
            "/users/search_for_admin",
            expect.objectContaining({ first_name: "A", last_name: "Xy" })
        );
    });
});
