// i18n extraction test — i18n-06 "parameters" domain, lot E3.
//
// Covers the lot-E3 extraction of `frontend/components/editParameters/SchoolParameters.jsx`
// (the school legal/fiscal identity form — name/email/phone, address + holiday zones,
// SIRET/RCS/VAT). The component is a single fn component, now
// `const {t} = useTranslation("parameters")` as its first line, `import {useTranslation, Trans}
// from "react-i18next"`.
//
// 34 new keys under `parameters:editParameters.school.*`; `parameters.json` is 255 leaves this
// branch. It renders:
//   - 4 <h3> = editParameters.school.{schoolInfo,contacts,holidays,billing}Heading
//     (schoolInfoHeading has a trailing space; the a11y-name / DOM normalizer trims it).
//   - ~15 <label> = editParameters.school.*Label, several followed by a literal
//     `<span className="text-danger">*</span> :` required-marker (untranslated — left as-is).
//   - gated error <p> = editParameters.school.{nameRequired,emailRequired,phoneRequired,
//     streetRequired,cityRequired,postalCodeError,countryRequired,siretRnaError}.
//   - <option> = editParameters.school.{vatTaxable,vatExempt}; <small> = editParameters.school.optional.
//   - `siretRnaError` is INTERPOLATED — t("...siretRnaError", {country: getValues("countryCode")})
//     — and the same key feeds BOTH the `validateSiretRna` return value AND the <p> error text.
//   - `academyLine` = t("...academyLine", {academy}); only rendered in the "zone not set by user"
//     branch.
//   - `activitiesNotVatLabel` is a <Trans i18nKey="...activitiesNotVatLabel" ns="parameters">
//     with a `<u>` wrap resolved through the indexed `<1>` marker (<u> is not in
//     react-i18next's default transKeepBasicHtmlNodesFor).
//   - swal on submit: {title: editParameters.school.loadingTitle} then, on fetch `.ok`,
//     {type:"success", title: editParameters.school.saveSuccess}, else
//     {type:"error", title: editParameters.school.genericError}.
//   - submit <input value={t("common:actions.save")}>.
//
// `ParametersChrome.test.jsx` (exact 255 total + {country,academy} in its resolve loop) and
// `EditParameters.test.jsx` (E2 editParameters.* floor + lock-step) already account for this
// lot and are intentionally left untouched.

import React from "react";
import {render, screen, fireEvent, waitFor} from "@testing-library/react";
import i18n from "../../i18n";
import fr from "../../locales/fr/parameters.json";
import en from "../../locales/en/parameters.json";

// --- sweetalert2: plain spy with a `.showLoading` no-op (onSubmit passes `onOpen: () =>
//     swal.showLoading()`). ------------------------------------------------------------------
vi.mock("sweetalert2", () => {
    const swal = vi.fn(() => Promise.resolve({}));
    swal.showLoading = vi.fn();
    return {default: swal};
});

// --- tools/api: chainable no-op stub (used by `onAddressChange`, not under test here). -------
vi.mock("../../tools/api", () => ({
    set: () => {
        const c = {};
        c.success = () => c;
        c.error = () => c;
        c.before = () => c;
        c.useLoading = () => c;
        c.get = () => c;
        c.post = () => c;
        c.put = () => c;
        c.del = () => c;
        return c;
    },
}));

// `../../tools/format` is NOT mocked: `validateEmail` is a matcher *function*, and RHF's
// `pattern:` guard (`x instanceof RegExp`) rejects it, so the email pattern rule is a
// production no-op (see docs/KnownIssues.md). `required` still fires, which is all the submit
// tests below rely on.

// --- components/utils: only `csrfToken` is imported by SchoolParameters. --------------------
vi.mock("../utils", () => ({csrfToken: "test-csrf-token"}));

// --- DragAndDrop: prop-echoing stub (rendered for the Logo field; `textDisplayed` is a
//     threaded translation). ------------------------------------------------------------------
vi.mock("./DragAndDrop", () => ({
    default: (props) => <div data-testid="drag-and-drop" data-text={props.textDisplayed} />,
}));

import swal from "sweetalert2";
import SchoolParameters from "./SchoolParameters";

const tP = (lng) => i18n.getFixedT(lng, "parameters");
const tC = (lng) => i18n.getFixedT(lng, "common");
const norm = (s) => String(s).replace(/\s+/g, " ").trim();

// `<label>` has no ARIA role, and the required-marker labels carry a trailing
// `<span>*</span> :` so an exact `getByText` on the bare i18n value misses. Match on the
// label's normalised textContent instead: equal to the needle, or the needle followed by the
// (untranslated) marker punctuation / `<small>(optionnel)</small>`.
const hasLabel = (container, needle) => {
    const target = norm(needle);
    return [...container.querySelectorAll("label")].some((l) => {
        const txt = norm(l.textContent);
        return txt === target || txt.startsWith(target + " ");
    });
};

const baseProps = {
    school: {
        name: "Old School",
        email: "old@example.com",
        phone_number: "0102030405",
        siret_rna: "",
        rcs: "",
        entity_subject_to_vat: "true",
        activities_not_subject_to_vat: false,
        academy: "Paris",
        zone: "",
    },
    schoolAddress: {street_address: "1 rue X", city: "Paris", postcode: "75001", country: "FR"},
    countries: [
        ["France", "FR"],
        ["Belgique", "BE"],
    ],
    bankHolidaysZones: {m: "Métropole", g: "Guadeloupe"},
    bankHolidaysZone: "Métropole",
    zones: {a: "A", b: "B", c: "C"},
    zone_set_by_user: true,
    picture_url: "/logo.png",
    min_score_recaptcha: "0.5",
};

beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ok: true, json: () => Promise.resolve({})});
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
    vi.clearAllMocks();
});

// ============================================================================================
// 1. i18n layer — editParameters.school.* parity + resolution + the interpolated keys
// ============================================================================================
describe("editParameters.school.* — i18n layer", () => {
    const flatten = (obj, prefix = "") =>
        Object.entries(obj).flatMap(([k, v]) =>
            v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
        );

    const FR_KEYS = flatten(fr).filter((k) => k.startsWith("editParameters.school."));
    const EN_KEYS = flatten(en).filter((k) => k.startsWith("editParameters.school."));

    test("fr and en expose exactly the same editParameters.school.* key set (31)", () => {
        // 34 at lot-E3; the shared-consolidation moved loadingTitle/saveSuccess/genericError
        // onto common:loading / shared.saveCompleted / shared.genericErrorShort -> 31.
        expect(new Set(EN_KEYS)).toEqual(new Set(FR_KEYS));
        expect(FR_KEYS).toHaveLength(31);
        expect(EN_KEYS).toHaveLength(31);
    });

    test.each(["fr", "en"])(
        "every editParameters.school.* key resolves to real, non-empty copy in %s",
        (lng) => {
            const t = tP(lng);
            for (const key of FR_KEYS) {
                const v = t(key, {country: "FR", academy: "Paris"});
                expect(typeof v).toBe("string");
                expect(v.length).toBeGreaterThan(0);
                expect(v).not.toBe(key);
                expect(v).not.toMatch(/\{\{/);
            }
        },
    );

    // `siretRnaError` is used at TWO call sites — the `validateSiretRna` return value and the
    // `<p className="text-danger">` — both `t("...siretRnaError", {country: getValues("countryCode")})`.
    // Reaching the `validate` call site through RHF is awkward; asserting the substitution at the
    // i18n layer covers both.
    test.each(["fr", "en"])("siretRnaError interpolates {{country}} in %s", (lng) => {
        const v = tP(lng)("editParameters.school.siretRnaError", {country: "BE"});
        expect(v).toContain("BE");
        expect(v).not.toMatch(/\{[{}]/);
    });

    test.each(["fr", "en"])("academyLine interpolates {{academy}} in %s", (lng) => {
        const v = tP(lng)("editParameters.school.academyLine", {academy: "Paris"});
        expect(v).toContain("Paris");
        expect(v).not.toMatch(/\{[{}]/);
    });

    test.each(["fr", "en"])(
        "activitiesNotVatLabel keeps the <Trans> <1></1> markers in the JSON in %s",
        (lng) => {
            const raw = (lng === "fr" ? fr : en).editParameters.school.activitiesNotVatLabel;
            expect(raw).toContain("<1>");
            expect(raw).toContain("</1>");
        },
    );

    test("common:actions.save (submit button) resolves to Enregistrer / Save", () => {
        expect(tC("fr")("actions.save")).toBe("Enregistrer");
        expect(tC("en")("actions.save")).toBe("Save");
    });
});

// ============================================================================================
// 2. Render — headings, labels, options, submit button
// ============================================================================================
describe("SchoolParameters — translated render", () => {
    test.each(["fr", "en"])("the 4 <h3> headings render translated in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<SchoolParameters {...baseProps} />);

        for (const key of ["schoolInfoHeading", "contactsHeading", "holidaysHeading", "billingHeading"]) {
            expect(
                screen.getByRole("heading", {name: norm(tP(lng)(`editParameters.school.${key}`))}),
            ).toBeInTheDocument();
        }
    });

    test.each(["fr", "en"])("a representative set of <label>s render translated in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        const {container} = render(<SchoolParameters {...baseProps} />);

        for (const key of [
            "nameLabel",
            "emailLabel",
            "streetLabel",
            "cityLabel",
            "postalCodeLabel",
            "countryLabel",
            "bankHolidaysZoneLabel",
            "schoolHolidaysZoneLabel", // leading + trailing space — the one most likely to regress under a trim
            "siretRnaLabel",
            "rcsLabel",
            "vatLabel",
        ]) {
            expect(hasLabel(container, tP(lng)(`editParameters.school.${key}`))).toBe(true);
        }
    });

    test.each(["fr", "en"])("a blank required field renders its translated error <p> in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        const {container} = render(<SchoolParameters {...baseProps} school={{...baseProps.school, name: ""}} />);

        fireEvent.submit(container.querySelector("form"));

        // the <p className="text-danger"> for `name` is `t("editParameters.school.nameRequired")`
        await screen.findByText(tP(lng)("editParameters.school.nameRequired"));
    });

    test.each(["fr", "en"])(
        "the optional <small>, both VAT <option>s and the submit button render translated in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(<SchoolParameters {...baseProps} />);

            expect(screen.getByText(tP(lng)("editParameters.school.optional"))).toBeInTheDocument();
            expect(
                screen.getByRole("option", {name: tP(lng)("editParameters.school.vatTaxable")}),
            ).toBeInTheDocument();
            expect(
                screen.getByRole("option", {name: tP(lng)("editParameters.school.vatExempt")}),
            ).toBeInTheDocument();
            expect(
                screen.getByRole("button", {name: tC(lng)("actions.save")}),
            ).toBeInTheDocument();
        },
    );

    test.each(["fr", "en"])("threads the translated logoDropText into DragAndDrop in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<SchoolParameters {...baseProps} />);

        expect(screen.getByTestId("drag-and-drop")).toHaveAttribute(
            "data-text",
            tP(lng)("editParameters.school.logoDropText"),
        );
    });
});

// ============================================================================================
// 3. <Trans> VAT activities line — textContent + the interpolated <u> child
// ============================================================================================
describe("SchoolParameters — <Trans> activitiesNotVatLabel", () => {
    test.each([
        ["fr", "Les activités musicales ne sont pas assujetties à la TVA", "ne sont pas assujetties"],
        ["en", "Music activities are not subject to VAT", "are not subject"],
    ])("renders the <u>-wrapped fragment via the indexed <1> in %s", async (lng, full, underlined) => {
        await i18n.changeLanguage(lng);
        const {container} = render(<SchoolParameters {...baseProps} />);

        const label = container.querySelector('label[for="activitiesNotSubjectToVat"]');
        expect(label).toBeTruthy();
        expect(norm(label.textContent)).toBe(full);

        const u = label.querySelector("u");
        expect(u).toBeTruthy();
        expect(norm(u.textContent)).toBe(underlined);
    });
});

// ============================================================================================
// 4. academyLine — the "zone not set by user" branch
// ============================================================================================
describe("SchoolParameters — academyLine (zone not set by user)", () => {
    // Branch gate (component): props.zone_set_by_user !== true && getValues("zone_set_by_user")
    // !== "true" && zone !== "" — where `zone` is `useState((props.school||{}).zone)`.
    const zoneProps = {
        ...baseProps,
        zone_set_by_user: false,
        school: {...baseProps.school, zone: "B", academy: "Paris"},
    };

    test.each([
        ["fr", "(Académie : Paris)"],
        ["en", "(Academy: Paris)"],
    ])("renders the %s academy line", async (lng, expected) => {
        await i18n.changeLanguage(lng);
        render(<SchoolParameters {...zoneProps} />);

        expect(screen.getByText(expected)).toBeInTheDocument();
    });
});

// ============================================================================================
// 5. submit -> swal paths (loadingTitle, then saveSuccess / genericError)
// ============================================================================================
describe("SchoolParameters — submit / swal", () => {
    // Fill every RHF-required field so `handleSubmit` actually invokes `onSubmit`.
    const fillRequired = (container) => {
        const set = (name, value) =>
            fireEvent.change(container.querySelector(`[name="${name}"]`), {target: {value}});
        set("name", "My School");
        set("email", "school@example.com");
        set("contactPhone", "0601020304");
        set("street", "1 rue de la Paix");
        set("city", "Paris");
        set("postalCode", "75001");
        set("siretRna", "12345678901234"); // 14 digits -> validateSiretRna() === true for FR
        // countryCode already defaults to "FR" (props.schoolAddress.country).
    };

    test.each(["fr", "en"])(
        "fetch .ok -> swal(loadingTitle) then swal(saveSuccess) in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({academy: "X", zone: "Y", picture: "z"}),
            });
            const {container} = render(<SchoolParameters {...baseProps} />);
            fillRequired(container);

            fireEvent.submit(container.querySelector("form"));

            await waitFor(() => expect(swal).toHaveBeenCalledTimes(2));
            expect(swal.mock.calls[0][0].title).toBe(tC(lng)("loading"));
            expect(swal.mock.calls[1][0]).toMatchObject({
                type: "success",
                title: tP(lng)("shared.saveCompleted"),
            });
        },
    );

    test.each(["fr", "en"])(
        "fetch !ok -> swal(loadingTitle) then swal(genericError) in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            global.fetch = vi.fn().mockResolvedValue({ok: false});
            const {container} = render(<SchoolParameters {...baseProps} />);
            fillRequired(container);

            fireEvent.submit(container.querySelector("form"));

            await waitFor(() => expect(swal).toHaveBeenCalledTimes(2));
            expect(swal.mock.calls[0][0].title).toBe(tC(lng)("loading"));
            expect(swal.mock.calls[1][0]).toMatchObject({
                type: "error",
                title: tP(lng)("shared.genericErrorShort"),
            });
        },
    );
});
