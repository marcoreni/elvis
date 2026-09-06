// Regression coverage for Bug 2 (docs/KnownIssues.md): ContactForm.jsx and
// WizardContactForm.jsx both render `{MESSAGES[meta.error]}` in the family-link
// relationship <select>'s error <p> but never imported `MESSAGES`. When that field was
// touched and left empty (`validate={required}` -> "err_required"), the re-render threw
// `ReferenceError: MESSAGES is not defined`. Both files now `import { MESSAGES } from
// "../../tools/constants"`.
//
// The two components are near-identical along this path, so one shared render helper +
// describe.each covers both. Heavy children (GeneralInfos / ContactInfos /
// InlineYesNoRadio) and tools/api are mocked; react-final-form is kept real so the
// field-level validation and `meta.touched` flip actually happen. Locale is driven
// through the frontend/i18n singleton (MESSAGES is a live binding re-read on
// languageChanged); afterEach restores "fr".

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import i18n from "../../i18n";
import ContactForm from "./ContactForm";
import WizardContactForm from "./WizardContactForm";

vi.mock("./GeneralInfos", () => ({
    default: () => <div data-testid="general-infos" />,
}));
vi.mock("./ContactInfos", () => ({
    default: () => <div data-testid="contact-infos" />,
}));
vi.mock("../common/InlineYesNoRadio", () => ({
    default: () => <div data-testid="yes-no" />,
}));
vi.mock("../../tools/api", () => ({
    set: () => ({ success: () => ({ post: () => undefined }) }),
}));

afterEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("fr");
});

function baseProps() {
    return {
        // id present -> constructor sets isUserSearchOver = true, so the family-link
        // section renders without going through the user-search flow.
        initialValues: { id: 1 },
        // non-admin -> `validate={!current_user.is_admin && required}` becomes `required`
        current_user: { is_admin: false },
        user_linked: {
            first_name: "Jean",
            last_name: "Dupont",
            is_admin: false,
            family_links_with_user: [],
        },
        onSubmit: vi.fn(),
        onClose: vi.fn(),
    };
}

describe.each([
    ["ContactForm", ContactForm],
    ["WizardContactForm", WizardContactForm],
])(
    "%s — family-link required error renders instead of crashing (Bug 2)",
    (name, Component) => {
        test("the family-link section mounts (isUserSearchOver path)", async () => {
            await i18n.changeLanguage("fr");
            const { container } = render(<Component {...baseProps()} />);

            expect(screen.getByText("Lien familial")).toBeInTheDocument();
            expect(container.querySelector("select.form-control")).toBeTruthy();
            // no error shown before the field is touched
            expect(container.querySelector("p.help-block")).toBeNull();
        });

        test("fr: blurring the empty <select> shows the translated errRequired copy, no ReferenceError", async () => {
            await i18n.changeLanguage("fr");
            const { container } = render(<Component {...baseProps()} />);

            const select = container.querySelector("select.form-control");
            fireEvent.blur(select);

            const help = await screen.findByText(
                "Cette information est requise."
            );
            expect(help).toBeInTheDocument();
            expect(help).toHaveClass("help-block");
        });

        test("en: the same path renders the English errRequired copy", async () => {
            await i18n.changeLanguage("en");
            const { container } = render(<Component {...baseProps()} />);

            const select = container.querySelector("select.form-control");
            fireEvent.blur(select);

            const help = await screen.findByText(
                "This information is required."
            );
            expect(help).toBeInTheDocument();
            expect(help).toHaveClass("help-block");
        });

        test("selecting a value clears the error", async () => {
            await i18n.changeLanguage("fr");
            const { container } = render(<Component {...baseProps()} />);

            const select = container.querySelector("select.form-control");
            fireEvent.blur(select);
            expect(
                await screen.findByText("Cette information est requise.")
            ).toBeInTheDocument();

            fireEvent.change(select, { target: { value: "mère" } });
            expect(
                screen.queryByText("Cette information est requise.")
            ).toBeNull();
        });
    }
);
