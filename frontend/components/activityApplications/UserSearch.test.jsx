// i18n extraction test — i18n-06 "activities" domain, lot 3b (`activityApplications` namespace).
//
// UserSearch is a StepZilla step: a plain `React.PureComponent` (NOT wrapped in
// withTranslation, so StepZilla still wires its `isValidated()` hook). Its strings come from a
// module-level `const T = (k, o) => i18n.t(`activityApplications:${k}`, o)` helper, plus one
// `<Trans>` for the "otherwise create a new profile" line.
//
// The child `../common/Input` is stubbed to render just its `label`; `../userForm/NewStudentForm`,
// `react-modal`, `sweetalert2`, `react-toastify` and `../../tools/api` are stubbed so the mount is
// inert. The "no profile found" conditional block is driven by hand via the instance ref
// (`setState({ usernotSearched: false, possibleMatches: [] })`) rather than through the debounced
// search, so the assertions never touch `handleChange` / the bare `debounce` global.

import React from "react";
import {render, screen, act} from "@testing-library/react";
import _ from "lodash";
import {toast} from "react-toastify";
import i18n from "../../i18n";
import UserSearch from "./UserSearch";

// UserSearch reads the lodash global `_` in render (`_.map(possibleMatches, …)`); it never
// imports it (webpack exposes it as a ProvidePlugin global on real pages). Expose it here.
global._ = _;

vi.mock("../common/Input", () => ({
    default: ({label}) => <div data-testid="input-stub">{label}</div>,
}));
vi.mock("../userForm/NewStudentForm", () => ({default: () => null}));
vi.mock("react-modal", () => ({default: () => null}));
vi.mock("sweetalert2", () => ({default: vi.fn()}));
vi.mock("react-toastify", () => ({
    toast: Object.assign(vi.fn(), {error: vi.fn()}),
}));
vi.mock("../../tools/api", () => {
    const chain = {
        before: () => chain,
        useLoading: () => chain,
        success: () => chain,
        error: () => chain,
        post: vi.fn(() => Promise.resolve()),
    };
    return {set: () => chain};
});

const props = {
    user: {is_admin: true},
    season: {id: 1},
    onSelect: () => {},
};

afterEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("fr");
});

describe("UserSearch — StepZilla step shape", () => {
    test("is a plain class with isValidated and no withTranslation wrapper", () => {
        expect(UserSearch.prototype instanceof React.Component).toBe(true);
        expect(typeof UserSearch.prototype.isValidated).toBe("function");
        expect(UserSearch.WrappedComponent).toBeUndefined();
    });
});

describe("UserSearch — always-visible copy", () => {
    test("renders the French title and the two Input labels", async () => {
        await i18n.changeLanguage("fr");
        render(<UserSearch {...props} />);

        expect(screen.getByText("Chercher un utilisateur")).toBeInTheDocument();
        expect(screen.getByText("Nom")).toBeInTheDocument();
        expect(screen.getByText("Prénom")).toBeInTheDocument();
    });

    test("renders the English title and Input labels after switching to en", async () => {
        await i18n.changeLanguage("en");
        render(<UserSearch {...props} />);

        expect(screen.getByText("Search for a user")).toBeInTheDocument();
        expect(screen.getByText("Last name")).toBeInTheDocument();
        expect(screen.getByText("First name")).toBeInTheDocument();
    });
});

describe("UserSearch — 'no profile found' block (driven via setState)", () => {
    test("French: heading, coordinates hint, <Trans> line and create button", async () => {
        await i18n.changeLanguage("fr");
        const ref = React.createRef();
        const {container} = render(<UserSearch ref={ref} {...props} />);

        act(() => ref.current.setState({usernotSearched: false, possibleMatches: []}));

        expect(
            screen.getByText("Aucun profil existant retrouvé selon ces coordonnées.")
        ).toBeInTheDocument();
        expect(container).toHaveTextContent(
            "Si l'utilisateur est déjà enregistré, vérifiez que les bonnes coordonnées soient saisies."
        );

        // <Trans> renders "Sinon créez un nouveau profil." with the middle chunk in an <em>,
        // and no "<1>" placeholder leaking through.
        expect(container).toHaveTextContent("Sinon créez un nouveau profil.");
        expect(container.querySelector(".alert em")).toHaveTextContent(
            "créez un nouveau profil"
        );
        expect(container.innerHTML).not.toContain("<1>");
        expect(container.innerHTML).not.toContain("&lt;1&gt;");

        expect(
            screen.getByRole("button", {name: "Créer un nouveau profil"})
        ).toBeInTheDocument();
    });

    test("English: same block resolves to the English copy", async () => {
        await i18n.changeLanguage("en");
        const ref = React.createRef();
        const {container} = render(<UserSearch ref={ref} {...props} />);

        act(() => ref.current.setState({usernotSearched: false, possibleMatches: []}));

        expect(
            screen.getByText("No existing profile found for these details.")
        ).toBeInTheDocument();
        expect(container).toHaveTextContent(
            "If the user is already registered, make sure the correct details have been entered."
        );
        expect(container).toHaveTextContent("Otherwise create a new profile.");
        expect(container.querySelector(".alert em")).toHaveTextContent(
            "create a new profile"
        );
        expect(container.innerHTML).not.toContain("<1>");
        expect(
            screen.getByRole("button", {name: "Create a new profile"})
        ).toBeInTheDocument();
    });
});

describe("UserSearch — isValidated() toasts the localized MESSAGES.err_must_select_user", () => {
    // Direct `MESSAGES.err_must_select_user` toast call (constants-i18n lot 2): isValidated()
    // reads the `MESSAGES` live binding at call time, so it must resolve in whatever language is
    // active when StepZilla invokes it, not just at mount.
    test("French: toasts the French copy when no user is selected", async () => {
        await i18n.changeLanguage("fr");
        const ref = React.createRef();
        render(<UserSearch ref={ref} {...props} />);

        const result = ref.current.isValidated();

        expect(result).toBe(false);
        expect(toast.error).toHaveBeenCalledWith(
            "Veuillez sélectionner un utilisateur avant de continuer.",
            {autoClose: 3000}
        );
    });

    test("English: toasts the English copy when no user is selected", async () => {
        await i18n.changeLanguage("en");
        const ref = React.createRef();
        render(<UserSearch ref={ref} {...props} />);

        const result = ref.current.isValidated();

        expect(result).toBe(false);
        expect(toast.error).toHaveBeenCalledWith(
            "Please select a user before continuing.",
            {autoClose: 3000}
        );
    });
});

describe("UserSearch — i18n layer", () => {
    test.each(["fr", "en"])(
        "userSearch.bornOn substitutes {date}/{number}, keeps its leading space (%s)",
        lng => {
            const v = i18n.getFixedT(lng, "activityApplications")("userSearch.bornOn", {
                date: "01/09/2020",
                number: 42,
            });
            expect(v).toContain("01/09/2020");
            expect(v).toContain("42");
            expect(v.startsWith(" ")).toBe(true);
            expect(v).not.toMatch(/\{\{/);
        }
    );
});
