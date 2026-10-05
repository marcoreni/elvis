// Phase 4c: ApplicationStepParameters swapped its react-draft-wysiwyg `Editor` for `TipTapEditor`.
// The `Parameter` row it loads from (`display_text`) may still hold OLD Draft.js raw JSON (Phase
// 4d's DB migration hasn't run everywhere yet), so loading must go through `wysiwygToHtml` --
// covered here by (a) a Draft.js-JSON response, (b) an already-migrated plain-HTML response.
// Saving must POST plain HTML, not Draft.js JSON.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../../i18n";
import ApplicationStepParameters from "./ApplicationStepParameters";

vi.mock("sweetalert2", () => ({
    default: { fire: vi.fn() },
}));
vi.mock("react-toastify", () => ({
    toast: { success: vi.fn() },
}));

// Chainable tools/api stub; the last-registered success/error callbacks and the last `.post`
// call are captured so tests can hand-fire the GET response and inspect the save payload.
const apiState = vi.hoisted(() => ({
    lastSuccess: null,
    lastPost: null,
}));
vi.mock("../../../tools/api", () => ({
    set: () => {
        const c = {};
        c.success = (fn) => {
            apiState.lastSuccess = fn;
            return c;
        };
        c.error = () => c;
        c.before = () => c;
        c.useLoading = () => c;
        c.get = () => c;
        c.post = (url, data) => {
            apiState.lastPost = { url, data };
            return c;
        };
        c.put = () => c;
        c.del = () => c;
        return c;
    },
}));

afterEach(async () => {
    await i18n.changeLanguage("fr");
    apiState.lastSuccess = null;
    apiState.lastPost = null;
});

function getEditorContent(container) {
    return container.querySelector(".tiptap-editor-content .ProseMirror");
}

test("loads a Draft.js-JSON display_text and renders it as HTML in the editor", async () => {
    const { container } = render(
        <ApplicationStepParameters parameter_label="x" desc="desc" />
    );

    const draftRawJson = JSON.stringify({
        blocks: [
            {
                key: "a",
                text: "Legacy content",
                type: "unstyled",
                depth: 0,
                inlineStyleRanges: [],
                entityRanges: [],
                data: {},
            },
        ],
        entityMap: {},
    });
    apiState.lastSuccess({ activated: true, display_text: draftRawJson });

    await waitFor(() =>
        expect(getEditorContent(container)).toHaveTextContent("Legacy content")
    );
});

test("loads an already-migrated plain-HTML display_text correctly", async () => {
    const { container } = render(
        <ApplicationStepParameters parameter_label="x" desc="desc" />
    );

    apiState.lastSuccess({
        activated: true,
        display_text: "<p>Already HTML</p>",
    });

    await waitFor(() =>
        expect(getEditorContent(container)).toHaveTextContent("Already HTML")
    );
});

test("saving posts plain HTML (not Draft.js JSON) as display_text, even when loaded from legacy Draft.js JSON", async () => {
    const { container } = render(
        <ApplicationStepParameters parameter_label="x" desc="desc" />
    );
    const draftRawJson = JSON.stringify({
        blocks: [
            {
                key: "a",
                text: "Legacy content",
                type: "unstyled",
                depth: 0,
                inlineStyleRanges: [],
                entityRanges: [],
                data: {},
            },
        ],
        entityMap: {},
    });
    apiState.lastSuccess({ activated: true, display_text: draftRawJson });

    await waitFor(() =>
        expect(getEditorContent(container)).toHaveTextContent("Legacy content")
    );

    await userEvent.click(
        screen.getByRole("button", { name: i18n.t("common:actions.save") })
    );

    await waitFor(() => expect(apiState.lastPost).not.toBeNull());
    expect(apiState.lastPost.url).toBe(
        "activity_application_parameters/change_display_text_param"
    );
    expect(apiState.lastPost.data.display_text).toContain("Legacy content");
    expect(apiState.lastPost.data.display_text).not.toMatch(/^\s*\{/);
});
