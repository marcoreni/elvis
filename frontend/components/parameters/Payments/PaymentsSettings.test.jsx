// i18n extraction test — i18n-06 "parameters" domain, lot C (the 8 Payments/* components).
//
// Covers the lot-C extraction of `frontend/components/parameters/Payments/`:
//   - PaymentsMethods / PaymentsStatus — `class X extends BaseDataTable` (the class-based
//     `../BaseDataTable`), now `export default withTranslation("parameters")(X)`.
//       * constructor: `const {t} = props;` builds `this.state.columns` `Header`s and the
//         Oui/Non boolean `Cell`s (`t("shared.yes") / t("shared.no")`).
//       * `deleteStatus(status)`: `const {t} = this.props;` then a `swal` with
//         `title: t("payments.{methods,status}.deleteConfirm", {name: status.label})`,
//         `cancelButtonText: t("shared.deleteConfirmNo")`,
//         `confirmButtonText: t("shared.deleteConfirmYes")`; the DELETE error branch titles a
//         second swal `t("shared.errorTitle")` — the `const {t}` nested-closure guard.
//   - Coupons — fn `useTranslation("parameters")`; a module-level `CreateButton` fn with its own
//     `useTranslation("parameters")` (`payments.coupons.createButton`). Column `Header`s,
//     `oneResourceTypeName` / `thisResourceTypeName`. Imports the *functional*
//     `../../common/baseDataTable/BaseDataTable` (mocked here).
//   - CouponFormContent — `class extends React.Component` -> `withTranslation("parameters")`;
//     three `<Field label={t("payments.coupons.form.*")}>`.
//   - AdhesionSettings — fn `useTranslation`; nested `deleteStatus(adh)` swal
//     (`payments.adhesion.deleteConfirm` + `common:actions.cancel` / `common:actions.delete`),
//     checkbox `enableLabel`, ReactTable `payments.adhesion.cols.*` headers.
//   - AdhesionEditModal — fn `useTranslation`; `<h2>` edit/new title ternary, the three field
//     `<label>`s, cancel/save buttons, `initialValues.label` default (`modal.defaultLabel`).
//   - EditPaymentScheduleOptions — fn `useTranslation`; three `<h4>` headings, checkbox label,
//     add link, submit button; `onItemDelete` swal (`common:confirm.sure` + delete.* keys).
//
// New keys live in `frontend/locales/{fr,en}/parameters.json` under `shared.*` (7) and
// `payments.{cols,methods,status,adhesion,scheduleOptions,coupons}.*` (45) — plus the lot-A
// `payments.tabs.*` (5), which a lot-C script bug briefly dropped (regression guard below).

import React from "react";
import {render, screen, waitFor, act} from "@testing-library/react";
import {Form} from "react-final-form";
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
        c.get = () => c;
        c.post = () => c;
        c.put = () => c;
        c.del = () => c;
        return c;
    },
}));

// --- react-table stub: surface every column's string `Header` in order, plus render each
//     column's `Cell` once against `globalThis.__rtRow` so `Cell`-internal i18n (Oui/Non, the
//     AdhesionSettings trash button -> `deleteStatus`) is reachable without real table data. ---
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
                        {col.Cell({
                            original: globalThis.__rtRow || {},
                            value: (globalThis.__rtRow || {}).value,
                        })}
                    </span>
                ) : null,
            )}
        </div>
    ),
}));

// --- sweetalert2 stub -----------------------------------------------------------------------
vi.mock("sweetalert2", () => ({default: vi.fn(() => Promise.resolve({}))}));

// --- Coupons' functional BaseDataTable: render headers / Cells / resource-type-names /
//     createButton / formContentComponent (inside a real <Form> for the <Field>s) ------------
vi.mock("../../common/baseDataTable/BaseDataTable", () => ({
    default: (props) => {
        const CreateButton = props.createButton;
        const FormContent = props.formContentComponent;
        return (
            <div data-testid="base-data-table">
                {(props.columns || []).map((col, i) => (
                    <span key={i} data-testid="coupon-col-header">
                        {typeof col.Header === "string" ? col.Header : ""}
                    </span>
                ))}
                {(props.columns || []).map((col, i) =>
                    col.Cell ? (
                        <span key={`cc-${i}`} data-testid="coupon-col-cell">
                            {col.Cell({value: true})}
                        </span>
                    ) : null,
                )}
                <span data-testid="one-resource-type">{props.oneResourceTypeName}</span>
                <span data-testid="this-resource-type">{props.thisResourceTypeName}</span>
                {CreateButton ? <CreateButton onCreate={() => {}} /> : null}
                {FormContent ? (
                    <Form onSubmit={() => {}} render={() => <FormContent isUpdate={false} />} />
                ) : null}
            </div>
        );
    },
}));
vi.mock("../../common/baseDataTable/DataService", () => ({
    default: class DataServiceStub {},
}));
vi.mock("../../common/Input", () => ({
    default: (props) => <div data-testid="field-label">{props.label}</div>,
}));
vi.mock("../../common/Checkbox", () => ({
    default: (props) => <div data-testid="field-label">{props.label}</div>,
}));

// --- AdhesionSettings' heavy child (real one exercised separately via vi.importActual) -------
vi.mock("./AdhesionEditModal", () => ({
    default: ({children}) => <span data-testid="adhesion-edit-modal-stub">{children}</span>,
}));

// --- react-modal: render children unconditionally so the modal body is inspectable ----------
vi.mock("react-modal", () => ({
    default: ({children}) => <div data-testid="react-modal">{children}</div>,
}));

// --- EditPaymentScheduleOptions' heavy deps ------------------------------------------------
vi.mock("react-draft-wysiwyg", () => ({Editor: () => <div data-testid="wysiwyg-editor" />}));
vi.mock("draft-js", () => ({
    EditorState: {createEmpty: () => ({}), createWithContent: () => ({})},
    convertToRaw: () => ({}),
    convertFromRaw: () => ({}),
    ContentState: {createFromText: () => ({})},
}));
vi.mock("react-toastify", () => ({toast: {success: vi.fn(), error: vi.fn()}}));

import swal from "sweetalert2";
import BaseDataTable from "../BaseDataTable";
import PaymentsMethods from "./PaymentsMethods";
import PaymentsStatus from "./PaymentsStatus";
import Coupons from "./Coupons";
import CouponFormContent from "./CouponFormContent";
import AdhesionSettings from "./AdhesionSettings";
import EditPaymentScheduleOptions from "./EditPaymentScheduleOptions";

let RealAdhesionEditModal;
beforeAll(async () => {
    RealAdhesionEditModal = (await vi.importActual("./AdhesionEditModal")).default;
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
// 1. i18n layer — shared.* + payments.* resolve in fr AND en, fr/en parity, interpolation
// ============================================================================================
describe("parameters shared.* + payments.* — i18n layer", () => {
    const flatten = (obj, prefix = "") =>
        Object.entries(obj).flatMap(([k, v]) =>
            v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
        );

    const SUBSET = (d) => ({shared: d.shared, payments: d.payments});
    const FR_KEYS = flatten(SUBSET(fr));
    const EN_KEYS = flatten(SUBSET(en));

    test("fr and en expose exactly the same shared.* + payments.* key set", () => {
        expect(new Set(EN_KEYS)).toEqual(new Set(FR_KEYS));
        // shared grows across lots (C: 7, D: +colLabel = 8, …); payments is stable at 50
        // (tabs 5 lot A + non-tabs 45 lot C). Guard the payments count exactly, shared loosely.
        expect(flatten({payments: fr.payments})).toHaveLength(50);
        expect(flatten({x: fr.shared}).length).toBeGreaterThanOrEqual(7);
    });

    test("the lot-C additions are present: shared.* atoms + 45 non-tab payments.*", () => {
        for (const k of [
            "actions", "yes", "no", "errorTitle", "deleteConfirmYes", "deleteConfirmNo", "genericError",
        ]) {
            expect(fr.shared).toHaveProperty(k);
        }
        const paymentsNonTabs = flatten({payments: fr.payments}).filter(
            (k) => !k.startsWith("payments.tabs."),
        );
        expect(paymentsNonTabs).toHaveLength(45);
    });

    test.each(["fr", "en"])(
        "every shared.* + payments.* key resolves to real, non-empty, brace-free copy in %s",
        (lng) => {
            const t = tP(lng);
            for (const key of FR_KEYS) {
                const v = t(key, {name: "X", label: "Y"});
                expect(typeof v).toBe("string");
                expect(v.length).toBeGreaterThan(0);
                expect(v).not.toBe(key);
                expect(v).not.toMatch(/\{\{/);
            }
        },
    );

    // The four interpolating keys must embed the passed value and leave no braces.
    const NAME_KEYS = ["payments.methods.deleteConfirm", "payments.status.deleteConfirm"];
    const LABEL_KEYS = ["payments.adhesion.deleteConfirm", "payments.adhesion.deleteImpossibleText"];

    test.each(["fr", "en"])("{{name}} interpolation keys embed the value in %s", (lng) => {
        const t = tP(lng);
        for (const key of NAME_KEYS) {
            const v = t(key, {name: "Zephyr"});
            expect(v).toContain("Zephyr");
            expect(v).not.toMatch(/\{\{/);
        }
    });

    test.each(["fr", "en"])("{{label}} interpolation keys embed the value in %s", (lng) => {
        const t = tP(lng);
        for (const key of LABEL_KEYS) {
            const v = t(key, {label: "Zephyr"});
            expect(v).toContain("Zephyr");
            expect(v).not.toMatch(/\{\{/);
        }
    });

    test("shared.deleteConfirmYes / deleteConfirmNo resolve to the lowercase oui/non forms", () => {
        expect(tP("fr")("shared.deleteConfirmYes")).toBe("oui");
        expect(tP("fr")("shared.deleteConfirmNo")).toBe("non");
        expect(tP("en")("shared.deleteConfirmYes")).toBe("yes");
        expect(tP("en")("shared.deleteConfirmNo")).toBe("no");
    });

    test("regression: payments.tabs.adhesion (lot A) still resolves — not dropped by lot C", () => {
        expect(tP("fr")("payments.tabs.adhesion")).toBe("Adhésion");
        expect(tP("en")("payments.tabs.adhesion")).toBe("Membership");
        // the whole lot-A tab set is still there
        expect(flatten({x: fr.payments.tabs})).toHaveLength(5);
    });
});

// ============================================================================================
// 2. PaymentsMethods / PaymentsStatus — headers via the HOC, deleteStatus swal via the class
// ============================================================================================
describe("PaymentsMethods / PaymentsStatus — class tables extending BaseDataTable", () => {
    const HEADERS = {
        PaymentsMethods: {
            Component: PaymentsMethods,
            deleteKey: "payments.methods.deleteConfirm",
            fr: ["#", "Libellé", "Afficher au client ?", "Est spécial ?", "Est à crédit ?", "Actions"],
            en: ["#", "Label", "Show to customer?", "Is special?", "Is credit note?", "Actions"],
        },
        PaymentsStatus: {
            Component: PaymentsStatus,
            deleteKey: "payments.status.deleteConfirm",
            fr: ["#", "Libellé", "Couleur", "Actions"],
            en: ["#", "Label", "Color", "Actions"],
        },
    };

    function mountInstance(WrappedDefault, lng) {
        const Klass = WrappedDefault.WrappedComponent;
        let inst;
        render(
            <Klass
                t={tP(lng)}
                i18n={i18n}
                tReady
                urlListData="/x"
                urlNew="/x/new"
                ref={(r) => { inst = r; }}
            />,
        );
        return inst;
    }

    for (const [name, cfg] of Object.entries(HEADERS)) {
        describe(name, () => {
            test.each(["fr", "en"])("renders the translated column headers in %s", async (lng) => {
                await i18n.changeLanguage(lng);
                render(<cfg.Component urlListData="/x" urlNew="/x/new" />);

                const got = screen
                    .getAllByTestId("col-header")
                    .map((el) => el.textContent)
                    .filter(Boolean);
                expect(got).toEqual(cfg[lng]);
            });

            test.each(["fr", "en"])(
                "deleteStatus builds a %s-translated swal (title + cancel + confirm)",
                async (lng) => {
                    await i18n.changeLanguage(lng);
                    const t = tP(lng);
                    const inst = mountInstance(cfg.Component, lng);

                    inst.deleteStatus({id: 1, label: "Visa"});

                    expect(swal).toHaveBeenCalledTimes(1);
                    const opts = swal.mock.calls[0][0];
                    expect(opts.title).toBe(t(cfg.deleteKey, {name: "Visa"}));
                    expect(opts.title).toContain("Visa");
                    expect(opts.title).not.toMatch(/\{\{/);
                    expect(opts.cancelButtonText).toBe(t("shared.deleteConfirmNo"));
                    expect(opts.confirmButtonText).toBe(t("shared.deleteConfirmYes"));
                },
            );

            test.each(["fr", "en"])(
                "deleteStatus error branch titles the second swal with shared.errorTitle (%s)",
                async (lng) => {
                    await i18n.changeLanguage(lng);
                    const t = tP(lng);
                    swal.mockImplementation(() => Promise.resolve({value: true}));
                    global.fetch = vi.fn().mockResolvedValue({
                        status: 422,
                        text: () => Promise.resolve("boom"),
                    });

                    const inst = mountInstance(cfg.Component, lng);
                    inst.deleteStatus({id: 1, label: "Visa"});
                    await new Promise((r) => setTimeout(r, 0));
                    await new Promise((r) => setTimeout(r, 0));

                    expect(swal).toHaveBeenCalledTimes(2);
                    expect(swal.mock.calls[1][0].title).toBe(t("shared.errorTitle"));
                    expect(swal.mock.calls[1][0].text).toBe("boom");
                },
            );
        });
    }

    test.each(["fr", "en"])(
        "PaymentsMethods boolean Cell renders shared.yes / shared.no in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            const t = tP(lng);
            const inst = mountInstance(PaymentsMethods, lng);
            const col = inst.state.columns.find((c) => c.id === "show_payment_method_to_user");

            const {rerender, container} = render(
                <div>{col.Cell({original: {show_payment_method_to_user: true}})}</div>,
            );
            expect(container.textContent).toBe(t("shared.yes"));

            rerender(<div>{col.Cell({original: {show_payment_method_to_user: false}})}</div>);
            expect(container.textContent).toBe(t("shared.no"));
        },
    );

    test("explicit fr / en strings (PaymentsStatus deleteStatus)", async () => {
        await i18n.changeLanguage("fr");
        mountInstance(PaymentsStatus, "fr").deleteStatus({id: 1, label: "Réglé"});
        let opts = swal.mock.calls[0][0];
        expect(opts.title).toBe("Voulez-vous vraiment supprimer le status 'Réglé' ?");
        expect(opts.cancelButtonText).toBe("non");
        expect(opts.confirmButtonText).toBe("oui");

        swal.mockClear();

        await i18n.changeLanguage("en");
        mountInstance(PaymentsStatus, "en").deleteStatus({id: 1, label: "Réglé"});
        opts = swal.mock.calls[0][0];
        expect(opts.title).toBe("Do you really want to delete the status 'Réglé'?");
        expect(opts.cancelButtonText).toBe("no");
        expect(opts.confirmButtonText).toBe("yes");
    });
});

// ============================================================================================
// 3. Coupons + CouponFormContent — headers / CreateButton / resource-type-names / <Field> labels
// ============================================================================================
describe("Coupons + CouponFormContent", () => {
    const COL_HEADERS = {
        fr: ["Id", "Nom du taux de remise", "Taux de remise (%)", "Actif"],
        en: ["Id", "Discount rate name", "Discount rate (%)", "Active"],
    };
    const FORM_LABELS = {
        fr: ["Nom du taux de remise", "Taux de remise (%)", "Activé"],
        en: ["Discount rate name", "Discount rate (%)", "Enabled"],
    };

    test.each(["fr", "en"])("column headers are translated in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<Coupons />);
        const got = screen
            .getAllByTestId("coupon-col-header")
            .map((el) => el.textContent)
            .filter(Boolean);
        expect(got).toEqual(COL_HEADERS[lng]);
    });

    test.each(["fr", "en"])("enabled Cell renders shared.yes in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<Coupons />);
        const cells = screen.getAllByTestId("coupon-col-cell").map((el) => el.textContent);
        expect(cells).toContain(tP(lng)("shared.yes"));
    });

    test.each(["fr", "en"])(
        "the separate CreateButton (its own useTranslation) renders payments.coupons.createButton in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(<Coupons />);
            expect(
                screen.getByRole("button", {name: tP(lng)("payments.coupons.createButton")}),
            ).toBeInTheDocument();
        },
    );

    test.each(["fr", "en"])("oneResourceTypeName / thisResourceTypeName are translated in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<Coupons />);
        expect(screen.getByTestId("one-resource-type")).toHaveTextContent(
            tP(lng)("payments.coupons.oneResourceTypeName"),
        );
        expect(screen.getByTestId("this-resource-type")).toHaveTextContent(
            tP(lng)("payments.coupons.thisResourceTypeName"),
        );
    });

    test.each(["fr", "en"])("CouponFormContent <Field label>s are translated in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<Coupons />);
        const labels = screen.getAllByTestId("field-label").map((el) => el.textContent);
        expect(labels).toEqual(FORM_LABELS[lng]);
    });

    test.each(["fr", "en"])(
        "CouponFormContent rendered directly (WrappedComponent) still translates its labels in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(
                <Form
                    onSubmit={() => {}}
                    render={() => <CouponFormContent t={tP(lng)} tReady i18n={i18n} />}
                />,
            );
            const labels = screen.getAllByTestId("field-label").map((el) => el.textContent);
            expect(labels).toEqual(FORM_LABELS[lng]);
        },
    );
});

// ============================================================================================
// 4. AdhesionSettings — checkbox label + ReactTable headers + nested deleteStatus swal
// ============================================================================================
describe("AdhesionSettings", () => {
    const HEADERS = {
        fr: ["#", "Libellés", "Tarifs (€)", "Par défaut pour la saison", "Actions"],
        en: ["#", "Labels", "Prices (€)", "Default for the season", "Actions"],
    };

    function mockFetchEnabled() {
        global.fetch = vi.fn((url) =>
            String(url).includes("show_adhesion")
                ? Promise.resolve({
                      ok: true,
                      json: () => Promise.resolve({adhesion_enabled: true, seasons: [{id: 1, label: "S1"}]}),
                  })
                : Promise.resolve({ok: true, json: () => Promise.resolve({})}),
        );
    }

    test.each(["fr", "en"])("checkbox label is translated in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        global.fetch = vi.fn().mockResolvedValue({ok: true, json: () => Promise.resolve({})});
        render(<AdhesionSettings />);
        expect(
            await screen.findByText(tP(lng)("payments.adhesion.enableLabel")),
        ).toBeInTheDocument();
    });

    test.each(["fr", "en"])("ReactTable headers + add button are translated in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        mockFetchEnabled();
        render(<AdhesionSettings />);

        await waitFor(() =>
            expect(screen.getByText(tP(lng)("payments.adhesion.cols.labels"))).toBeInTheDocument(),
        );
        const got = screen
            .getAllByTestId("col-header")
            .map((el) => el.textContent)
            .filter(Boolean);
        expect(got).toEqual(HEADERS[lng]);

        // the "add" AdhesionEditModal trigger carries `common:actions.add`
        expect(screen.getAllByTestId("adhesion-edit-modal-stub")[0]).toHaveTextContent(
            tC(lng)("actions.add"),
        );
    });

    test.each(["fr", "en"])(
        "deleteStatus swal: payments.adhesion.deleteConfirm + common:actions.cancel/delete in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            mockFetchEnabled();
            globalThis.__rtRow = {id: 9, label: "Std", built_in: false};

            const {container} = render(<AdhesionSettings />);
            await waitFor(() =>
                expect(
                    screen.getByText(tP(lng)("payments.adhesion.cols.labels")),
                ).toBeInTheDocument(),
            );

            const trash = container.querySelector("button.btn-warning");
            expect(trash).toBeTruthy();
            act(() => { trash.click(); });

            expect(swal).toHaveBeenCalledTimes(1);
            const opts = swal.mock.calls[0][0];
            expect(opts.title).toBe(tP(lng)("payments.adhesion.deleteConfirm", {label: "Std"}));
            expect(opts.title).toContain("Std");
            expect(opts.cancelButtonText).toBe(tC(lng)("actions.cancel"));
            expect(opts.confirmButtonText).toBe(tC(lng)("actions.delete"));
        },
    );

    // The mount `api.set()....error(...)` closure builds `swal({title: t("shared.errorTitle"),
    // text: t("shared.genericError"), type: 'error'})`. Guards `t` scope on that branch.
    test.each(["fr", "en"])("mount adhesion-prices error fires the shared error swal in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        mockFetchEnabled();
        render(<AdhesionSettings />);
        await waitFor(() => expect(typeof apiState.lastError).toBe("function"));

        act(() => { apiState.lastError({message: "nope"}); });

        expect(swal).toHaveBeenCalledTimes(1);
        const opts = swal.mock.calls[0][0];
        expect(opts.title).toBe(tP(lng)("shared.errorTitle"));
        expect(opts.text).toBe(tP(lng)("shared.genericError"));
    });
});

// ============================================================================================
// 5. AdhesionEditModal — edit/new <h2> ternary, field <label>s, cancel/save, default label
// ============================================================================================
describe("AdhesionEditModal (real component via vi.importActual)", () => {
    test.each(["fr", "en"])("<h2> is the edit title when adhesion.label is set (%s)", async (lng) => {
        await i18n.changeLanguage(lng);
        render(
            <RealAdhesionEditModal adhesion={{label: "X"}} seasons={[]}>
                <span>trigger</span>
            </RealAdhesionEditModal>,
        );
        expect(
            screen.getByRole("heading", {name: tP(lng)("payments.adhesion.modal.editTitle")}),
        ).toBeInTheDocument();
    });

    test.each(["fr", "en"])("<h2> is the new title when adhesion is absent (%s)", async (lng) => {
        await i18n.changeLanguage(lng);
        render(
            <RealAdhesionEditModal seasons={[]}>
                <span>trigger</span>
            </RealAdhesionEditModal>,
        );
        expect(
            screen.getByRole("heading", {name: tP(lng)("payments.adhesion.modal.newTitle")}),
        ).toBeInTheDocument();
    });

    test.each(["fr", "en"])("the three field <label>s + cancel/save buttons are translated (%s)", async (lng) => {
        await i18n.changeLanguage(lng);
        const {container} = render(
            <RealAdhesionEditModal adhesion={{label: "X"}} seasons={[]}>
                <span>trigger</span>
            </RealAdhesionEditModal>,
        );

        const labels = Array.from(container.querySelectorAll("label")).map((l) =>
            l.textContent.replace(/\s+/g, " ").trim(),
        );
        expect(labels[0]).toContain(tP(lng)("payments.adhesion.modal.nameLabel"));
        expect(labels[1]).toContain(tP(lng)("payments.adhesion.modal.priceLabel"));
        expect(labels[2]).toBe(tP(lng)("payments.adhesion.modal.seasonLabel"));

        expect(screen.getByRole("button", {name: tC(lng)("actions.cancel")})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: tC(lng)("actions.save")})).toBeInTheDocument();
    });

    test.each(["fr", "en"])(
        "initialValues.label falls back to payments.adhesion.modal.defaultLabel in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(
                <RealAdhesionEditModal seasons={[]}>
                    <span>trigger</span>
                </RealAdhesionEditModal>,
            );
            expect(
                screen.getByDisplayValue(tP(lng)("payments.adhesion.modal.defaultLabel")),
            ).toBeInTheDocument();
        },
    );
});

// ============================================================================================
// 6. EditPaymentScheduleOptions — <h4> headings, checkbox label, add link, submit button,
//    onItemDelete swal
// ============================================================================================
describe("EditPaymentScheduleOptions", () => {
    const H4 = {
        fr: [
            "Visibilité",
            "Renseigner et ajouter vos modalités de paiement",
            "Renseigner des informations complémentaires sur les modalités de paiement.",
        ],
        en: [
            "Visibility",
            "Enter and add your payment terms",
            "Enter additional information about the payment terms.",
        ],
    };

    test.each(["fr", "en"])("the three <h4> headings are translated in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<EditPaymentScheduleOptions />);
        const got = screen.getAllByRole("heading", {level: 4}).map((el) => el.textContent);
        expect(got).toEqual(H4[lng]);
    });

    test.each(["fr", "en"])("checkbox label + add link + submit button are translated in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<EditPaymentScheduleOptions />);

        expect(
            screen.getByText(tP(lng)("payments.scheduleOptions.showInEnrolmentLabel")),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", {name: tP(lng)("payments.scheduleOptions.addOption")}),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", {name: tP(lng)("payments.scheduleOptions.saveAdditionalInfo")}),
        ).toBeInTheDocument();
    });

    test.each(["fr", "en"])(
        "onItemDelete swal uses common:confirm.sure + payments.scheduleOptions.delete.* in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            const {container} = render(<EditPaymentScheduleOptions />);

            // fire the mount GET's captured success callback to populate one schedule option
            expect(typeof apiState.lastSuccess).toBe("function");
            act(() => {
                apiState.lastSuccess({
                    data: [{id: 1, label: "Term 1", index: 1}],
                    activated: false,
                    index: [1],
                    display_text: null,
                });
            });

            const del = container.querySelector(".col-sm-1.text-right.btn.btn-lg");
            expect(del).toBeTruthy();
            act(() => { del.click(); });

            expect(swal).toHaveBeenCalledTimes(1);
            const opts = swal.mock.calls[0][0];
            expect(opts.title).toBe(tC(lng)("confirm.sure"));
            expect(opts.text).toBe(tP(lng)("payments.scheduleOptions.delete.text"));
            expect(opts.confirmButtonText).toBe(tP(lng)("payments.scheduleOptions.delete.confirm"));
            expect(opts.cancelButtonText).toBe(tP(lng)("payments.scheduleOptions.delete.cancel"));
        },
    );

    // The mount GET's `.error(...)` closure builds `swal(t("...errors.fetch"), res.error, "error")`
    // — positional-arg form, `t` captured from the hook scope. Guards that path.
    test.each(["fr", "en"])("mount fetch error fires swal titled errors.fetch in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<EditPaymentScheduleOptions />);
        expect(typeof apiState.lastError).toBe("function");
        act(() => { apiState.lastError({error: "backend detail"}); });

        expect(swal).toHaveBeenCalledTimes(1);
        expect(swal.mock.calls[0][0]).toBe(tP(lng)("payments.scheduleOptions.errors.fetch"));
        expect(swal.mock.calls[0][1]).toBe("backend detail");
    });
});

// ============================================================================================
// 7. HOC shape / inheritance chain
// ============================================================================================
describe("HOC shape", () => {
    test("PaymentsMethods / PaymentsStatus default export is withTranslation-wrapped over a class", () => {
        for (const Wrapped of [PaymentsMethods, PaymentsStatus]) {
            expect(Wrapped.WrappedComponent).toBeDefined();
            expect(typeof Wrapped.WrappedComponent).toBe("function");
        }
    });

    test("PaymentsMethods / PaymentsStatus WrappedComponent still extends the class BaseDataTable", () => {
        expect(Object.getPrototypeOf(PaymentsMethods.WrappedComponent.prototype)).toBe(
            BaseDataTable.prototype,
        );
        expect(Object.getPrototypeOf(PaymentsStatus.WrappedComponent.prototype)).toBe(
            BaseDataTable.prototype,
        );
    });

    test("CouponFormContent WrappedComponent is a React.Component subclass", () => {
        expect(CouponFormContent.WrappedComponent).toBeDefined();
        expect(Object.getPrototypeOf(CouponFormContent.WrappedComponent.prototype)).toBe(
            React.Component.prototype,
        );
    });
});
