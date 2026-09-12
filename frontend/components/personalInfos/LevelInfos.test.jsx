// Regression test for the `hasKeys` sense/semantics bug (see docs/KnownIssues.md and
// frontend/components/utils/index.tsx). LevelInfos disables the "add level" save button via
// `disabled={!hasKeys(this.state.drafts[seasonId], [...4 keys])}`. The broken TS conversion of
// `hasKeys` was exactly inverted *and* switched from key-presence to value-truthiness, so the
// button was enabled while the draft was empty and disabled once filled in -- the exact opposite
// of the intended behaviour -- and threw on an absent `drafts[seasonId]` where the original
// `_.has` would just return false.
//
// This test drives the real component (not hasKeys directly, which has its own unit tests in
// utils/index.test.ts) end to end: an untouched draft must leave the button disabled, and filling
// in the two fields the UI actually lets you fill (activity_ref_id, evaluation_level_ref_id --
// season_id/user_id are auto-filled by updateDraft's default object) must enable it.

import React from "react";
import { render, fireEvent } from "@testing-library/react";
import "../../i18n";
import LevelInfos from "./LevelInfos";

function baseProps(overrides = {}) {
    return {
        infos: { id: 1, levels: [] },
        seasons: [{ id: 10, label: "2025-2026" }],
        activityRefs: [
            { id: 1, label: "Piano" },
            { id: 2, label: "Guitare" },
        ],
        evaluationLevels: [
            { id: 1, activity_ref_id: 1, label: "Débutant" },
            { id: 2, activity_ref_id: 1, label: "Avancé" },
        ],
        handleRemoveLevel: () => {},
        handleUpdateLevel: () => {},
        handleNewLevel: () => {},
        handleSaveInfos: () => {},
        ...overrides,
    };
}

function getSaveButton() {
    return [...document.querySelectorAll("button")].find((b) =>
        b.querySelector(".fa-check")
    );
}

describe("LevelInfos — new-level save button enabled state", () => {
    test("is disabled while the draft for the season is empty", () => {
        render(<LevelInfos {...baseProps()} />);

        const saveButton = getSaveButton();
        expect(saveButton).not.toBeNull();
        expect(saveButton).toBeDisabled();
    });

    test("is enabled once the draft's required fields are filled in", () => {
        render(<LevelInfos {...baseProps()} />);

        const activitySelect = document.querySelector(
            'select[name="activity_ref_id"]'
        );
        const levelSelect = document.querySelector(
            'select[name="evaluation_level_ref_id"]'
        );

        fireEvent.change(activitySelect, { target: { value: "1" } });
        fireEvent.change(levelSelect, { target: { value: "1" } });

        const saveButton = getSaveButton();
        expect(saveButton).not.toBeDisabled();
    });
});
