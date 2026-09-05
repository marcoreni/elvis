// i18n extraction test — i18n-06 "activities" domain, lot 3b (`activityApplications` namespace).
//
// WorkGroupEditor's default export is `withTranslation("activityApplications")(WorkGroupEditor)`
// (class). Its render threads `t` from props into the table header and the "add role" button.
// `WorkGroupRow` is a module-local function component using `useTranslation`; its keys need
// `activities_instruments` rows (with instrument data) to render, so they are covered at the i18n
// layer only. `componentDidMount` fires `set().success(cb).get("/instruments.json")` — the
// `../../../tools/api` module is stubbed chainable with a `.get` that never resolves the success
// callback, so `state.instruments` stays `[]`.

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../../../i18n";
import WorkGroupEditor from "./WorkGroupEditor";

vi.mock("../../../tools/api", () => {
    const chain = {
        before: () => chain,
        useLoading: () => chain,
        success: () => chain,
        error: () => chain,
        get: vi.fn(() => Promise.resolve()),
        post: vi.fn(() => Promise.resolve()),
        patch: vi.fn(() => Promise.resolve()),
        del: vi.fn(() => Promise.resolve()),
    };
    return {set: () => chain};
});

const props = {
    userId: 1,
    activity: {id: 10, activities_instruments: []},
    desiredActivity: {id: 5, activity_id: null, user_id: 2},
    onUpdateActivity() {},
};

afterEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("fr");
});

describe("WorkGroupEditor — HOC shape", () => {
    test("default export is wrapped in withTranslation()", () => {
        expect(WorkGroupEditor.WrappedComponent).toBeDefined();
    });
});

describe("WorkGroupEditor — table headers + add-role button", () => {
    test.each([
        ["fr", ["Élève", "Instrument", "Essai le", "Actions"], "Ajouter un rôle"],
        ["en", ["Student", "Instrument", "Trial on", "Actions"], "Add role"],
    ])("%s", async (lng, headers, addRole) => {
        await i18n.changeLanguage(lng);
        render(<WorkGroupEditor {...props} />);

        for (const h of headers) {
            expect(screen.getByRole("columnheader", {name: new RegExp(h)})).toBeInTheDocument();
        }
        expect(screen.getByRole("button", {name: addRole})).toBeInTheDocument();
    });
});

describe("WorkGroupEditor — i18n layer (WorkGroupRow + error-path keys)", () => {
    const KEYS = [
        "workGroupEditor.toAssign",
        "workGroupEditor.cannotAddMultiple",
        "workGroupEditor.option",
        "workGroupEditor.removeFromRole",
        "workGroupEditor.deleteRole",
        "workGroupEditor.alreadyInAnotherWorkshop",
        "workGroupEditor.instrumentPlaceholder",
        "workGroupEditor.removeOptionError",
        "workGroupEditor.removeStudentError",
    ];

    test.each(["fr", "en"])("all row/error keys resolve to real copy in %s", lng => {
        const t = i18n.getFixedT(lng, "activityApplications");
        for (const key of KEYS) {
            const v = t(key);
            expect(typeof v).toBe("string");
            expect(v.length).toBeGreaterThan(0);
            expect(v).not.toBe(key);
            expect(v).not.toMatch(/\{\{/);
        }
    });
});
