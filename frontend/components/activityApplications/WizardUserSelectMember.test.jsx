// i18n extraction test — i18n-06 "activities" domain, lot 3b (`activityApplications` namespace).
//
// WizardUserSelectMember is a StepZilla step and stays a plain class (the file comment says so —
// StepZilla only wires `isValidated()` for `instanceof React.Component`). Its strings come from a
// module-level `const T = (k, o) => i18n.t(`activityApplications:${k}`, o)` helper.
//
// `componentDidMount` -> `updateMembersData()` -> `api.set().success(cb).error(cb).get(...)`; the
// `../../tools/api` module is stubbed chainable, capturing `.success` / `.error` so the error
// branch (which fires `swal({...})`) can be driven by hand. All heavy children are stubbed.

import React from "react";
import {render, screen, act} from "@testing-library/react";
import i18n from "../../i18n";
import swal from "sweetalert2";
import WizardUserSelectMember from "./WizardUserSelectMember";

const {apiState} = vi.hoisted(() => ({apiState: {success: null, error: null}}));

vi.mock("../../tools/api", () => {
    const chain = {
        before: () => chain,
        useLoading: () => chain,
        success: cb => {
            apiState.success = cb;
            return chain;
        },
        error: cb => {
            apiState.error = cb;
            return chain;
        },
        get: vi.fn(() => Promise.resolve()),
        post: vi.fn(() => Promise.resolve()),
    };
    return {set: () => chain};
});

vi.mock("sweetalert2", () => ({default: vi.fn()}));
vi.mock("react-modal", () => ({default: () => null}));
vi.mock("../ToggleButtonGroup", () => ({default: () => null}));
vi.mock("../userForm/WizardContactForm", () => ({default: () => null}));
vi.mock("../userForm/ContactForm", () => ({default: () => null}));
vi.mock("../common/SelectMultiple", () => ({default: () => null}));
vi.mock("react-select/lib/Creatable", () => ({default: () => null}));
vi.mock("../UserAvatar", () => ({default: () => null}));

const props = {
    user: {id: 1, first_name: "Jean", last_name: "Dupont"},
    season: {id: 2},
    onSelect: () => {},
};

beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
    vi.clearAllMocks();
    apiState.success = null;
    apiState.error = null;
    await i18n.changeLanguage("fr");
});

describe("WizardUserSelectMember — StepZilla step shape", () => {
    test("is a plain class with isValidated and no withTranslation wrapper", () => {
        expect(WizardUserSelectMember.prototype instanceof React.Component).toBe(true);
        expect(typeof WizardUserSelectMember.prototype.isValidated).toBe("function");
        expect(WizardUserSelectMember.WrappedComponent).toBeUndefined();
    });
});

describe("WizardUserSelectMember — rendered copy", () => {
    test.each([
        ["fr", "Membre concerné", "Ajouter un membre"],
        ["en", "Member concerned", "Add a member"],
    ])("%s: memberConcerned heading + addMember button", async (lng, heading, addMember) => {
        await i18n.changeLanguage(lng);
        render(<WizardUserSelectMember {...props} />);

        expect(screen.getByRole("heading", {name: heading})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: addMember})).toBeInTheDocument();
    });
});

describe("WizardUserSelectMember — fetch-error branch fires swal with resolved fr copy", () => {
    test("captured .error callback -> swal({ title, text, confirmButtonText, type })", async () => {
        await i18n.changeLanguage("fr");
        render(<WizardUserSelectMember {...props} />);

        expect(typeof apiState.error).toBe("function");
        act(() => apiState.error({message: "boom"}));

        expect(swal).toHaveBeenCalledWith({
            title: "Erreur",
            text: "Une erreur est survenue lors de la récupération des membres",
            confirmButtonText: "Fermer",
            type: "error",
        });
    });
});

describe("WizardUserSelectMember — i18n layer", () => {
    test("selectMember keeps the 'Veuilez' typo in fr (not 'Veuillez')", () => {
        const v = i18n.getFixedT("fr", "activityApplications")(
            "wizardUserSelectMember.selectMember"
        );
        expect(v).toContain("Veuilez");
        expect(v).not.toContain("Veuillez");
    });

    test.each(["fr", "en"])(
        "selectLegalRepresentative / legalRepresentativeMustBeAdult / ifMinorAddMember resolve in %s",
        lng => {
            const t = i18n.getFixedT(lng, "activityApplications");
            for (const key of [
                "wizardUserSelectMember.selectLegalRepresentative",
                "wizardUserSelectMember.legalRepresentativeMustBeAdult",
                "wizardUserSelectMember.ifMinorAddMember",
            ]) {
                const v = t(key);
                expect(typeof v).toBe("string");
                expect(v.length).toBeGreaterThan(0);
                expect(v).not.toBe(key);
                expect(v).not.toMatch(/\{\{/);
            }
        }
    );

    test.each(["fr", "en"])("familyLinkCreation substitutes {name} in %s", lng => {
        const v = i18n.getFixedT(lng, "activityApplications")(
            "wizardUserSelectMember.familyLinkCreation",
            {name: "Jean Dupont"}
        );
        expect(v).toContain("Jean Dupont");
        expect(v).not.toMatch(/\{\{/);
    });
});
