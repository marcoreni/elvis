import React, { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import i18n from "../../i18n";
import TipTapEditor from "./TipTapEditor";

// Labels come from useTranslation("common") (richTextEditor.*), not hardcoded English -- compute
// expected strings from the same resources rather than re-typing translated text here.
const t = i18n.getFixedT("en", "common");

beforeEach(async () => {
    await i18n.changeLanguage("en");
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

// A thin controlled-input wrapper: TipTapEditor's own contract is
// value/onChange (it doesn't manage content state itself), so most tests
// drive it the same way a real caller would -- through a parent that
// re-feeds `value` from `onChange`.
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

// Selects the whole document via the editor's own select-all keymap binding
// (Mod-a), handled by ProseMirror's keydown handler directly -- unlike a
// native text selection, this doesn't depend on jsdom's (very limited)
// Selection/Range support.
async function selectAll(content: HTMLElement) {
    content.focus();
    await userEvent.keyboard("{Control>}a{/Control}");
}

// Places the native DOM selection inside a given node via the (limited but
// sufficient for this) Selection/Range API directly, then lets ProseMirror
// pick it up through its own selection-change handling -- used for
// indent/outdent, which (unlike selectAll's Mod-a) need the cursor inside a
// *specific* list item rather than the whole document selected.
function placeCursorIn(el: Element) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
}

describe("TipTapEditor — render", () => {
    test("renders the toolbar buttons and an empty editor", async () => {
        render(<ControlledEditor />);

        expect(
            screen.getByLabelText(t("richTextEditor.bold"))
        ).toBeInTheDocument();
        expect(
            screen.getByLabelText(t("richTextEditor.italic"))
        ).toBeInTheDocument();
        expect(
            screen.getByLabelText(t("richTextEditor.underline"))
        ).toBeInTheDocument();
        expect(
            screen.getByLabelText(t("richTextEditor.strikethrough"))
        ).toBeInTheDocument();
        expect(
            screen.getByLabelText(t("richTextEditor.blockquote"))
        ).toBeInTheDocument();
        expect(
            screen.getByLabelText(t("richTextEditor.bulletList"))
        ).toBeInTheDocument();
        expect(
            screen.getByLabelText(t("richTextEditor.orderedList"))
        ).toBeInTheDocument();
        expect(
            screen.getByLabelText(t("richTextEditor.link"))
        ).toBeInTheDocument();
        expect(
            screen.getByLabelText(t("richTextEditor.unlink"))
        ).toBeInTheDocument();
        expect(
            screen.getByLabelText(t("richTextEditor.emoji"))
        ).toBeInTheDocument();
        expect(
            screen.getByLabelText(t("richTextEditor.headingLevelLabel"))
        ).toBeInTheDocument();
        expect(
            screen.getByRole("toolbar", {
                name: t("richTextEditor.toolbarLabel"),
            })
        ).toBeInTheDocument();
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

describe("TipTapEditor — external value changes (not round-tripped through onChange)", () => {
    test("adopts a value change coming from outside after mount", async () => {
        const onChange = vi.fn();
        const { container, rerender } = render(
            <TipTapEditor value="<p>Initial</p>" onChange={onChange} />
        );

        await waitFor(() =>
            expect(getEditorContent(container).textContent).toBe("Initial")
        );

        // A genuinely external change: re-rendered with a new `value` that
        // did NOT come from this editor's own onChange (e.g. a reload, a
        // discard-changes action, or content arriving late from an API
        // call) -- this is exactly the path a spurious onUpdate at mount
        // used to break permanently.
        rerender(
            <TipTapEditor
                value="<p>Replaced from outside</p>"
                onChange={onChange}
            />
        );

        await waitFor(() =>
            expect(getEditorContent(container).textContent).toBe(
                "Replaced from outside"
            )
        );
    });

    test("mounting does not fire a spurious onChange", async () => {
        const onChange = vi.fn();
        render(
            <TipTapEditor value="<p>Steady state</p>" onChange={onChange} />
        );

        // Give effects (setEditable, the sync effect) a chance to run.
        await waitFor(() => {});
        expect(onChange).not.toHaveBeenCalled();
    });

    test("re-adopts a value it previously emitted, after the parent has since shown something else (not mistaken for echoing its own onChange)", async () => {
        // A ref tracking "the last HTML we emitted" (an earlier version of
        // this component had one) would wrongly treat this as an echo of
        // our own onUpdate and skip updating -- even though the editor's
        // *actual current* content has since moved on to something else
        // via an external value change in between. Comparing against the
        // editor's real current content (not a remembered string) is what
        // this test exercises.
        const onChange = vi.fn();
        const { container, rerender } = render(
            <TipTapEditor value="" onChange={onChange} />
        );

        // 1. A real edit produces content "A" through this editor's own
        // onUpdate -- not an external change.
        await userEvent.click(
            screen.getByLabelText(t("richTextEditor.blockquote"))
        );
        const htmlA = onChange.mock.calls.at(-1)?.[0] as string;
        expect(htmlA).toContain("<blockquote>");

        // 2. The parent independently shows something else ("B"),
        // unrelated to that edit -- a genuine external change.
        rerender(<TipTapEditor value="<p>B</p>" onChange={onChange} />);
        await waitFor(() =>
            expect(getEditorContent(container).textContent).toBe("B")
        );

        // 3. A later external update legitimately brings the value back to
        // "A" (e.g. an undo, or the server echoing back a previously-saved
        // value) -- the editor must adopt it, not silently keep showing "B".
        rerender(<TipTapEditor value={htmlA} onChange={onChange} />);
        await waitFor(() =>
            expect(
                getEditorContent(container).querySelector("blockquote")
            ).not.toBeNull()
        );
    });
});

describe("TipTapEditor — emoji insertion drives onChange", () => {
    test("clicking an emoji inserts it and reports the new HTML", async () => {
        const onChange = vi.fn();
        const { container } = render(<ControlledEditor onChange={onChange} />);

        await userEvent.click(screen.getByLabelText(t("richTextEditor.emoji")));
        await userEvent.click(
            screen.getByLabelText(
                t("richTextEditor.insertEmoji", { emoji: "👍" })
            )
        );

        await waitFor(() =>
            expect(getEditorContent(container).textContent).toContain("👍")
        );
        expect(onChange).toHaveBeenCalled();
        expect(onChange.mock.calls.at(-1)?.[0]).toContain("👍");
    });

    test("Escape closes the emoji popover", async () => {
        render(<ControlledEditor />);

        await userEvent.click(screen.getByLabelText(t("richTextEditor.emoji")));
        const emojiButton = screen.getByLabelText(
            t("richTextEditor.insertEmoji", { emoji: "👍" })
        );
        expect(emojiButton).toBeInTheDocument();

        await userEvent.keyboard("{Escape}");

        await waitFor(() =>
            expect(
                screen.queryByLabelText(
                    t("richTextEditor.insertEmoji", { emoji: "👍" })
                )
            ).not.toBeInTheDocument()
        );
    });
});

describe("TipTapEditor — mark toggle buttons produce real markup", () => {
    test("Bold wraps the selected text in <strong> and back out again", async () => {
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
        await selectAll(getEditorContent(container));

        await userEvent.click(screen.getByLabelText(t("richTextEditor.bold")));
        await waitFor(() =>
            expect(onChange.mock.calls.at(-1)?.[0]).toContain(
                "<strong>Hello world</strong>"
            )
        );
        expect(screen.getByLabelText(t("richTextEditor.bold"))).toHaveAttribute(
            "aria-pressed",
            "true"
        );

        await userEvent.click(screen.getByLabelText(t("richTextEditor.bold")));
        await waitFor(() =>
            expect(onChange.mock.calls.at(-1)?.[0]).not.toContain("<strong>")
        );
    });

    test("Underline and Strikethrough toggle their own tags", async () => {
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
        await selectAll(getEditorContent(container));

        await userEvent.click(
            screen.getByLabelText(t("richTextEditor.underline"))
        );
        await waitFor(() =>
            expect(onChange.mock.calls.at(-1)?.[0]).toContain(
                "<u>Hello world</u>"
            )
        );

        await userEvent.click(
            screen.getByLabelText(t("richTextEditor.strikethrough"))
        );
        await waitFor(() =>
            expect(onChange.mock.calls.at(-1)?.[0]).toContain("<s>")
        );
    });
});

describe("TipTapEditor — block-level toolbar buttons", () => {
    test("Blockquote button toggles the current block in and out of a blockquote", async () => {
        const onChange = vi.fn();
        render(<ControlledEditor onChange={onChange} />);

        await userEvent.click(
            screen.getByLabelText(t("richTextEditor.blockquote"))
        );
        await waitFor(() =>
            expect(onChange.mock.calls.at(-1)?.[0]).toContain("<blockquote>")
        );
        expect(
            screen.getByLabelText(t("richTextEditor.blockquote"))
        ).toHaveAttribute("aria-pressed", "true");

        await userEvent.click(
            screen.getByLabelText(t("richTextEditor.blockquote"))
        );
        await waitFor(() =>
            expect(onChange.mock.calls.at(-1)?.[0]).not.toContain(
                "<blockquote>"
            )
        );
        expect(
            screen.getByLabelText(t("richTextEditor.blockquote"))
        ).toHaveAttribute("aria-pressed", "false");
    });

    test("Bullet list and Ordered list buttons produce the right list markup", async () => {
        const onChange = vi.fn();
        render(<ControlledEditor onChange={onChange} />);

        await userEvent.click(
            screen.getByLabelText(t("richTextEditor.bulletList"))
        );
        await waitFor(() =>
            expect(onChange.mock.calls.at(-1)?.[0]).toContain("<ul>")
        );

        await userEvent.click(
            screen.getByLabelText(t("richTextEditor.orderedList"))
        );
        await waitFor(() => {
            const lastHtml = onChange.mock.calls.at(-1)?.[0];
            expect(lastHtml).toContain("<ol>");
            expect(lastHtml).not.toContain("<ul>");
        });
    });

    test("Indent/outdent buttons are disabled outside a list, and when there's no sibling to act on", async () => {
        render(<ControlledEditor />);

        // Not inside any list yet.
        expect(
            screen.getByLabelText(t("richTextEditor.indent"))
        ).toBeDisabled();
        expect(
            screen.getByLabelText(t("richTextEditor.outdent"))
        ).toBeDisabled();

        await userEvent.click(
            screen.getByLabelText(t("richTextEditor.bulletList"))
        );

        // A lone top-level item has no preceding sibling to nest under
        // (sinkListItem stays disabled), but lifting it back out of the
        // list -- dissolving the list -- doesn't need one.
        expect(
            screen.getByLabelText(t("richTextEditor.indent"))
        ).toBeDisabled();
        expect(
            screen.getByLabelText(t("richTextEditor.outdent"))
        ).not.toBeDisabled();
    });

    test("Indent button nests the current list item under its preceding sibling, outdent reverses it", async () => {
        const onChange = vi.fn();
        const { container } = render(
            <ControlledEditor
                initialValue="<ul><li>One</li><li>Two</li></ul>"
                onChange={onChange}
            />
        );
        await waitFor(() =>
            expect(getEditorContent(container).textContent).toBe("OneTwo")
        );

        // Cursor in the SECOND item: sinking it nests it as a child of the
        // first (there's nothing to indent the first item itself under).
        const secondItem = Array.from(
            getEditorContent(container).querySelectorAll("li")
        ).find((li) => li.textContent === "Two") as HTMLElement;
        placeCursorIn(secondItem);

        const indentButton = screen.getByLabelText(t("richTextEditor.indent"));
        await waitFor(() => expect(indentButton).not.toBeDisabled());
        await userEvent.click(indentButton);

        await waitFor(() =>
            expect(
                getEditorContent(container).querySelector("li > ul li")
            ).toHaveTextContent("Two")
        );
        expect(onChange.mock.calls.at(-1)?.[0]).toContain(
            "<li><p>One</p><ul><li><p>Two</p></li></ul></li>"
        );

        const outdentButton = screen.getByLabelText(
            t("richTextEditor.outdent")
        );
        await waitFor(() => expect(outdentButton).not.toBeDisabled());
        await userEvent.click(outdentButton);

        await waitFor(() =>
            expect(
                getEditorContent(container).querySelector("li > ul")
            ).toBeNull()
        );
        expect(onChange.mock.calls.at(-1)?.[0]).toContain(
            "<ul><li><p>One</p></li><li><p>Two</p></li></ul>"
        );
    });

    test("Heading dropdown sets and clears heading levels", async () => {
        const onChange = vi.fn();
        render(<ControlledEditor onChange={onChange} />);

        await userEvent.selectOptions(
            screen.getByLabelText(t("richTextEditor.headingLevelLabel")),
            "2"
        );
        await waitFor(() =>
            expect(onChange.mock.calls.at(-1)?.[0]).toContain("<h2>")
        );

        await userEvent.selectOptions(
            screen.getByLabelText(t("richTextEditor.headingLevelLabel")),
            "0"
        );
        await waitFor(() =>
            expect(onChange.mock.calls.at(-1)?.[0]).not.toContain("<h2>")
        );
    });
});

describe("TipTapEditor — <ins> is recognized as underline (draftjs-to-html's serialization)", () => {
    test("loading <ins> content activates the Underline button, and saving keeps it as <u>", async () => {
        const onChange = vi.fn();
        const { container } = render(
            <ControlledEditor
                initialValue="<p><ins>text</ins></p>"
                onChange={onChange}
            />
        );

        await waitFor(() =>
            expect(getEditorContent(container).textContent).toBe("text")
        );
        await selectAll(getEditorContent(container));

        expect(
            screen.getByLabelText(t("richTextEditor.underline"))
        ).toHaveAttribute("aria-pressed", "true");

        // Force a save (toggling Bold on then off leaves the text itself
        // unchanged but exercises onUpdate/getHTML) and check the underline
        // survived TipTap's own parse/serialize round-trip.
        await userEvent.click(screen.getByLabelText(t("richTextEditor.bold")));
        await userEvent.click(screen.getByLabelText(t("richTextEditor.bold")));

        await waitFor(() =>
            expect(onChange.mock.calls.at(-1)?.[0]).toContain("<u>text</u>")
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
        await selectAll(getEditorContent(container));

        expect(
            screen.getByLabelText(t("richTextEditor.unlink"))
        ).toBeDisabled();

        await userEvent.click(screen.getByLabelText(t("richTextEditor.link")));
        const urlInput = screen.getByLabelText(
            t("richTextEditor.linkUrlLabel")
        );
        await userEvent.type(urlInput, "https://example.com");
        await userEvent.click(screen.getByText(t("richTextEditor.apply")));

        await waitFor(() => {
            const lastHtml = onChange.mock.calls.at(-1)?.[0];
            expect(lastHtml).toContain('href="https://example.com"');
            expect(lastHtml).toContain("Hello world");
        });
        expect(
            screen.getByLabelText(t("richTextEditor.unlink"))
        ).not.toBeDisabled();

        await userEvent.click(
            screen.getByLabelText(t("richTextEditor.unlink"))
        );
        await waitFor(() =>
            expect(onChange.mock.calls.at(-1)?.[0]).not.toContain("<a ")
        );
        expect(
            screen.getByLabelText(t("richTextEditor.unlink"))
        ).toBeDisabled();
    });

    test("applying a link with nothing selected inserts the URL as the link's own text, instead of silently doing nothing", async () => {
        const onChange = vi.fn();
        render(<ControlledEditor onChange={onChange} />);

        await userEvent.click(screen.getByLabelText(t("richTextEditor.link")));
        const urlInput = screen.getByLabelText(
            t("richTextEditor.linkUrlLabel")
        );
        await userEvent.type(urlInput, "https://example.com");
        await userEvent.click(screen.getByText(t("richTextEditor.apply")));

        await waitFor(() => {
            const lastHtml = onChange.mock.calls.at(-1)?.[0];
            expect(lastHtml).toContain('href="https://example.com"');
            expect(lastHtml).toContain(">https://example.com<");
        });
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
        expect(screen.getByLabelText(t("richTextEditor.bold"))).toBeDisabled();
    });
});
