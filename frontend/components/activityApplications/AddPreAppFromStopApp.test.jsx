// i18n extraction test — i18n-06 "activities" domain, lot 3a (`activityApplications` namespace).
//
// AddPreAppFromStopApp is a class component wrapped in `withTranslation("activityApplications")`.
// componentDidMount -> fetchExist() -> `api.set().success(cb).post(...)`; the tools/api module is
// mocked with a chainable stub that captures the `.success` callback so the test can drive
// `state.exist` by hand. sweetalert2 is mocked so `onClick` can be asserted without a real modal.
//
// Covered:
//  - button label            -> addPreApp.openButton (fr + en)
//  - disabled tooltip (exist) -> addPreApp.alreadyDone (title attr), after success(true)
//  - onClick after success(false): Swal.fire is called with the interpolated addPreApp.confirmHtml
//    ("Jean Dupont" + "2025-2026" present, no leftover "{{").

import React from "react";
import {render, screen, act} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../i18n";
import Swal from "sweetalert2";
import AddPreAppFromStopApp from "./AddPreAppFromStopApp";

const {apiState} = vi.hoisted(() => ({apiState: {capturedSuccess: null}}));

vi.mock("../../tools/api.js", () => {
    const chain = {
        useLoading: () => chain,
        before: () => chain,
        error: () => chain,
        success: cb => {
            apiState.capturedSuccess = cb;
            return chain;
        },
        post: vi.fn(() => Promise.resolve()),
        patch: vi.fn(() => Promise.resolve()),
    };
    return {set: () => chain};
});

vi.mock("sweetalert2", () => ({
    default: {fire: vi.fn(() => Promise.resolve({value: false}))},
}));

const props = {
    user: {id: 1, first_name: "Jean", last_name: "Dupont"},
    current_user: {id: 2},
    next_season: {id: 3, label: "2025-2026"},
    activity: {id: 4},
};

afterEach(async () => {
    vi.clearAllMocks();
    apiState.capturedSuccess = null;
    await i18n.changeLanguage("fr");
});

describe("AddPreAppFromStopApp", () => {
    test("is wrapped in withTranslation()", () => {
        expect(AddPreAppFromStopApp.WrappedComponent).toBeDefined();
    });

    test("renders the French button label by default", async () => {
        await i18n.changeLanguage("fr");
        render(<AddPreAppFromStopApp {...props} />);

        expect(screen.getByRole("button")).toHaveTextContent("Ouvrir la préinscription");
    });

    test("renders the English button label after switching to en", async () => {
        await i18n.changeLanguage("en");
        render(<AddPreAppFromStopApp {...props} />);

        expect(screen.getByRole("button")).toHaveTextContent("Open pre-registration");
    });

    test("once success(true) marks it done, the button is disabled with the alreadyDone tooltip", async () => {
        await i18n.changeLanguage("fr");
        render(<AddPreAppFromStopApp {...props} />);

        act(() => apiState.capturedSuccess(true));

        const button = screen.getByRole("button");
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute("title", "Cette action a déjà été effectuée");
    });

    test("clicking the enabled button fires Swal.fire with the interpolated confirm copy", async () => {
        await i18n.changeLanguage("fr");
        render(<AddPreAppFromStopApp {...props} />);

        // success(false) -> fetching:false, exist:false -> button enabled, empty title
        act(() => apiState.capturedSuccess(false));

        const button = screen.getByRole("button");
        expect(button).toBeEnabled();
        expect(button).toHaveAttribute("title", "");

        await userEvent.click(button);

        expect(Swal.fire).toHaveBeenCalledTimes(1);
        const firstArg = Swal.fire.mock.calls[0][0];
        expect(firstArg.title).toContain("Jean Dupont");
        expect(firstArg.title).toContain("2025-2026");
        expect(firstArg.title).not.toContain("{{");
    });
});
