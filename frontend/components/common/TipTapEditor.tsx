import React, { useEffect, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { useTranslation } from "react-i18next";

// A handful of commonly used emojis. TipTap's own emoji picker
// (`@tiptap-pro/extension-emoji`) is a paid Pro extension, and the only free
// community alternative on npm has been unpublished -- so rather than pull in
// a new, generic (and sizeable, ~400KB+) emoji-picker dependency for a single
// toolbar button, this is a tiny native picker: a button that toggles a grid
// of unicode characters, inserted as plain text.
const EMOJI_OPTIONS = [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "🙂",
    "😉",
    "😊",
    "😍",
    "🤔",
    "😐",
    "😮",
    "😢",
    "😡",
    "👍",
    "👎",
    "👏",
    "🙏",
    "🎉",
    "❤️",
    "🔥",
    "✅",
    "⚠️",
    "📌",
    "📅",
    "💰",
    "🎵",
    "⭐",
    "☀️",
    "❓",
];

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

// draftjs-to-html (used by RichTextViewer to render legacy Draft.js content,
// and still relevant here because this editor must round-trip content a user
// opens for editing) serializes Draft's UNDERLINE style as `<ins>`, not
// `<u>`. @tiptap/extension-underline's default parseHTML only recognizes
// `<u>`/`text-decoration: underline`, so without this it would silently
// drop every underline the first time such content is opened and saved.
const InsCompatibleUnderline = Underline.extend({
    parseHTML() {
        return [...(this.parent?.() ?? []), { tag: "ins" }];
    },
});

export interface TipTapEditorProps {
    /** Current content, as an HTML string. */
    value: string;
    /** Called with the new content, as an HTML string, on every edit. */
    onChange: (html: string) => void;
    className?: string;
    disabled?: boolean;
}

/**
 * Reusable rich-text editor built on TipTap. Value/onChange contract is a
 * plain HTML string -- callers don't need to know anything about TipTap's
 * (or, previously, Draft.js's) internal document model.
 */
export default function TipTapEditor({
    value,
    onChange,
    className,
    disabled = false,
}: TipTapEditorProps): JSX.Element {
    const { t } = useTranslation("common");
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                underline: false,
                link: {
                    openOnClick: false,
                    autolink: false,
                    HTMLAttributes: { target: "_self" },
                },
            }),
            InsCompatibleUnderline,
        ],
        content: value,
        editable: !disabled,
        onUpdate: ({ editor: currentEditor }) => {
            onChange(currentEditor.getHTML());
        },
    });

    useEffect(() => {
        if (!editor) {
            return;
        }

        // Covers both "this is just our own onUpdate's `onChange` echoing
        // back unchanged" (editor.getHTML() already equals it) and a
        // genuine external change (a reload, a discard action, content
        // arriving late from an API call) -- either way, only touch the
        // document when `value` actually differs from what's currently in
        // it, so a real update is never mistaken for an echo (which a
        // "was that us?" flag, comparing against the last string *we*
        // emitted rather than the editor's actual current content, could
        // do: e.g. edit produces A, a parent shows something else (B),
        // then a later external update legitimately brings it back to A --
        // that's new content to adopt, not an echo to skip).
        if (value !== editor.getHTML()) {
            editor.commands.setContent(value || "", { emitUpdate: false });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, editor]);

    useEffect(() => {
        // Explicit `false`: setEditable's default `emitUpdate` is `true`,
        // which would otherwise fire a synthetic onUpdate (and so onChange)
        // the moment the editor mounts, before any real user edit.
        editor?.setEditable(!disabled, false);
    }, [disabled, editor]);

    // Document-level (not just the popover's own onKeyDown, like the link
    // popover uses) because focus stays on the toggle button -- outside the
    // popover -- right after opening it by clicking that button, so a
    // keydown there wouldn't otherwise bubble through the popover.
    useEffect(() => {
        if (!showEmojiPicker) {
            return;
        }
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [showEmojiPicker]);

    const toolbarState = useEditorState({
        editor,
        selector: ({ editor: currentEditor }) =>
            currentEditor
                ? {
                      bold: currentEditor.isActive("bold"),
                      italic: currentEditor.isActive("italic"),
                      underline: currentEditor.isActive("underline"),
                      strike: currentEditor.isActive("strike"),
                      blockquote: currentEditor.isActive("blockquote"),
                      bulletList: currentEditor.isActive("bulletList"),
                      orderedList: currentEditor.isActive("orderedList"),
                      link: currentEditor.isActive("link"),
                      headingLevel:
                          HEADING_LEVELS.find((level) =>
                              currentEditor.isActive("heading", { level })
                          ) ?? 0,
                  }
                : null,
    });

    if (!editor || !toolbarState) {
        return <div className={className} />;
    }

    const toggleLinkInput = () => {
        if (!showLinkInput) {
            const currentHref = editor.getAttributes("link").href as
                string | undefined;
            setLinkUrl(currentHref ?? "");
        }
        setShowEmojiPicker(false);
        setShowLinkInput((shown) => !shown);
    };

    const applyLink = () => {
        const url = linkUrl.trim();
        if (!url) {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            setShowLinkInput(false);
            return;
        }

        if (editor.state.selection.empty && !editor.isActive("link")) {
            // Nothing selected and no existing link at the caret:
            // extendMarkRange has no mark range to extend, so setLink alone
            // would silently no-op. Insert the URL as plain text, select
            // what was just inserted, then mark that selection as a link
            // through the same setLink() call the other branch uses below
            // -- rather than building the link mark by hand -- so this
            // path gets setLink's own URL validation too, instead of
            // silently inserting a dead/unvalidated link.
            const { from } = editor.state.selection;
            editor
                .chain()
                .focus()
                .insertContent(url)
                .setTextSelection({ from, to: from + url.length })
                .extendMarkRange("link")
                .setLink({ href: url })
                .run();
        } else {
            editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href: url })
                .run();
        }
        setShowLinkInput(false);
    };

    const removeLink = () => {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        setShowLinkInput(false);
    };

    const insertEmoji = (emoji: string) => {
        editor.chain().focus().insertContent(emoji).run();
        setShowEmojiPicker(false);
    };

    const setHeading = (level: number) => {
        if (level === 0) {
            editor.chain().focus().setParagraph().run();
        } else {
            editor
                .chain()
                .focus()
                .toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 })
                .run();
        }
    };

    return (
        <div className={`tiptap-editor ${className ?? ""}`}>
            <div
                className="tiptap-editor-toolbar"
                role="toolbar"
                aria-label={t("richTextEditor.toolbarLabel")}
            >
                <select
                    aria-label={t("richTextEditor.headingLevelLabel")}
                    value={toolbarState.headingLevel}
                    disabled={disabled}
                    onChange={(e) => setHeading(Number(e.target.value))}
                >
                    <option value={0}>{t("richTextEditor.normal")}</option>
                    {HEADING_LEVELS.map((level) => (
                        <option key={level} value={level}>
                            {`H${level}`}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    aria-label={t("richTextEditor.bold")}
                    aria-pressed={toolbarState.bold}
                    disabled={disabled}
                    className={toolbarState.bold ? "is-active" : ""}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                >
                    <i className="fas fa-bold" />
                </button>
                <button
                    type="button"
                    aria-label={t("richTextEditor.italic")}
                    aria-pressed={toolbarState.italic}
                    disabled={disabled}
                    className={toolbarState.italic ? "is-active" : ""}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                    <i className="fas fa-italic" />
                </button>
                <button
                    type="button"
                    aria-label={t("richTextEditor.underline")}
                    aria-pressed={toolbarState.underline}
                    disabled={disabled}
                    className={toolbarState.underline ? "is-active" : ""}
                    onClick={() =>
                        editor.chain().focus().toggleUnderline().run()
                    }
                >
                    <i className="fas fa-underline" />
                </button>
                <button
                    type="button"
                    aria-label={t("richTextEditor.strikethrough")}
                    aria-pressed={toolbarState.strike}
                    disabled={disabled}
                    className={toolbarState.strike ? "is-active" : ""}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                    <i className="fas fa-strikethrough" />
                </button>
                <button
                    type="button"
                    aria-label={t("richTextEditor.blockquote")}
                    aria-pressed={toolbarState.blockquote}
                    disabled={disabled}
                    className={toolbarState.blockquote ? "is-active" : ""}
                    onClick={() =>
                        editor.chain().focus().toggleBlockquote().run()
                    }
                >
                    <i className="fas fa-quote-right" />
                </button>
                <button
                    type="button"
                    aria-label={t("richTextEditor.bulletList")}
                    aria-pressed={toolbarState.bulletList}
                    disabled={disabled}
                    className={toolbarState.bulletList ? "is-active" : ""}
                    onClick={() =>
                        editor.chain().focus().toggleBulletList().run()
                    }
                >
                    <i className="fas fa-list-ul" />
                </button>
                <button
                    type="button"
                    aria-label={t("richTextEditor.orderedList")}
                    aria-pressed={toolbarState.orderedList}
                    disabled={disabled}
                    className={toolbarState.orderedList ? "is-active" : ""}
                    onClick={() =>
                        editor.chain().focus().toggleOrderedList().run()
                    }
                >
                    <i className="fas fa-list-ol" />
                </button>

                <div className="tiptap-editor-link-group">
                    <button
                        type="button"
                        aria-label={t("richTextEditor.link")}
                        aria-pressed={toolbarState.link}
                        disabled={disabled}
                        className={toolbarState.link ? "is-active" : ""}
                        onClick={toggleLinkInput}
                    >
                        <i className="fas fa-link" />
                    </button>
                    <button
                        type="button"
                        aria-label={t("richTextEditor.unlink")}
                        disabled={disabled || !toolbarState.link}
                        onClick={removeLink}
                    >
                        <i className="fas fa-unlink" />
                    </button>

                    {showLinkInput && (
                        <span className="tiptap-editor-link-popover">
                            <input
                                type="text"
                                aria-label={t("richTextEditor.linkUrlLabel")}
                                placeholder={t(
                                    "richTextEditor.linkUrlPlaceholder"
                                )}
                                value={linkUrl}
                                autoFocus
                                onChange={(e) => setLinkUrl(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        applyLink();
                                    } else if (e.key === "Escape") {
                                        setShowLinkInput(false);
                                    }
                                }}
                            />
                            <button type="button" onClick={applyLink}>
                                {t("richTextEditor.apply")}
                            </button>
                        </span>
                    )}
                </div>

                <div className="tiptap-editor-emoji-group">
                    <button
                        type="button"
                        aria-label={t("richTextEditor.emoji")}
                        disabled={disabled}
                        onClick={() => {
                            setShowLinkInput(false);
                            setShowEmojiPicker((shown) => !shown);
                        }}
                    >
                        <i className="fas fa-smile" />
                    </button>

                    {showEmojiPicker && (
                        <span
                            className="tiptap-editor-emoji-popover"
                            role="group"
                            aria-label={t("richTextEditor.emojiPickerLabel")}
                        >
                            {EMOJI_OPTIONS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    disabled={disabled}
                                    aria-label={t(
                                        "richTextEditor.insertEmoji",
                                        {
                                            emoji,
                                        }
                                    )}
                                    onClick={() => insertEmoji(emoji)}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </span>
                    )}
                </div>
            </div>

            <EditorContent editor={editor} className="tiptap-editor-content" />
        </div>
    );
}
