// Phase 4c: EditPaymentScheduleOptions swapped its react-draft-wysiwyg `Editor` for
// `TipTapEditor`. `display_text` is plain HTML; saving must POST plain HTML back.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../../i18n";
import EditPaymentScheduleOptions from "./EditPaymentScheduleOptions";

vi.mock("sweetalert2", () => ({
    default: { fire: vi.fn() },
}));
vi.mock("react-toastify", () => ({
    toast: { success: vi.fn() },
}));

// Chainable tools/api stub; the last-registered success callback and the last `.post` call are
// captured so tests can hand-fire the GET response and inspect the save payload.
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
    vi.clearAllMocks();
});

function getEditorContent(container) {
    return container.querySelector(".tiptap-editor-content .ProseMirror");
}

const baseResponse = { data: [], activated: true, index: [] };

test("loads an existing HTML display_text into the editor", async () => {
    const { container } = render(<EditPaymentScheduleOptions />);

    apiState.lastSuccess({
        ...baseResponse,
        display_text: "<p>Already HTML</p>",
    });

    await waitFor(() =>
        expect(getEditorContent(container)).toHaveTextContent("Already HTML")
    );
});

test("saving posts the edited HTML as display_text", async () => {
    const { container } = render(<EditPaymentScheduleOptions />);
    apiState.lastSuccess({
        ...baseResponse,
        display_text: "<p>Existing terms</p>",
    });

    await waitFor(() =>
        expect(getEditorContent(container)).toHaveTextContent("Existing terms")
    );

    // The mount GET's success handler also sets `paymentScheduleOptionsActivated`, which fires
    // its own unrelated `/payment_schedule_options/activated` POST -- reset here so the
    // `waitFor` below actually guards the save POST, not that earlier one.
    apiState.lastPost = null;

    await userEvent.click(
        screen.getByRole("button", {
            name: i18n.t(
                "parameters:payments.scheduleOptions.saveAdditionalInfo"
            ),
        })
    );

    await waitFor(() => expect(apiState.lastPost).not.toBeNull());
    expect(apiState.lastPost.url).toBe(
        "/payment_schedule_options/display_text"
    );
    expect(apiState.lastPost.data.display_text).toContain("Existing terms");
});
