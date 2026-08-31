// i18n extraction test for ActivityRefTeachers (i18n-06 "activities" domain, lot 2a).
//
// ActivityRefTeachers is a class component wrapped in `withTranslation("activities")`. On mount
// it fetches "/teachers/index" and stores the result in state.all_teachers; it only renders the
// <SelectMultiple> (whose `title` prop is `t("activityRef.teachers.title")`) once that array is
// non-empty. So the test stubs global.fetch to resolve a one-teacher payload, stubs
// ../common/SelectMultiple with a component that renders its `title` prop, and waits for the
// translated title to appear in fr + en.

import React from "react";
import {render, screen, waitFor} from "@testing-library/react";
import i18n from "../../i18n";
import ActivityRefTeachers from "./ActivityRefTeachers";

vi.mock("../common/SelectMultiple", () => ({
    default: ({title}) => <div data-testid="select-multiple">{title}</div>,
}));

beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: {get: () => null},
        json: () => Promise.resolve([{id: 1, last_name: "B", first_name: "A"}]),
    });
});

afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage("fr");
});

const props = {teachers: [], mutators: {}};

describe("ActivityRefTeachers", () => {
    test("it is wrapped in withTranslation()", () => {
        expect(ActivityRefTeachers.WrappedComponent).toBeDefined();
    });

    test("renders the French SelectMultiple title after the teachers fetch resolves", async () => {
        await i18n.changeLanguage("fr");
        render(<ActivityRefTeachers {...props} />);

        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/teachers/index", expect.any(Object)));
        expect(await screen.findByText("Professeurs")).toBeInTheDocument();
    });

    test("renders the English SelectMultiple title after the teachers fetch resolves", async () => {
        await i18n.changeLanguage("en");
        render(<ActivityRefTeachers {...props} />);

        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/teachers/index", expect.any(Object)));
        expect(await screen.findByText("Teachers")).toBeInTheDocument();
    });
});
