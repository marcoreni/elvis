import React, { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

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

export interface TipTapEditorProps {
    /** Current content, as an HTML string. */
    value: string;
    /** Called with the new content, as an HTML string, on every edit. */
    onChange: (html: string) => void;
    className?: string;
    placeholder?: string;
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
    placeholder,
    disabled = false,
}: TipTapEditorProps): JSX.Element {
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Set by onUpdate just before onChange runs; lets the sync effect below
    // tell its own round-trip (value prop changing because *we* just called
    // onChange) apart from an external change to `value` (e.g. content
    // arriving from an API call after mount) that the editor needs to adopt.
    const isInternalChange = useRef(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                link: {
                    openOnClick: false,
                    autolink: false,
                    HTMLAttributes: { target: "_self" },
                },
            }),
        ],
        content: value,
        editable: !disabled,
        onUpdate: ({ editor: currentEditor }) => {
            isInternalChange.current = true;
            onChange(currentEditor.getHTML());
        },
    });

    useEffect(() => {
        if (!editor) {
            return;
        }

        if (isInternalChange.current) {
            isInternalChange.current = false;
            return;
        }

        if (value !== editor.getHTML()) {
            editor.commands.setContent(value || "", { emitUpdate: false });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, editor]);

    useEffect(() => {
        editor?.setEditable(!disabled);
    }, [disabled, editor]);

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
                      canUndo: currentEditor.can().undo(),
                      canRedo: currentEditor.can().redo(),
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
        if (url) {
            editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href: url })
                .run();
        } else {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
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
            <div className="tiptap-editor-toolbar" role="toolbar">
                <select
                    aria-label="Heading level"
                    value={toolbarState.headingLevel}
                    disabled={disabled}
                    onChange={(e) => setHeading(Number(e.target.value))}
                >
                    <option value={0}>Normal</option>
                    {HEADING_LEVELS.map((level) => (
                        <option key={level} value={level}>
                            {`H${level}`}
                        </option>
                    ))}
                </select>

                <button
                    type="button"
                    aria-label="Bold"
                    aria-pressed={toolbarState.bold}
                    disabled={disabled}
                    className={toolbarState.bold ? "is-active" : ""}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                >
                    <i className="fas fa-bold" />
                </button>
                <button
                    type="button"
                    aria-label="Italic"
                    aria-pressed={toolbarState.italic}
                    disabled={disabled}
                    className={toolbarState.italic ? "is-active" : ""}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                    <i className="fas fa-italic" />
                </button>
                <button
                    type="button"
                    aria-label="Underline"
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
                    aria-label="Strikethrough"
                    aria-pressed={toolbarState.strike}
                    disabled={disabled}
                    className={toolbarState.strike ? "is-active" : ""}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                    <i className="fas fa-strikethrough" />
                </button>
                <button
                    type="button"
                    aria-label="Blockquote"
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
                    aria-label="Bullet list"
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
                    aria-label="Ordered list"
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
                        aria-label="Link"
                        aria-pressed={toolbarState.link}
                        disabled={disabled}
                        className={toolbarState.link ? "is-active" : ""}
                        onClick={toggleLinkInput}
                    >
                        <i className="fas fa-link" />
                    </button>
                    <button
                        type="button"
                        aria-label="Unlink"
                        disabled={disabled || !toolbarState.link}
                        onClick={removeLink}
                    >
                        <i className="fas fa-unlink" />
                    </button>

                    {showLinkInput && (
                        <span className="tiptap-editor-link-popover">
                            <input
                                type="text"
                                aria-label="Link URL"
                                placeholder="https://..."
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
                                Apply
                            </button>
                        </span>
                    )}
                </div>

                <div className="tiptap-editor-emoji-group">
                    <button
                        type="button"
                        aria-label="Emoji"
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
                            role="listbox"
                            aria-label="Emoji picker"
                        >
                            {EMOJI_OPTIONS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    aria-label={`Insert ${emoji}`}
                                    onClick={() => insertEmoji(emoji)}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </span>
                    )}
                </div>
            </div>

            <EditorContent
                editor={editor}
                className="tiptap-editor-content"
                aria-placeholder={placeholder}
            />
        </div>
    );
}
