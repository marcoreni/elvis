import React, { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import TipTapEditor from "./TipTapEditor";

// A thin controlled-input wrapper: TipTapEditor's own contract is
// value/onChange (it doesn't manage content state itself), so tests drive it
// the same way a real caller would -- through a parent that re-feeds
// `value` from `onChange`.
function ControlledEditor({
    initialValue = "",
    onChange,
}: {
    initialValue?: string;
    onChange?: (html: string) => void;
}) {
    const [value, setValue] = useState(initialValue);
    return (
        <TipTapEditor
            value={value}
            onChange={(html) => {
                setValue(html);
                onChange?.(html);
            }}
        />
    );
}

function getEditorContent(container: HTMLElement): HTMLElement {
    const el = container.querySelector(".tiptap-editor-content .ProseMirror");
    if (!el) {
        throw new Error("ProseMirror content element not found");
    }
    return el as HTMLElement;
}

describe("TipTapEditor — render", () => {
    test("renders the toolbar buttons and an empty editor", async () => {
        render(<ControlledEditor />);

        expect(screen.getByLabelText("Bold")).toBeInTheDocument();
        expect(screen.getByLabelText("Italic")).toBeInTheDocument();
        expect(screen.getByLabelText("Underline")).toBeInTheDocument();
        expect(screen.getByLabelText("Strikethrough")).toBeInTheDocument();
        expect(screen.getByLabelText("Blockquote")).toBeInTheDocument();
        expect(screen.getByLabelText("Bullet list")).toBeInTheDocument();
        expect(screen.getByLabelText("Ordered list")).toBeInTheDocument();
        expect(screen.getByLabelText("Link")).toBeInTheDocument();
        expect(screen.getByLabelText("Unlink")).toBeInTheDocument();
        expect(screen.getByLabelText("Emoji")).toBeInTheDocument();
        expect(screen.getByLabelText("Heading level")).toBeInTheDocument();
    });

    test("renders existing HTML content", async () => {
        const { container } = render(
            <ControlledEditor initialValue="<p>Hello world</p>" />
        );

        await waitFor(() =>
            expect(getEditorContent(container).textContent).toBe("Hello world")
        );
    });
});

describe("TipTapEditor — emoji insertion drives onChange", () => {
    test("clicking an emoji inserts it and reports the new HTML", async () => {
        const onChange = vi.fn();
        const { container } = render(<ControlledEditor onChange={onChange} />);

        await userEvent.click(screen.getByLabelText("Emoji"));
        await userEvent.click(screen.getByLabelText("Insert 👍"));

        await waitFor(() =>
            expect(getEditorContent(container).textContent).toContain("👍")
        );
        expect(onChange).toHaveBeenCalled();
        expect(onChange.mock.calls.at(-1)?.[0]).toContain("👍");
    });
});

describe("TipTapEditor — block-level toolbar buttons", () => {
    test("Blockquote button toggles the current block in and out of a blockquote", async () => {
        const onChange = vi.fn();
        render(<ControlledEditor onChange={onChange} />);

        await userEvent.click(screen.getByLabelText("Blockquote"));
        await waitFor(() =>
            expect(onChange.mock.calls.at(-1)?.[0]).toContain("<blockquote>")
        );
        expect(screen.getByLabelText("Blockquote")).toHaveAttribute(
            "aria-pressed",
            "true"
        );

        await userEvent.click(screen.getByLabelText("Blockquote"));
        await waitFor(() =>
            expect(onChange.mock.calls.at(-1)?.[0]).not.toContain(
                "<blockquote>"
            )
        );
        expect(screen.getByLabelText("Blockquote")).toHaveAttribute(
            "aria-pressed",
            "false"
        );
    });

    test("Bullet list and Ordered list buttons produce the right list markup", async () => {
        const onChange = vi.fn();
        render(<ControlledEditor onChange={onChange} />);

        await userEvent.click(screen.getByLabelText("Bullet list"));
        await waitFor(() =>
            expect(onChange.mock.calls.at(-1)?.[0]).toContain("<ul>")
        );

        await userEvent.click(screen.getByLabelText("Ordered list"));
        await waitFor(() => {
            const lastHtml = onChange.mock.calls.at(-1)?.[0];
            expect(lastHtml).toContain("<ol>");
            expect(lastHtml).not.toContain("<ul>");
        });
    });

    test("Heading dropdown sets and clears heading levels", async () => {
        const onChange = vi.fn();
        render(<ControlledEditor onChange={onChange} />);

        await userEvent.selectOptions(
            screen.getByLabelText("Heading level"),
            "2"
        );
        await waitFor(() =>
            expect(onChange.mock.calls.at(-1)?.[0]).toContain("<h2>")
        );

        await userEvent.selectOptions(
            screen.getByLabelText("Heading level"),
            "0"
        );
        await waitFor(() =>
            expect(onChange.mock.calls.at(-1)?.[0]).not.toContain("<h2>")
        );
    });
});

describe("TipTapEditor — link insert and remove", () => {
    test("selecting text, applying a link, then removing it round-trips through onChange", async () => {
        const onChange = vi.fn();
        const { container } = render(
            <ControlledEditor
                initialValue="<p>Hello world</p>"
                onChange={onChange}
            />
        );

        await waitFor(() =>
            expect(getEditorContent(container).textContent).toBe("Hello world")
        );

        // Select the whole document via the editor's own select-all keymap
        // binding (Mod-a), handled by ProseMirror's keydown handler directly
        // -- unlike a native text selection, this doesn't depend on jsdom's
        // (very limited) Selection/Range support.
        const content = getEditorContent(container);
        content.focus();
        await userEvent.keyboard("{Control>}a{/Control}");

        expect(screen.getByLabelText("Unlink")).toBeDisabled();

        await userEvent.click(screen.getByLabelText("Link"));
        const urlInput = screen.getByLabelText("Link URL");
        await userEvent.type(urlInput, "https://example.com");
        await userEvent.click(screen.getByText("Apply"));

        await waitFor(() => {
            const lastHtml = onChange.mock.calls.at(-1)?.[0];
            expect(lastHtml).toContain('href="https://example.com"');
            expect(lastHtml).toContain("Hello world");
        });
        expect(screen.getByLabelText("Unlink")).not.toBeDisabled();

        await userEvent.click(screen.getByLabelText("Unlink"));
        await waitFor(() =>
            expect(onChange.mock.calls.at(-1)?.[0]).not.toContain("<a ")
        );
        expect(screen.getByLabelText("Unlink")).toBeDisabled();
    });
});

describe("TipTapEditor — disabled", () => {
    test("disabled makes the editor non-editable and disables toolbar buttons", () => {
        const { container } = render(
            <TipTapEditor value="<p>x</p>" onChange={() => {}} disabled />
        );

        expect(getEditorContent(container)).toHaveAttribute(
            "contenteditable",
            "false"
        );
        expect(screen.getByLabelText("Bold")).toBeDisabled();
    });
});
