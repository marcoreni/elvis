// Regression test for the "selection" column's row-checkbox going stale (item 13 batch 4d part
// 1, docs/Modernization-Roadmap.md). LessonList.test.jsx mocks `TanStackGrid` entirely (see its
// own header comment), which hides this bug -- it only reproduces with the real grid, since it's
// TanStack's own per-row `_valuesCache` (keyed on `data`'s reference, not on unrelated component
// state) that goes stale. This file mounts LessonList with the real TanStackGrid instead, so it
// stays separate from LessonList.test.jsx rather than un-mocking the grid for one test there.
//
// The "selection" column's `accessor` (`isTargeted`) reads `this.state.targets` -- clicking a
// row's own checkbox only `setState`s `targets`, not `data`, so the cache never recomputed that
// accessor. Before this commit the Cell displayed the cached `value` from that accessor; now it
// reads `isTargeted(d.original)` straight off `this.state.targets` inside `Cell`, bypassing the
// stale cache entirely. The header "select all" checkbox (in the column's `Filter`) was never
// affected -- it already read `this.state.targets` directly -- so this test specifically drives
// a single row's own checkbox, not the header.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../i18n";
import LessonList from "./LessonList";

const makeLesson = (id, groupName) => ({
    id,
    group_name: groupName,
    activity_ref_id: 3,
    time_interval: {
        start: "2025-09-08T17:00:00",
        end: "2025-09-08T18:00:00",
    },
    teacher: {
        id: 2,
        first_name: "Jean",
        last_name: "Petit",
        planning: { id: 99 },
    },
    room: { label: "Salle A" },
    activity_instance: null,
    location: { label: "Site A" },
    users: [],
    options: [],
    activity_ref: { occupation_limit: 10, is_work_group: false },
});

const makeProps = () => ({
    seasons: [
        {
            id: 1,
            label: "2025",
            is_current: true,
            start: "2025-09-01",
            end: "2026-06-30",
        },
    ],
    activityRefs: [{ id: 3, label: "Piano" }],
    teachers: [],
    rooms: [],
    locations: [],
    evaluationLevelRefs: [],
    // Skips the "teacher_id" column -- irrelevant to this regression, one less field to fixture.
    isTeacherView: true,
});

beforeEach(() => {
    localStorage.clear();
});

afterEach(async () => {
    vi.restoreAllMocks();
    localStorage.clear();
    await i18n.changeLanguage("fr");
});

test("clicking a lesson row's own checkbox visually checks that row, without affecting the other row or the header", async () => {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => null },
        json: () =>
            Promise.resolve({
                data: [makeLesson(1, "G1"), makeLesson(2, "G2")],
                pages: 1,
                total: 2,
            }),
    });

    render(<LessonList {...makeProps()} />);

    await screen.findByText("G1");
    await screen.findByText("G2");

    // Header "select all" checkbox (column Filter) + one checkbox per row, in DOM order.
    const before = screen.getAllByRole("checkbox");
    expect(before).toHaveLength(3);
    expect(before[0]).not.toBeChecked();
    expect(before[1]).not.toBeChecked();
    expect(before[2]).not.toBeChecked();

    // Click the FIRST ROW's own checkbox -- not the header.
    await userEvent.click(before[1]);

    const after = screen.getAllByRole("checkbox");
    expect(after[1]).toBeChecked();
    // Only one of two rows selected -- the header must stay unchecked.
    expect(after[0]).not.toBeChecked();
    // The other row is untouched.
    expect(after[2]).not.toBeChecked();
});
