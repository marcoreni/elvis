// i18n extraction test — i18n-06 "parameters" domain, lot E2 (the 5 `editParameters/*`
// components on the CSV / mail / rules-of-procedure / teachers settings screens).
//
// Covers the lot-E2 extraction of `frontend/components/editParameters/`:
//
//   CsvSettings        — fn `useTranslation("parameters")` + react-hook-form. Two <label> =
//       `editParameters.csv.{sepLabel,encodingLabel}`; two `<p className="text-danger">` error
//       hints (see the dead-gate note below); submit `<input value>` = `common:actions.save`.
//       `onSubmit` -> `fetch` -> `.ok` swal `{title: editParameters.csv.saveSuccessTitle,
//       text: editParameters.settingsApplied}`, else `{title: shared.errorTitle,
//       text: shared.genericError}`.
//   MailSettings       — fn `useTranslation("parameters")` + react-hook-form. ~9 <label> =
//       `editParameters.mail.*Label`, 5 `<p>` required errors, a redirect hint `<p>`; submit =
//       `common:actions.save`. `onSubmit` swal success `{title: editParameters.mail.saveSuccessTitle
//       ("Success" in BOTH locales), text: editParameters.settingsApplied}`, error
//       `{title: editParameters.mail.errorTitle ("Error" in BOTH), text: editParameters.mail.genericError}`.
//   RulesSettings      — fn `useTranslation("parameters")` + react-hook-form, renders <DragAndDrop>.
//       <label> = `editParameters.rules.{formatLabel,urlLabel,pdfLabel}`; `<option value="NIL">` =
//       `editParameters.rules.formatNone`; `<DragAndDrop textDisplayed={t("editParameters.rules.dropPdfText")}>`
//       (asserted through the real mounted child); submit = `common:actions.save`. `onSubmit` fires
//       `swal({title: editParameters.rules.loadingTitle})` then, on fetch `.ok`,
//       `swal({title: editParameters.rules.saveSuccess})`, else `swal({title: editParameters.rules.genericError})`.
//   TeachersParameters — fn `useTranslation("parameters")`. 4 <h3> =
//       `editParameters.teachers.{planning,applications,contacts,courses}Heading`, 4 checkbox <label>
//       = `.{planning,applications,contacts,courses}Label`, submit <button> = `shared.saveButton`.
//       `onSubmit` -> `api.set()...post()`: `data.success` -> swal `{title:
//       editParameters.teachers.saveSuccessTitle, text: .saveSuccessText}` then
//       `window.location.reload()`; the `else` branch and the `.error` callback both ->
//       `{title: shared.errorTitle, text: editParameters.teachers.saveErrorText}`.
//   DragAndDrop        — fn `useTranslation("common")` (moved out of `parameters` — it's a shared
//       component with call sites in three i18n domains, see KnownIssues.md history). Dropzone
//       branch: `<p>{props.textDisplayed}</p>` + `<button>` = `common:dragAndDrop.selectButton`.
//       `handleDropRejected` assigns `div.innerHTML = t("dragAndDrop.{invalidType,tooManyFiles}")`
//       (DOM-string write, only asserted at the i18n layer); `.imageAlt` / `.currentDocument` /
//       `.none` sit on branches that need a pre-existing file/url and are likewise asserted at the
//       i18n layer.
//
// Keys live in `frontend/locales/{fr,en}/parameters.json` under `editParameters.*` (67 leaves);
// `parameters.json` is 227 leaves this branch. Reuses `shared.{errorTitle,genericError,saveButton}`
// + `common:actions.save`.

import React from "react";
import {render, screen, fireEvent, waitFor} from "@testing-library/react";
import i18n from "../../i18n";
import fr from "../../locales/fr/parameters.json";
import en from "../../locales/en/parameters.json";

// --- sweetalert2: plain spy with a `.showLoading` no-op (RulesSettings + TeachersParameters
//     call `swal.showLoading()` on the default export). --------------------------------------
vi.mock("sweetalert2", () => {
    const swal = vi.fn(() => Promise.resolve({}));
    swal.showLoading = vi.fn();
    return {default: swal};
});

// --- tools/api: chainable no-op stub; last success/error callbacks captured for hand-firing. --
const apiState = vi.hoisted(() => ({lastSuccess: null, lastError: null, lastPost: null}));
vi.mock("../../tools/api", () => ({
    set: () => {
        const c = {};
        c.success = (fn) => { apiState.lastSuccess = fn; return c; };
        c.error = (fn) => { apiState.lastError = fn; return c; };
        c.before = () => c;
        c.useLoading = () => c;
        c.get = () => c;
        c.post = (url, data) => { apiState.lastPost = {url, data}; return c; };
        c.put = () => c;
        c.del = () => c;
        return c;
    },
}));

// --- react-dropzone: render the render-prop children with inert prop-getters so DragAndDrop's
//     Dropzone branch renders in jsdom (the real lib does DOM measurement that doesn't run). ---
vi.mock("react-dropzone", () => ({
    default: ({children}) =>
        children({
            getRootProps: () => ({}),
            getInputProps: () => ({}),
            isDragActive: false,
            isDragAccept: false,
            isDragReject: false,
        }),
}));

import swal from "sweetalert2";
import CsvSettings from "./CsvSettings";
import MailSettings from "./MailSettings";
import RulesSettings from "./RulesSettings";
import TeachersParameters from "./TeachersParameters";
import DragAndDrop from "./DragAndDrop";

const tP = (lng) => i18n.getFixedT(lng, "parameters");
const tC = (lng) => i18n.getFixedT(lng, "common");

// Several label strings carry a trailing space ("Activer SSL/TLS: "). @testing-library/dom's
// default text normalizer trims the *rendered* text (and collapses internal whitespace), so an
// exact `getByText` on the raw i18n value — which still has its trailing space — misses. Trim the
// needle too and the rendered (already-trimmed) node matches.
const byText = (str) => screen.getByText(str.trim());

// TeachersParameters' success branch calls window.location.reload() — jsdom would throw
// "Not implemented: navigation". Replace location with a stub for the whole file.
const reload = vi.fn();
Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: {reload, href: "http://localhost/", assign: vi.fn()},
});

beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ok: true, json: () => Promise.resolve({})});
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
    vi.clearAllMocks();
    apiState.lastSuccess = null;
    apiState.lastError = null;
    apiState.lastPost = null;
});

// ============================================================================================
// 1. i18n layer — editParameters.* parity + resolution, and the reused keys
// ============================================================================================
describe("editParameters.* — i18n layer", () => {
    const flatten = (obj, prefix = "") =>
        Object.entries(obj).flatMap(([k, v]) =>
            v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
        );

    const FR_KEYS = flatten(fr).filter((k) => k.startsWith("editParameters."));
    const EN_KEYS = flatten(en).filter((k) => k.startsWith("editParameters."));

    test("fr and en expose exactly the same editParameters.* key set", () => {
        expect(new Set(EN_KEYS)).toEqual(new Set(FR_KEYS));
        // grows across sub-lots (E2: 49, E3: +34 school.* = 83; shared-consolidation moved
        // ~9 swal-title/status keys onto shared.*/common: -> ~74). Exact total pinned in
        // ParametersChrome.test.jsx; here just guard the floor + fr/en lock-step.
        expect(FR_KEYS.length).toBe(EN_KEYS.length);
        expect(FR_KEYS.length).toBeGreaterThanOrEqual(49);
    });

    test.each(["fr", "en"])("every editParameters.* key resolves to real, non-empty copy in %s", (lng) => {
        const t = tP(lng);
        for (const key of FR_KEYS) {
            // pass every interpolation var any editParameters.* string uses
            const v = t(key, {country: "FR", academy: "Paris"});
            expect(typeof v).toBe("string");
            expect(v.length).toBeGreaterThan(0);
            expect(v).not.toBe(key);
            expect(v).not.toMatch(/\{\{/);
        }
    });

    test("reused shared.* + common:actions.save keys resolve to the expected copy", () => {
        expect(tP("fr")("shared.errorTitle")).toBe("Erreur");
        expect(tP("en")("shared.errorTitle")).toBe("Error");

        expect(tP("fr")("shared.genericError")).toBe("Une erreur est survenue. Contactez un administrateur");
        expect(tP("en")("shared.genericError")).toBe("An error occurred. Contact an administrator");

        expect(tP("fr")("shared.saveButton")).toBe("Sauvegarder");
        expect(tP("en")("shared.saveButton")).toBe("Save");

        expect(tC("fr")("actions.save")).toBe("Enregistrer");
        expect(tC("en")("actions.save")).toBe("Save");
    });

    test("mail swal titles are now localised in fr (English kept in en)", () => {
        // saveSuccessTitle was consolidated onto shared.saveSuccessTitle; mail.errorTitle stays.
        expect(tP("fr")("shared.saveSuccessTitle")).toBe("Succès");
        expect(tP("en")("shared.saveSuccessTitle")).toBe("Success");
        expect(tP("fr")("editParameters.mail.errorTitle")).toBe("Erreur");
        expect(tP("en")("editParameters.mail.errorTitle")).toBe("Error");
    });

    test("editParameters.mail.genericError is now consolidated with shared.genericError (fr + en)", () => {
        // The callsite now points straight at shared.genericError in both locales.
        expect(tP("fr")("shared.genericError")).toBe("Une erreur est survenue. Contactez un administrateur");
        expect(tP("en")("shared.genericError")).toBe("An error occurred. Contact an administrator");
    });

    // --- CsvSettings dead-gate: `{errors.col_sep && t("editParameters.csv.sepRequired")}` is
    //     gated on `errors.col_sep`, but the field registers as `colSep` — so `errors.col_sep`
    //     is never populated and this <p> can never render. Pre-existing bug; the extraction only
    //     swapped the French literal for the key. `encodingRequired` is gated on `errors.encoding`
    //     which DOES match the registered name, but the <select> always has a value so RHF's
    //     `required` never trips in practice either. Assert both keys resolve. -------------------
    test.each(["fr", "en"])("csv.{sepRequired,encodingRequired} keys resolve in %s (cannot render — see note)", (lng) => {
        expect(tP(lng)("editParameters.csv.sepRequired").length).toBeGreaterThan(0);
        expect(tP(lng)("editParameters.csv.sepRequired")).not.toBe("editParameters.csv.sepRequired");
        expect(tP(lng)("editParameters.csv.encodingRequired")).not.toBe("editParameters.csv.encodingRequired");
    });

    // --- DragAndDrop.handleDropRejected writes t(...) into `div.textContent`; reaching it needs
    //     react-dropzone's own reject path. Assert those two keys resolve. --------------------
    test.each(["fr", "en"])("dragAndDrop.{invalidType,tooManyFiles,imageAlt} keys resolve in %s", (lng) => {
        for (const k of ["invalidType", "tooManyFiles", "imageAlt"]) {
            const v = tC(lng)(`dragAndDrop.${k}`);
            expect(v.length).toBeGreaterThan(0);
            expect(v).not.toBe(`dragAndDrop.${k}`);
        }
    });

    // Dropzone branch (no file / no url yet) — the "Select" button.
    test.each(["fr", "en"])("Dropzone branch renders the translated select button in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<DragAndDrop acceptedTypes="application/pdf" setFile={() => {}} textDisplayed="drop here" />);
        expect(
            screen.getByRole("button", {name: tC(lng)("dragAndDrop.selectButton")}),
        ).toBeInTheDocument();
    });

    // else branch with an empty (falsy but defined) url — the "Document actuel : aucun" fallback,
    // both keys plus the JSX-boundary space, verified against the real render.
    test.each([
        ["fr", "Document actuel : aucun"],
        ["en", "Current document: none"],
    ])("no-file fallback renders currentDocument + none in %s", async (lng, expected) => {
        await i18n.changeLanguage(lng);
        const {container} = render(
            <DragAndDrop acceptedTypes="application/pdf" setFile={() => {}} textDisplayed="x" file_url="" />,
        );
        expect(container.querySelector("p.ml-5").textContent).toBe(expected);
    });
});

// ============================================================================================
// 2. CsvSettings
// ============================================================================================
describe("CsvSettings", () => {
    const props = {csv_settings: {col_sep: ";", encoding: "UTF-8"}};

    test.each(["fr", "en"])("labels + submit value are translated in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<CsvSettings {...props} />);

        expect(byText(tP(lng)("editParameters.csv.sepLabel"))).toBeInTheDocument();
        expect(byText(tP(lng)("editParameters.csv.encodingLabel"))).toBeInTheDocument();
        expect(screen.getByDisplayValue(tC(lng)("actions.save"))).toBeInTheDocument();
    });

    test.each(["fr", "en"])("onSubmit -> fetch .ok -> success swal in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        const {container} = render(<CsvSettings {...props} />);

        fireEvent.submit(container.querySelector("form"));

        await waitFor(() => expect(swal).toHaveBeenCalled());
        expect(swal.mock.calls[0][0]).toMatchObject({
            title: tP(lng)("shared.saveSuccessTitle"),
            text: tP(lng)("editParameters.settingsApplied"),
        });
    });

    test.each(["fr", "en"])("onSubmit -> fetch !ok -> error swal in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        global.fetch = vi.fn().mockResolvedValue({ok: false});
        const {container} = render(<CsvSettings {...props} />);

        fireEvent.submit(container.querySelector("form"));

        await waitFor(() => expect(swal).toHaveBeenCalled());
        expect(swal.mock.calls[0][0]).toMatchObject({
            title: tP(lng)("shared.errorTitle"),
            text: tP(lng)("shared.genericError"),
        });
    });
});

// ============================================================================================
// 3. MailSettings
// ============================================================================================
describe("MailSettings", () => {
    const props = {
        mail_settings: {
            from: "noreply@example.com",
            address: "smtp.example.com",
            authentication: "login",
            domain: "example.com",
            password: "s3cret",
            port: "587",
            redirect: [],
            sslTls: false,
            user_name: "mailer",
        },
    };

    test.each(["fr", "en"])("all labels + hint + submit value are translated in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<MailSettings {...props} />);

        for (const key of [
            "smtpAddressLabel", "smtpPortLabel", "domainLabel", "sslTlsLabel", "authLabel",
            "usernameLabel", "passwordLabel", "redirectLabel", "fromLabel",
        ]) {
            expect(byText(tP(lng)(`editParameters.mail.${key}`))).toBeInTheDocument();
        }
        expect(byText(tP(lng)("editParameters.mail.redirectHint"))).toBeInTheDocument();
        expect(screen.getByDisplayValue(tC(lng)("actions.save"))).toBeInTheDocument();
    });

    test.each(["fr", "en"])("onSubmit -> fetch .ok -> success swal in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        const {container} = render(<MailSettings {...props} />);

        fireEvent.submit(container.querySelector("form"));

        await waitFor(() => expect(swal).toHaveBeenCalled());
        expect(swal.mock.calls[0][0]).toMatchObject({
            title: tP(lng)("shared.saveSuccessTitle"),
            text: tP(lng)("editParameters.settingsApplied"),
        });
    });

    test.each(["fr", "en"])("onSubmit -> fetch !ok -> error swal in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        global.fetch = vi.fn().mockResolvedValue({ok: false});
        const {container} = render(<MailSettings {...props} />);

        fireEvent.submit(container.querySelector("form"));

        await waitFor(() => expect(swal).toHaveBeenCalled());
        expect(swal.mock.calls[0][0]).toMatchObject({
            title: tP(lng)("editParameters.mail.errorTitle"),
            text: tP(lng)("shared.genericError"),
        });
    });
});

// ============================================================================================
// 4. RulesSettings (mounts the real DragAndDrop child; react-dropzone is stubbed)
// ============================================================================================
describe("RulesSettings", () => {
    const props = {method: "PDF", rulesUrl: "", rulesPdf: undefined, file_url: undefined};

    test.each(["fr", "en"])("labels + formatNone option + threaded dropPdfText + submit value in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<RulesSettings {...props} />);

        expect(byText(tP(lng)("editParameters.rules.formatLabel"))).toBeInTheDocument();
        expect(byText(tP(lng)("editParameters.rules.urlLabel"))).toBeInTheDocument();
        expect(byText(tP(lng)("editParameters.rules.pdfLabel"))).toBeInTheDocument();
        expect(screen.getByRole("option", {name: tP(lng)("editParameters.rules.formatNone")})).toBeInTheDocument();
        // textDisplayed={t("editParameters.rules.dropPdfText")} rendered by the mounted DragAndDrop
        expect(byText(tP(lng)("editParameters.rules.dropPdfText"))).toBeInTheDocument();
        expect(screen.getByDisplayValue(tC(lng)("actions.save"))).toBeInTheDocument();
    });

    test.each(["fr", "en"])("onSubmit fires swal(loadingTitle) then swal(saveSuccess) on fetch .ok in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        const {container} = render(<RulesSettings {...props} />);

        fireEvent.submit(container.querySelector("form"));

        await waitFor(() => expect(swal).toHaveBeenCalledTimes(2));
        expect(swal.mock.calls[0][0].title).toBe(tC(lng)("loading"));
        expect(swal.mock.calls[1][0].title).toBe(tP(lng)("shared.saveCompleted"));
    });

    test.each(["fr", "en"])("onSubmit fires swal(genericError) on fetch !ok in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        global.fetch = vi.fn().mockResolvedValue({ok: false, json: () => Promise.resolve({})});
        const {container} = render(<RulesSettings {...props} />);

        fireEvent.submit(container.querySelector("form"));

        await waitFor(() => expect(swal).toHaveBeenCalledTimes(2));
        expect(swal.mock.calls[1][0].title).toBe(tP(lng)("shared.genericErrorShort"));
    });
});

// ============================================================================================
// 5. TeachersParameters
// ============================================================================================
describe("TeachersParameters", () => {
    const props = {
        teacher_can_edit_planning: false,
        authorize_teachers: false,
        show_teacher_contacts: false,
        teacher_can_manage_courses: false,
    };

    test.each(["fr", "en"])("4 headings + 4 checkbox labels + submit button are translated in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<TeachersParameters {...props} />);

        for (const key of ["planningHeading", "applicationsHeading", "contactsHeading", "coursesHeading"]) {
            expect(screen.getByRole("heading", {name: tP(lng)(`editParameters.teachers.${key}`)})).toBeInTheDocument();
        }
        for (const key of ["planningLabel", "applicationsLabel", "contactsLabel", "coursesLabel"]) {
            expect(byText(tP(lng)(`editParameters.teachers.${key}`))).toBeInTheDocument();
        }
        expect(screen.getByRole("button", {name: tP(lng)("shared.saveButton")})).toBeInTheDocument();
    });

    test.each(["fr", "en"])("api success (data.success) -> success swal + location.reload in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<TeachersParameters {...props} />);

        fireEvent.click(screen.getByRole("button", {name: tP(lng)("shared.saveButton")}));
        expect(apiState.lastSuccess).toBeTypeOf("function");

        apiState.lastSuccess({success: true});

        expect(swal).toHaveBeenLastCalledWith(expect.objectContaining({
            title: tP(lng)("shared.saveSuccessTitle"),
            text: tP(lng)("editParameters.teachers.saveSuccessText"),
        }));
        expect(reload).toHaveBeenCalled();
    });

    test.each(["fr", "en"])("api success with data.success=false -> error swal in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<TeachersParameters {...props} />);

        fireEvent.click(screen.getByRole("button", {name: tP(lng)("shared.saveButton")}));
        apiState.lastSuccess({success: false});

        expect(swal).toHaveBeenLastCalledWith(expect.objectContaining({
            title: tP(lng)("shared.errorTitle"),
            text: tP(lng)("editParameters.teachers.saveErrorText"),
        }));
    });

    test.each(["fr", "en"])("api .error callback -> error swal in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<TeachersParameters {...props} />);

        fireEvent.click(screen.getByRole("button", {name: tP(lng)("shared.saveButton")}));
        expect(apiState.lastError).toBeTypeOf("function");
        apiState.lastError();

        expect(swal).toHaveBeenLastCalledWith(expect.objectContaining({
            title: tP(lng)("shared.errorTitle"),
            text: tP(lng)("editParameters.teachers.saveErrorText"),
        }));
    });
});

// ============================================================================================
// 6. DragAndDrop (rendered directly; react-dropzone stubbed -> Dropzone branch)
// ============================================================================================
describe("DragAndDrop", () => {
    test.each(["fr", "en"])("Dropzone branch: select button + textDisplayed render in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(
            <DragAndDrop
                acceptedTypes="application/pdf"
                setFile={vi.fn()}
                textDisplayed="drop a file here"
            />,
        );

        expect(
            screen.getByRole("button", {name: tC(lng)("dragAndDrop.selectButton")}),
        ).toBeInTheDocument();
        expect(screen.getByText("drop a file here")).toBeInTheDocument();
    });
});
