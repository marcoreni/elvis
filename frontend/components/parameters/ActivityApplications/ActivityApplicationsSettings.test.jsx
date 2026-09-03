// i18n extraction test — i18n-06 "parameters" domain, lot D (the 5 ActivityApplications/*
// components).
//
// Covers the lot-D extraction of `frontend/components/parameters/ActivityApplications/`:
//   - ApplicationParameters      — fn `useTranslation("parameters")`. `t("common:loading")`
//       placeholder, two <h3> + a hint <p>, the auto-assign checkbox <label>, a
//       `common:actions.validate` submit button. Mount `api.set()...get()`; swal titles on the
//       captured callbacks: load error -> `activityApplications.settings.loadError`; onSubmit
//       success -> `.saveSuccess`, error -> `.saveError`.
//   - ApplicationStepParameters  — fn `useTranslation("parameters")`, props {parameter_label, desc}.
//       `<h3>{desc}</h3>` (prop, NOT translated), checkbox <label> = `.stepParams.showTextLabel`,
//       `common:actions.save` submit. `swal(t(".stepParams.loadError" | ".saveError"), ..., "error")`
//       positional; `toast.success(t(".stepParams.saveSuccess"))`.
//   - ConsentDocumentModal       — fn `useTranslation("parameters")`, props {document, isOpen, ...}.
//       <h3> = `.consentModal.title`; react-final-form <Field> label/placeholder pairs; a hint
//       <span> = `.consentModal.schoolNameHint` (keeps the LITERAL `{schoolName}` token,
//       un-interpolated); DragAndDrop `fileLabel`/`textDisplayed`; checkbox `label`/`extraTitle`;
//       cancel/save buttons; `required` field validator -> `.consentModal.requiredError`.
//   - ConsentDocumentsList       — fn `useTranslation("parameters")`. Intro <p> = `.consentList.intro`,
//       add <button> = `.consentList.addButton`. swal titles on api error callbacks:
//       `.consentList.fetchError` / `.deleteError`.
//   - ApplicationStatusTable     — `class extends Component` (its own ReactTable render, NOT
//       BaseDataTable), now `export default withTranslation("parameters")(...)`. `const {t} =
//       this.props` in `render()` and `deleteStatus()`. Column Headers `shared.colLabel` /
//       `.statusTable.colStopping` / `.colActive` / `shared.actions`; boolean Cells
//       `shared.yes`/`shared.no`; ReactTable pagination props `common:reactTable.*`.
//       `deleteStatus(status)` swal: `title: t(".statusTable.deleteConfirm", {name: status.label})`,
//       `cancelButtonText: t("shared.deleteConfirmNo")`, `confirmButtonText:
//       t("shared.deleteConfirmYes")`; DELETE error branch -> second swal `t("shared.errorTitle")`.
//
// New keys: `frontend/locales/{fr,en}/parameters.json` — `shared.colLabel` (1) +
// `activityApplications.{settings,stepParams,consentModal,consentList,statusTable}.*` (29).
// `parameters.json` is 133 leaves. The lot-A `activityApplications.tabs.*` / `.stepDesc.*` must
// still be present (regression guard).

import React from "react";
import {render, screen, fireEvent, act, waitFor} from "@testing-library/react";
import i18n from "../../../i18n";
import fr from "../../../locales/fr/parameters.json";
import en from "../../../locales/en/parameters.json";

// --- api: chainable no-op stub; last success/error callbacks captured for hand-firing --------
const apiState = vi.hoisted(() => ({lastSuccess: null, lastError: null}));
vi.mock("../../../tools/api", () => ({
    set: () => {
        const c = {};
        c.success = (fn) => { apiState.lastSuccess = fn; return c; };
        c.error = (fn) => { apiState.lastError = fn; return c; };
        c.before = () => c;
        c.useLoading = () => c;
        c.get = () => c;
        c.post = () => c;
        c.put = () => c;
        c.del = () => c;
        return c;
    },
}));

// --- sweetalert2 stub ---------------------------------------------------------------------------
vi.mock("sweetalert2", () => ({default: vi.fn(() => Promise.resolve({}))}));

// --- react-table stub: surface every column's string `Header` in order, and render every
//     column's `Cell` once against `globalThis.__rtRow` so Cell-internal i18n (Oui/Non) is
//     reachable without real table data. --------------------------------------------------------
vi.mock("react-table", () => ({
    default: ({columns = []}) => (
        <div data-testid="react-table">
            {columns.map((col, i) => (
                <span key={i} data-testid="col-header">
                    {typeof col.Header === "string" ? col.Header : ""}
                </span>
            ))}
            {columns.map((col, i) =>
                col.Cell ? (
                    <span key={`cell-${i}`} data-testid="col-cell">
                        {col.Cell({original: globalThis.__rtRow || {}})}
                    </span>
                ) : null,
            )}
        </div>
    ),
}));

// --- react-modal: render children unconditionally; expose setAppElement (ConsentDocumentsList) --
vi.mock("react-modal", () => ({
    default: Object.assign(({children}) => <div data-testid="react-modal">{children}</div>, {
        setAppElement: vi.fn(),
    }),
}));

// --- common form primitives: prop-echoing stubs ----------------------------------------------
vi.mock("../../common/Input", () => ({
    default: (props) => (
        <div data-testid="input-field">
            <span data-testid="field-label">{props.label}</span>
            <span data-testid="field-placeholder">
                {props.htmlOptions && props.htmlOptions.placeholder}
            </span>
            <span data-testid="field-error">{props.meta && props.meta.error}</span>
        </div>
    ),
}));
vi.mock("../../common/InputSelect", () => ({default: () => <div data-testid="input-select" />}));
vi.mock("../../common/Checkbox", () => ({
    default: (props) => (
        <div data-testid="checkbox-field">
            <span data-testid="checkbox-label">{props.label}</span>
            <span data-testid="checkbox-extra-title">{props.extraTitle}</span>
        </div>
    ),
}));
vi.mock("../../editParameters/DragAndDrop", () => ({
    default: (props) => (
        <div data-testid="drag-and-drop">
            <span data-testid="dnd-file-label">{props.fileLabel}</span>
            <span data-testid="dnd-text-displayed">{props.textDisplayed}</span>
        </div>
    ),
}));

// --- ApplicationStepParameters' heavy deps -------------------------------------------------------
vi.mock("react-draft-wysiwyg", () => ({Editor: () => <div data-testid="wysiwyg-editor" />}));
vi.mock("draft-js", () => ({
    EditorState: {createEmpty: () => ({}), createWithContent: () => ({})},
    convertToRaw: () => ({}),
    convertFromRaw: () => ({}),
    ContentState: {createFromText: () => ({})},
}));
vi.mock("react-toastify", () => ({toast: {success: vi.fn(), error: vi.fn()}}));

// --- ConsentDocumentsList's child modal: stub (the real one is exercised separately) ----------
vi.mock("./ConsentDocumentModal", () => ({
    default: () => <div data-testid="consent-document-modal-stub" />,
}));

import swal from "sweetalert2";
import ApplicationParameters from "./ApplicationParameters";
import ApplicationStepParameters from "./ApplicationStepParameters";
import ConsentDocumentsList from "./ConsentDocumentsList";
import ApplicationStatusTable from "./ApplicationStatusTable";

// the real ConsentDocumentModal, bypassing the stub above
let ConsentDocumentModal;
beforeAll(async () => {
    ConsentDocumentModal = (await vi.importActual("./ConsentDocumentModal")).default;
});

const tP = (lng) => i18n.getFixedT(lng, "parameters");
const tC = (lng) => i18n.getFixedT(lng, "common");

beforeEach(() => {
    swal.mockClear();
    swal.mockImplementation(() => Promise.resolve({}));
    apiState.lastSuccess = null;
    apiState.lastError = null;
    globalThis.__rtRow = {};
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(""),
    });
});

afterEach(async () => {
    await i18n.changeLanguage("fr");
    vi.clearAllMocks();
    delete globalThis.__rtRow;
});

// ============================================================================================
// 1. i18n layer — lot-D key set resolves fr AND en, parity, interpolation, literal token
// ============================================================================================
describe("parameters activityApplications.* (lot D) — i18n layer", () => {
    const flattenAll = (obj, p = "") =>
        Object.entries(obj).flatMap(([k, v]) =>
            v && typeof v === "object" ? flattenAll(v, `${p}${k}.`) : [`${p}${k}`],
        );

    const GROUPS = ["settings", "stepParams", "consentModal", "consentList", "statusTable"];
    const keysFor = (d) =>
        GROUPS.flatMap((g) =>
            Object.keys(d.activityApplications[g]).map((k) => `activityApplications.${g}.${k}`),
        ).concat(["shared.colLabel"]);

    const FR_KEYS = keysFor(fr);
    const EN_KEYS = keysFor(en);

    test("fr and en expose exactly the same lot-D key set (29 activityApplications.* + shared.colLabel)", () => {
        expect(new Set(EN_KEYS)).toEqual(new Set(FR_KEYS));
        expect(FR_KEYS).toHaveLength(30);
        // the five sub-groups alone account for 29 keys
        expect(FR_KEYS.filter((k) => k.startsWith("activityApplications."))).toHaveLength(29);
    });

    test("parameters.json fr/en leaf counts stay in lock-step (grows across lots)", () => {
        expect(flattenAll(fr).length).toBe(flattenAll(en).length);
        expect(flattenAll(fr).length).toBeGreaterThanOrEqual(133);
    });

    test.each(["fr", "en"])(
        "every lot-D key resolves to real, non-empty, double-brace-free copy in %s",
        (lng) => {
            const t = tP(lng);
            for (const key of FR_KEYS) {
                const v = t(key, {name: "Zephyr"});
                expect(typeof v).toBe("string");
                expect(v.length).toBeGreaterThan(0);
                expect(v).not.toBe(key);
                expect(v).not.toBe(key.split(".").pop());
                expect(v).not.toMatch(/\{\{/);
            }
        },
    );

    test.each(["fr", "en"])(
        "statusTable.deleteConfirm interpolates {{name}} — value embedded, no leftover braces (%s)",
        (lng) => {
            const v = tP(lng)("activityApplications.statusTable.deleteConfirm", {name: "Traitée"});
            expect(v).toContain("Traitée");
            expect(v).not.toContain("{");
        },
    );

    test.each(["fr", "en"])(
        "consentModal.schoolNameHint keeps the literal {schoolName} token, un-interpolated (%s)",
        (lng) => {
            const v = tP(lng)("activityApplications.consentModal.schoolNameHint", {name: "X"});
            expect(v).toContain("{schoolName}");
            expect(v).not.toMatch(/\{\{/);
        },
    );

    test("explicit fr / en copy for a sample of lot-D keys", () => {
        expect(tP("fr")("activityApplications.settings.defaultStatusHeading")).toBe(
            "Statut d'inscription par défaut",
        );
        expect(tP("en")("activityApplications.settings.defaultStatusHeading")).toBe(
            "Default enrollment status",
        );
        expect(tP("fr")("shared.colLabel")).toBe("Libellé");
        expect(tP("en")("shared.colLabel")).toBe("Label");
        expect(tP("fr")("activityApplications.consentModal.requiredError")).toBe("requis");
        expect(tP("en")("activityApplications.consentModal.requiredError")).toBe("required");
    });

    test("regression: lot-A activityApplications.tabs.* / stepDesc.* still resolve", () => {
        expect(tP("fr")("activityApplications.tabs.statuses")).toBe("Statuts d'inscription");
        expect(tP("en")("activityApplications.tabs.statuses")).toBe("Enrollment statuses");
        expect(tP("fr")("activityApplications.stepDesc.pricing")).toBe("Message tarifs");
        expect(tP("en")("activityApplications.stepDesc.pricing")).toBe("Pricing message");
    });
});

// ============================================================================================
// 2. ApplicationParameters — loading placeholder, headings/hint/label/button, swal callbacks
// ============================================================================================
describe("ApplicationParameters", () => {
    const HEADINGS = {
        fr: ["Statut d'inscription par défaut", "Attribution automatique du statut cours attribué"],
        en: ["Default enrollment status", "Automatic assignment of the 'course assigned' status"],
    };

    function fireLoaded() {
        act(() => {
            apiState.lastSuccess({
                activityApplicationStatusList: [{id: 1, label: "S"}],
                defaultActivityApplicationStatus: {id: 1},
                autoAssignEnabled: false,
            });
        });
    }

    test.each(["fr", "en"])("shows the common:loading placeholder before data arrives in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<ApplicationParameters />);
        expect(screen.getByText(tC(lng)("loading"))).toBeInTheDocument();
    });

    test.each(["fr", "en"])(
        "renders both <h3> + the hint <p> + the checkbox <label> + the validate button, translated in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(<ApplicationParameters />);
            fireLoaded();

            for (const h of HEADINGS[lng]) {
                expect(screen.getByRole("heading", {name: h})).toBeInTheDocument();
            }
            expect(
                screen.getByText(tP(lng)("activityApplications.settings.defaultStatusHint")),
            ).toBeInTheDocument();
            expect(
                screen.getByText(tP(lng)("activityApplications.settings.enableLabel")),
            ).toBeInTheDocument();
            expect(
                screen.getByRole("button", {name: tC(lng)("actions.validate")}),
            ).toBeInTheDocument();
        },
    );

    test.each(["fr", "en"])("mount load-error fires swal titled settings.loadError in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<ApplicationParameters />);
        act(() => { apiState.lastError(); });

        expect(swal).toHaveBeenCalledTimes(1);
        expect(swal.mock.calls[0][0].title).toBe(
            tP(lng)("activityApplications.settings.loadError"),
        );
    });

    test.each(["fr", "en"])("onSubmit success fires swal titled settings.saveSuccess in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<ApplicationParameters />);
        fireLoaded();

        fireEvent.click(screen.getByRole("button", {name: tC(lng)("actions.validate")}));
        act(() => { apiState.lastSuccess(); });

        expect(swal).toHaveBeenCalledTimes(1);
        expect(swal.mock.calls[0][0].title).toBe(
            tP(lng)("activityApplications.settings.saveSuccess"),
        );
    });

    test.each(["fr", "en"])("onSubmit error fires swal titled settings.saveError in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<ApplicationParameters />);
        fireLoaded();

        fireEvent.click(screen.getByRole("button", {name: tC(lng)("actions.validate")}));
        act(() => { apiState.lastError(); });

        expect(swal).toHaveBeenCalledTimes(1);
        expect(swal.mock.calls[0][0].title).toBe(
            tP(lng)("activityApplications.settings.saveError"),
        );
    });
});

// ============================================================================================
// 3. ApplicationStepParameters — desc prop <h3>, checkbox label + save button, mount error swal
// ============================================================================================
describe("ApplicationStepParameters", () => {
    test.each(["fr", "en"])(
        "<h3> is the untranslated `desc` prop; checkbox label + save button are translated in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(<ApplicationStepParameters parameter_label="pricing" desc="Msg" />);

            expect(screen.getByRole("heading", {name: "Msg"})).toBeInTheDocument();
            expect(
                screen.getByText(tP(lng)("activityApplications.stepParams.showTextLabel")),
            ).toBeInTheDocument();
            expect(
                screen.getByRole("button", {name: tC(lng)("actions.save")}),
            ).toBeInTheDocument();
        },
    );

    // The mount `.error(err => ...)` closure calls
    //   swal(t("activityApplications.stepParams.loadError"), err.error, "error")
    // (the `res` -> `err` param-name bug was fixed in this lot).
    test.each(["fr", "en"])("mount load-error swal is titled stepParams.loadError in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<ApplicationStepParameters parameter_label="pricing" desc="Msg" />);

        expect(typeof apiState.lastError).toBe("function");
        act(() => { apiState.lastError({error: "backend detail"}); });

        expect(swal).toHaveBeenCalledTimes(1);
        expect(swal.mock.calls[0][0]).toBe(
            tP(lng)("activityApplications.stepParams.loadError"),
        );
        expect(swal.mock.calls[0][1]).toBe("backend detail");
    });
});

// ============================================================================================
// 4. ConsentDocumentModal — title, field label/placeholder pairs, literal hint, DnD, checkbox,
//    buttons, `required` validator message
// ============================================================================================
describe("ConsentDocumentModal (real component via vi.importActual)", () => {
    test.each(["fr", "en"])("renders nothing when isOpen is false (%s)", async (lng) => {
        await i18n.changeLanguage(lng);
        const {container} = render(<ConsentDocumentModal isOpen={false} document={{}} />);
        expect(container).toBeEmptyDOMElement();
    });

    test.each(["fr", "en"])(
        "title <h3> + field labels + placeholders + hint + DnD + checkbox + buttons are translated in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(<ConsentDocumentModal isOpen document={{}} />);

            expect(
                screen.getByRole("heading", {name: tP(lng)("activityApplications.consentModal.title")}),
            ).toBeInTheDocument();

            const labels = screen.getAllByTestId("field-label").map((e) => e.textContent);
            expect(labels).toContain(tP(lng)("activityApplications.consentModal.titleLabel"));
            expect(labels).toContain(tP(lng)("activityApplications.consentModal.contentLabel"));

            const placeholders = screen
                .getAllByTestId("field-placeholder")
                .map((e) => e.textContent);
            expect(placeholders).toContain(
                tP(lng)("activityApplications.consentModal.titlePlaceholder"),
            );
            expect(placeholders).toContain(
                tP(lng)("activityApplications.consentModal.contentPlaceholder"),
            );

            // hint <span> — the literal `{schoolName}` token survives into the DOM
            expect(screen.getByText(/\{schoolName\}/)).toBeInTheDocument();

            expect(screen.getByTestId("dnd-file-label")).toHaveTextContent(
                tP(lng)("activityApplications.consentModal.attachedFileLabel").trim(),
            );
            expect(screen.getByTestId("dnd-text-displayed")).toHaveTextContent(
                tP(lng)("activityApplications.consentModal.dropPdfText"),
            );

            expect(screen.getByTestId("checkbox-label")).toHaveTextContent(
                tP(lng)("activityApplications.consentModal.consentCheckboxLabel"),
            );
            expect(screen.getByTestId("checkbox-extra-title")).toHaveTextContent(
                tP(lng)("activityApplications.consentModal.consentExtraTitle"),
            );

            expect(
                screen.getByRole("button", {name: tC(lng)("actions.cancel")}),
            ).toBeInTheDocument();
            expect(
                screen.getByRole("button", {name: tC(lng)("actions.save")}),
            ).toBeInTheDocument();
        },
    );

    test.each(["fr", "en"])(
        "the `required` field validator surfaces consentModal.requiredError for an empty value in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(<ConsentDocumentModal isOpen document={{}} />);

            const errors = screen
                .getAllByTestId("field-error")
                .map((e) => e.textContent)
                .filter(Boolean);
            expect(errors).toContain(
                tP(lng)("activityApplications.consentModal.requiredError"),
            );
        },
    );
});

// ============================================================================================
// 5. ConsentDocumentsList — intro <p> + add button, fetch-error swal
// ============================================================================================
describe("ConsentDocumentsList", () => {
    test.each(["fr", "en"])("intro <p> + add <button> are translated in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<ConsentDocumentsList />);

        expect(
            screen.getByText(tP(lng)("activityApplications.consentList.intro")),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", {name: tP(lng)("activityApplications.consentList.addButton")}),
        ).toBeInTheDocument();
    });

    test.each(["fr", "en"])("mount fetch-error fires swal titled consentList.fetchError in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<ConsentDocumentsList />);

        expect(typeof apiState.lastError).toBe("function");
        act(() => { apiState.lastError(); });

        expect(swal).toHaveBeenCalledTimes(1);
        expect(swal.mock.calls[0][0].title).toBe(
            tP(lng)("activityApplications.consentList.fetchError"),
        );
    });
});

// ============================================================================================
// 6. ApplicationStatusTable — HOC shape, translated column headers, deleteStatus swal
// ============================================================================================
describe("ApplicationStatusTable", () => {
    const HEADERS = {
        fr: ["#", "Libellé", "Arrêt ?", "Actif ?", "Actions"],
        en: ["#", "Label", "Stopping?", "Active?", "Actions"],
    };

    test("default export is withTranslation-wrapped over a plain React.Component (NOT BaseDataTable)", () => {
        expect(ApplicationStatusTable.WrappedComponent).toBeDefined();
        expect(ApplicationStatusTable.WrappedComponent.prototype instanceof React.Component).toBe(true);
        expect(Object.getPrototypeOf(ApplicationStatusTable.WrappedComponent.prototype)).toBe(
            React.Component.prototype,
        );
    });

    test.each(["fr", "en"])("renders the translated column headers in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<ApplicationStatusTable />);

        const got = screen
            .getAllByTestId("col-header")
            .map((el) => el.textContent)
            .filter(Boolean);
        expect(got).toEqual(HEADERS[lng]);
    });

    test.each(["fr", "en"])(
        "boolean Cells render shared.yes / shared.no in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            globalThis.__rtRow = {is_stopping: true, is_active: false};
            render(<ApplicationStatusTable />);

            const cellText = screen
                .getAllByTestId("col-cell")
                .map((el) => el.textContent);
            expect(cellText).toContain(tP(lng)("shared.yes"));
            expect(cellText).toContain(tP(lng)("shared.no"));
        },
    );

    function mountInstance(lng) {
        const Klass = ApplicationStatusTable.WrappedComponent;
        let inst;
        render(<Klass t={tP(lng)} i18n={i18n} tReady ref={(r) => { inst = r; }} />);
        return inst;
    }

    test.each(["fr", "en"])(
        "deleteStatus builds a %s-translated swal (deleteConfirm {{name}} + cancel + confirm)",
        async (lng) => {
            await i18n.changeLanguage(lng);
            const t = tP(lng);
            const inst = mountInstance(lng);

            inst.deleteStatus({id: 1, label: "Traitée"});

            expect(swal).toHaveBeenCalledTimes(1);
            const opts = swal.mock.calls[0][0];
            expect(opts.title).toBe(
                t("activityApplications.statusTable.deleteConfirm", {name: "Traitée"}),
            );
            expect(opts.title).toContain("Traitée");
            expect(opts.title).not.toContain("{");
            expect(opts.cancelButtonText).toBe(t("shared.deleteConfirmNo"));
            expect(opts.confirmButtonText).toBe(t("shared.deleteConfirmYes"));
        },
    );

    test.each(["fr", "en"])(
        "deleteStatus DELETE-error branch titles the second swal with shared.errorTitle (%s)",
        async (lng) => {
            await i18n.changeLanguage(lng);
            const t = tP(lng);
            swal.mockImplementation(() => Promise.resolve({value: true}));
            global.fetch = vi.fn().mockResolvedValue({
                status: 422,
                text: () => Promise.resolve("boom"),
            });

            const inst = mountInstance(lng);
            inst.deleteStatus({id: 1, label: "Traitée"});
            await new Promise((r) => setTimeout(r, 0));
            await new Promise((r) => setTimeout(r, 0));

            expect(swal).toHaveBeenCalledTimes(2);
            expect(swal.mock.calls[1][0].title).toBe(t("shared.errorTitle"));
            expect(swal.mock.calls[1][0].text).toBe("boom");
        },
    );

    test("explicit fr / en strings (deleteStatus swal)", async () => {
        await i18n.changeLanguage("fr");
        mountInstance("fr").deleteStatus({id: 1, label: "Traitée"});
        let opts = swal.mock.calls[0][0];
        expect(opts.title).toBe("Voulez-vous vraiment supprimer le statut 'Traitée' ?");
        expect(opts.cancelButtonText).toBe("non");
        expect(opts.confirmButtonText).toBe("oui");

        swal.mockClear();

        await i18n.changeLanguage("en");
        mountInstance("en").deleteStatus({id: 1, label: "Traitée"});
        opts = swal.mock.calls[0][0];
        expect(opts.title).toBe("Do you really want to delete the status 'Traitée'?");
        expect(opts.cancelButtonText).toBe("no");
        expect(opts.confirmButtonText).toBe("yes");
    });
});
