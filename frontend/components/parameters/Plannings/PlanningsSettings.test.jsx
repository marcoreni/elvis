// i18n extraction test — i18n-06 "parameters" domain, lot E.
//
// Despite the file name / folder, this is the broad lot-E suite: it covers all 10 components
// touched by the lot-E extraction, across four folders:
//
//   Plannings/SchoolAvailabilities     — fn useTranslation("parameters"); <h4> heading + <p> hint;
//       mount `api.set()...get()` `.error` -> swal({title: t("plannings.schoolAvailabilities.fetchError")}).
//   Plannings/TeacherAvailabilities    — fn; <h3> heading, checkbox <label>, submit <button> =
//       t("shared.saveButton"); onSubmit swal success/error = t("shared.saveSuccess" | "saveError").
//   Plannings/CancelActivityParameters — fn; <h3> heading, <p> hint, button = common:actions.validate;
//       mount `.error` -> t("shared.loadParamsError"); onSubmit success/error -> shared.saveSuccess/saveError.
//   Plannings/PlanningDisplayParameters— fn; <h3> heading, 3 <label>s, button = common:actions.validate;
//       mount `.error` -> shared.loadParamsError; onSubmit success -> t("plannings.displayParams.saveSuccess"),
//       error -> t("plannings.displayParams.saveError").
//   Evaluations/EvaluationLevels       — `class extends BaseDataTable` -> withTranslation("parameters").
//       `const {t} = props` in ctor builds this.state.columns; boolean Cell = t("shared.yes"|"no").
//       `const {t} = this.props` in deleteStatus: swal title/cancel/confirm + error branch t("shared.errorTitle").
//       HOC shape: proto chain still BaseDataTable.
//   Evaluations/EvaluationSlot         — fn useTranslation("parameters") + react-hook-form. <label> =
//       t("evaluations.slot.durationLabel"), submit value = t("common:actions.save"). onSubmit fires
//       swal(loadingTitle) then, on fetch resolve, swal(saveSuccess) / on !ok swal(genericError).
//   Rooms/Localisations                — `class extends React.Component` -> withTranslation("parameters").
//       `const {t} = props` in ctor for columns; `const {t} = this.props` in render() (ReactTable
//       pagination props -> common:reactTable.*) AND deleteStatus (swal title/cancel/confirm + error).
//       HOC shape: proto chain React.Component.
//   Localization/LocalizationParameters— fn useTranslation("parameters"). NOTE the sibling
//       LocalizationParameters.test.jsx already covers the PR#5 review fixes + the LOADING const;
//       here we ONLY add the lot-E i18n assertions (loading placeholder, headings/hints/button
//       fr+en, the guard swal, save success/error, mount load error).
//   Activities/PricingCategoriesEdit   — fn useTranslation("parameters") + a module-level CreateButton
//       fn with its OWN useTranslation("parameters"). columns Headers + boolean Cell + the
//       oneResourceTypeName/thisResourceTypeName props.
//   Activities/PricingCategoryFormContent — `class extends React.Component` -> withTranslation("parameters");
//       `const {t} = this.props` in render(); three <Field label={t("activities.pricing.*")}>.
//
// Keys live in frontend/locales/{fr,en}/parameters.json (172 leaves this branch). Lot E adds
// `shared.{colName,loadParamsError,saveSuccess,saveError,saveButton}`,
// `plannings.{schoolAvailabilities,teacherAvailabilities,cancelActivity,displayParams}.*`,
// `evaluations.{levels,slot}.*`, `rooms.localisations.*`, `localization.*`, `activities.pricing.*`.
// Regression guard: the lot-A `plannings.tabs.*` (4) / `evaluations.tabs.*` (2) a lot-E script bug
// briefly dropped must still resolve.

import React from "react";
import {render, screen, fireEvent, act, waitFor} from "@testing-library/react";
import {Form} from "react-final-form";
import i18n from "../../../i18n";
import fr from "../../../locales/fr/parameters.json";
import en from "../../../locales/en/parameters.json";

// --- tools/api: chainable no-op stub; last success/error captured for hand-firing. `api.get`
//     (used directly by EvaluationSlot) resolves a canned payload. -------------------------------
const apiState = vi.hoisted(() => ({
    lastSuccess: null,
    lastError: null,
    getResolve: {data: {session_hour: {e: 30}}},
}));
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
    get: (...args) => { apiState.lastGetArgs = args; return Promise.resolve(apiState.getResolve); },
}));

// --- sweetalert2 stub -------------------------------------------------------------------------
vi.mock("sweetalert2", () => ({
    default: Object.assign(vi.fn(() => Promise.resolve({})), {
        showLoading: vi.fn(),
        fire: vi.fn(() => Promise.resolve({})),
    }),
}));

// --- react-table stub: surface every column's string `Header` in order, render every `Cell`
//     once against `globalThis.__rtRow`, and keep the last props object for pagination-string
//     assertions (Localisations). -----------------------------------------------------------------
const rtProps = vi.hoisted(() => ({last: null}));
vi.mock("react-table", () => ({
    default: (props) => {
        rtProps.last = props;
        const {columns = []} = props;
        return (
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
        );
    },
}));

// --- SchoolAvailabilities' heavy child ------------------------------------------------------------
vi.mock("../../availability/AvailabilityManager", () => ({
    default: () => <div data-testid="availability-manager" />,
}));

// --- PricingCategoriesEdit's data-table stack: surface columns/Cell + the resource-type props +
//     render the injected createButton (so its own useTranslation runs). ------------------------
vi.mock("../../common/baseDataTable/DataService", () => ({default: class FakeDataService {}}));
vi.mock("../../common/baseDataTable/BaseDataTable", () => ({
    default: ({columns = [], createButton: CreateButton, oneResourceTypeName, thisResourceTypeName}) => (
        <div data-testid="base-data-table">
            {columns.map((col, i) => (
                <span key={i} data-testid="bdt-col-header">
                    {typeof col.Header === "string" ? col.Header : ""}
                </span>
            ))}
            {columns.map((col, i) =>
                col.Cell ? (
                    <span key={`c-${i}`} data-testid="bdt-col-cell">
                        {col.Cell({value: globalThis.__packValue})}
                    </span>
                ) : null,
            )}
            <span data-testid="one-resource">{oneResourceTypeName}</span>
            <span data-testid="this-resource">{thisResourceTypeName}</span>
            {CreateButton ? <CreateButton onCreate={() => {}} /> : null}
        </div>
    ),
}));

// --- PricingCategoryFormContent's form primitives: echo the `label` prop --------------------------
vi.mock("../../common/Input", () => ({
    default: (props) => <div data-testid="ff-label">{props.label}</div>,
}));
vi.mock("../../common/Checkbox", () => ({
    default: (props) => <div data-testid="ff-label">{props.label}</div>,
}));

import swal from "sweetalert2";
import SchoolAvailabilities from "./SchoolAvailabilities";
import TeacherAvailabilities from "./TeacherAvailabilities";
import CancelActivityParameters from "./CancelActivityParameters";
import PlanningDisplayParameters from "./PlanningDisplayParameters";
import EvaluationLevels from "../Evaluations/EvaluationLevels";
import EvaluationSlot from "../Evaluations/EvaluationSlot";
import Localisations from "../Rooms/Localisations";
import LocalizationParameters from "../Localization/LocalizationParameters";
import PricingCategoriesEdit from "../Activities/PricingCategoriesEdit";
import PricingCategoryFormContent from "../Activities/PricingCategoryFormContent";
import BaseDataTable from "../BaseDataTable";

const tP = (lng) => i18n.getFixedT(lng, "parameters");
const tC = (lng) => i18n.getFixedT(lng, "common");

beforeEach(() => {
    swal.mockClear();
    swal.mockImplementation(() => Promise.resolve({}));
    apiState.lastSuccess = null;
    apiState.lastError = null;
    apiState.getResolve = {data: {session_hour: {e: 30}}};
    rtProps.last = null;
    globalThis.__rtRow = {};
    globalThis.__packValue = undefined;
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
    delete globalThis.__packValue;
});

// ============================================================================================
// 1. i18n layer
// ============================================================================================
describe("parameters lot-E — i18n layer", () => {
    // Phase 07 P0 (docs/I18n-Roadmap.md §P0): the lot-E key-set parity check, the leaf-count
    // lock-step pin, the "every subtree key resolves" loop and the "shared.* additions resolve"
    // loop were pure pipeline coverage — redundant with frontend/i18n/index.test.js's
    // cross-namespace parity guard and `bin/i18n-tasks health`. Removed. What stays below pins
    // behaviour: the lot-A survival regression, the {{name}} interpolation paths, and the
    // deleteConfirm copy-paste-slip regression.

    test("regression: the lot-A plannings.tabs.* / evaluations.tabs.* keys survive", () => {
        expect(tP("fr")("plannings.tabs.schoolAvailability")).toBe("Disponibilité de l'école");
        expect(tP("en")("plannings.tabs.schoolAvailability")).toBe("School availability");
        expect(tP("fr")("evaluations.tabs.slot")).toBe("Créneau d'évaluation");
        expect(tP("en")("evaluations.tabs.slot")).toBe("Evaluation slot");

        expect(Object.keys(fr.plannings.tabs)).toHaveLength(4);
        expect(Object.keys(en.plannings.tabs)).toHaveLength(4);
        expect(Object.keys(fr.evaluations.tabs)).toHaveLength(2);
        expect(Object.keys(en.evaluations.tabs)).toHaveLength(2);
    });

    test.each(["fr", "en"])(
        "evaluations.levels.deleteConfirm interpolates {{name}} (brace-free, embeds the value) in %s",
        (lng) => {
            const v = tP(lng)("evaluations.levels.deleteConfirm", {name: "Zephyr"});
            expect(v).toContain("Zephyr");
            expect(v).not.toContain("{");
        },
    );

    test("evaluations.levels.deleteConfirm names the right noun (fixed copy-paste slip)", () => {
        // The FR source used to read "l'instrument" (a copy-paste slip from the instruments
        // table — this dialog deletes an evaluation *level*). Fixed in fix/known-issues-easy-batch.
        expect(tP("fr")("evaluations.levels.deleteConfirm", {name: "X"})).toContain("le niveau d'évaluation");
        expect(tP("fr")("evaluations.levels.deleteConfirm", {name: "X"})).not.toContain("instrument");
    });

    test.each(["fr", "en"])(
        "rooms.localisations.deleteConfirm interpolates {{name}} in %s",
        (lng) => {
            const v = tP(lng)("rooms.localisations.deleteConfirm", {name: "Zephyr"});
            expect(v).toContain("Zephyr");
            expect(v).not.toContain("{");
        },
    );

    // "explicit fr / en copy for a sample of lot-E keys" removed (Phase 07 P0) — pure string-echo.
});

// ============================================================================================
// 2. SchoolAvailabilities
// ============================================================================================
describe("SchoolAvailabilities", () => {
    const props = {planningId: 7, authToken: "tok", seasons: [{id: 1, start: "2026-09-01", is_current: true}]};

    test.each(["fr", "en"])("<h4> heading + <p> hint are translated in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<SchoolAvailabilities {...props} />);

        expect(
            screen.getByRole("heading", {name: tP(lng)("plannings.schoolAvailabilities.heading")}),
        ).toBeInTheDocument();
        expect(
            screen.getByText(tP(lng)("plannings.schoolAvailabilities.hint")),
        ).toBeInTheDocument();
    });

    test.each(["fr", "en"])(
        "mount fetch-error fires swal titled plannings.schoolAvailabilities.fetchError in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(<SchoolAvailabilities {...props} />);

            expect(typeof apiState.lastError).toBe("function");
            act(() => { apiState.lastError(); });

            expect(swal).toHaveBeenCalledTimes(1);
            expect(swal.mock.calls[0][0].title).toBe(
                tP(lng)("plannings.schoolAvailabilities.fetchError"),
            );
        },
    );
});

// ============================================================================================
// 3. TeacherAvailabilities
// ============================================================================================
describe("TeacherAvailabilities", () => {
    test.each(["fr", "en"])(
        "<h3> heading + checkbox <label> + submit <button> are translated in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(<TeacherAvailabilities />);

            expect(
                screen.getByRole("heading", {name: tP(lng)("plannings.teacherAvailabilities.heading")}),
            ).toBeInTheDocument();
            expect(
                screen.getByText(tP(lng)("plannings.teacherAvailabilities.checkboxLabel")),
            ).toBeInTheDocument();
            expect(
                screen.getByRole("button", {name: tP(lng)("shared.saveButton")}),
            ).toBeInTheDocument();
        },
    );

    test.each(["fr", "en"])("onSubmit success fires swal titled shared.saveSuccess in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<TeacherAvailabilities />);

        fireEvent.click(screen.getByRole("button", {name: tP(lng)("shared.saveButton")}));
        act(() => { apiState.lastSuccess(); });

        expect(swal).toHaveBeenCalledTimes(1);
        expect(swal.mock.calls[0][0].title).toBe(tP(lng)("shared.saveSuccess"));
    });

    test.each(["fr", "en"])("onSubmit error fires swal titled shared.saveError in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<TeacherAvailabilities />);

        fireEvent.click(screen.getByRole("button", {name: tP(lng)("shared.saveButton")}));
        act(() => { apiState.lastError(); });

        expect(swal).toHaveBeenCalledTimes(1);
        expect(swal.mock.calls[0][0].title).toBe(tP(lng)("shared.saveError"));
    });
});

// ============================================================================================
// 4. CancelActivityParameters
// ============================================================================================
describe("CancelActivityParameters", () => {
    test.each(["fr", "en"])(
        "<h3> heading + <p> hint + validate button are translated in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(<CancelActivityParameters />);

            expect(
                screen.getByRole("heading", {name: tP(lng)("plannings.cancelActivity.heading")}),
            ).toBeInTheDocument();
            expect(
                screen.getByText(tP(lng)("plannings.cancelActivity.hint")),
            ).toBeInTheDocument();
            expect(
                screen.getByRole("button", {name: tC(lng)("actions.validate")}),
            ).toBeInTheDocument();
        },
    );

    test.each(["fr", "en"])("mount load-error fires swal titled shared.loadParamsError in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<CancelActivityParameters />);

        act(() => { apiState.lastError(); });

        expect(swal).toHaveBeenCalledTimes(1);
        expect(swal.mock.calls[0][0].title).toBe(tP(lng)("shared.loadParamsError"));
    });

    test.each(["fr", "en"])("onSubmit success / error swal titles in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<CancelActivityParameters />);

        fireEvent.click(screen.getByRole("button", {name: tC(lng)("actions.validate")}));
        act(() => { apiState.lastSuccess(); });
        expect(swal.mock.calls[0][0].title).toBe(tP(lng)("shared.saveSuccess"));

        swal.mockClear();
        fireEvent.click(screen.getByRole("button", {name: tC(lng)("actions.validate")}));
        act(() => { apiState.lastError(); });
        expect(swal.mock.calls[0][0].title).toBe(tP(lng)("shared.saveError"));
    });
});

// ============================================================================================
// 5. PlanningDisplayParameters
// ============================================================================================
describe("PlanningDisplayParameters", () => {
    test.each(["fr", "en"])(
        "<h3> heading + the 3 <label>s + validate button are translated in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(<PlanningDisplayParameters />);

            expect(
                screen.getByRole("heading", {name: tP(lng)("plannings.displayParams.heading")}),
            ).toBeInTheDocument();
            for (const key of [
                "plannings.displayParams.showActivityCodeLabel",
                "plannings.displayParams.recurrenceLabel",
                "plannings.displayParams.availabilityMessageLabel",
            ]) {
                expect(screen.getByText(tP(lng)(key))).toBeInTheDocument();
            }
            expect(
                screen.getByRole("button", {name: tC(lng)("actions.validate")}),
            ).toBeInTheDocument();
        },
    );

    test.each(["fr", "en"])("mount load-error fires swal titled shared.loadParamsError in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<PlanningDisplayParameters />);

        act(() => { apiState.lastError(); });

        expect(swal).toHaveBeenCalledTimes(1);
        expect(swal.mock.calls[0][0].title).toBe(tP(lng)("shared.loadParamsError"));
    });

    test.each(["fr", "en"])(
        "onSubmit success -> displayParams.saveSuccess, error -> displayParams.saveError in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(<PlanningDisplayParameters />);

            fireEvent.click(screen.getByRole("button", {name: tC(lng)("actions.validate")}));
            act(() => { apiState.lastSuccess(); });
            expect(swal.mock.calls[0][0].title).toBe(tP(lng)("plannings.displayParams.saveSuccess"));

            swal.mockClear();
            fireEvent.click(screen.getByRole("button", {name: tC(lng)("actions.validate")}));
            act(() => { apiState.lastError(); });
            expect(swal.mock.calls[0][0].title).toBe(tP(lng)("plannings.displayParams.saveError"));
        },
    );
});

// ============================================================================================
// 6. EvaluationLevels — HOC shape, translated headers, boolean Cells, deleteStatus swal
// ============================================================================================
describe("EvaluationLevels", () => {
    const HEADERS = {
        fr: ["#", "Nom", "Valeur", "Peut continuer ?", "Actions"],
        en: ["#", "Name", "Value", "Can continue?", "Actions"],
    };

    test("default export is withTranslation-wrapped over `class extends BaseDataTable`", () => {
        expect(EvaluationLevels.WrappedComponent).toBeDefined();
        expect(EvaluationLevels.WrappedComponent.prototype instanceof BaseDataTable).toBe(true);
        expect(Object.getPrototypeOf(EvaluationLevels.WrappedComponent.prototype)).toBe(
            BaseDataTable.prototype,
        );
    });

    test.each(["fr", "en"])("renders the translated column headers in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<EvaluationLevels />);

        const got = screen
            .getAllByTestId("col-header")
            .map((el) => el.textContent)
            .filter(Boolean);
        expect(got).toEqual(HEADERS[lng]);
    });

    test.each(["fr", "en"])("can_continue Cell renders shared.yes / shared.no in %s", async (lng) => {
        await i18n.changeLanguage(lng);

        globalThis.__rtRow = {can_continue: true};
        const {unmount} = render(<EvaluationLevels />);
        expect(screen.getAllByTestId("col-cell").map((e) => e.textContent)).toContain(
            tP(lng)("shared.yes"),
        );
        unmount();

        globalThis.__rtRow = {can_continue: false};
        render(<EvaluationLevels />);
        expect(screen.getAllByTestId("col-cell").map((e) => e.textContent)).toContain(
            tP(lng)("shared.no"),
        );
    });

    function mountInstance(lng) {
        const Klass = EvaluationLevels.WrappedComponent;
        let inst;
        render(<Klass t={tP(lng)} i18n={i18n} tReady ref={(r) => { inst = r; }} />);
        return inst;
    }

    test.each(["fr", "en"])(
        "deleteStatus builds a %s-translated swal (deleteConfirm {{name}} + cancel + confirm)",
        async (lng) => {
            await i18n.changeLanguage(lng);
            const t = tP(lng);
            mountInstance(lng).deleteStatus({id: 1, label: "Zephyr"});

            expect(swal).toHaveBeenCalledTimes(1);
            const opts = swal.mock.calls[0][0];
            expect(opts.title).toBe(t("evaluations.levels.deleteConfirm", {name: "Zephyr"}));
            expect(opts.title).toContain("Zephyr");
            expect(opts.title).not.toContain("{");
            expect(opts.cancelButtonText).toBe(t("shared.deleteConfirmNo"));
            expect(opts.confirmButtonText).toBe(t("shared.deleteConfirmYes"));
        },
    );

    test("explicit fr / en strings (deleteStatus swal)", async () => {
        await i18n.changeLanguage("fr");
        mountInstance("fr").deleteStatus({id: 1, label: "Zephyr"});
        let opts = swal.mock.calls[0][0];
        expect(opts.title).toBe("Voulez-vous vraiment supprimer le niveau d'évaluation 'Zephyr' ?");
        expect(opts.cancelButtonText).toBe("non");
        expect(opts.confirmButtonText).toBe("oui");

        swal.mockClear();

        await i18n.changeLanguage("en");
        mountInstance("en").deleteStatus({id: 1, label: "Zephyr"});
        opts = swal.mock.calls[0][0];
        expect(opts.title).toBe("Do you really want to delete the evaluation level 'Zephyr'?");
        expect(opts.cancelButtonText).toBe("no");
        expect(opts.confirmButtonText).toBe("yes");
    });

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

            mountInstance(lng).deleteStatus({id: 1, label: "Zephyr"});
            await new Promise((r) => setTimeout(r, 0));
            await new Promise((r) => setTimeout(r, 0));

            expect(swal).toHaveBeenCalledTimes(2);
            expect(swal.mock.calls[1][0].title).toBe(t("shared.errorTitle"));
            expect(swal.mock.calls[1][0].text).toBe("boom");
        },
    );
});

// ============================================================================================
// 7. EvaluationSlot
// ============================================================================================
describe("EvaluationSlot", () => {
    async function renderSlot() {
        let utils;
        await act(async () => { utils = render(<EvaluationSlot />); });
        return utils;
    }

    test.each(["fr", "en"])("<label> + submit value are translated in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        await renderSlot();

        expect(
            screen.getByText(tP(lng)("evaluations.slot.durationLabel")),
        ).toBeInTheDocument();
        expect(
            screen.getByDisplayValue(tC(lng)("actions.save")),
        ).toBeInTheDocument();
    });

    // The `requiredError` <p> was gated on `errors.name` while the field registers as
    // `sessionHour` (`register('sessionHour', { required: true })`), so the message could never
    // render. Fixed to `errors.sessionHour` in `fix/wrong-property-refs`; the test below submits
    // the form with an empty field and asserts the message actually appears.
    test.each(["fr", "en"])("evaluations.slot.requiredError key resolves in %s", (lng) => {
        const v = tP(lng)("evaluations.slot.requiredError");
        expect(v).not.toBe("evaluations.slot.requiredError");
        expect(v.length).toBeGreaterThan(0);
    });

    test.each(["fr", "en"])(
        "submitting with an empty sessionHour renders the required-error <p> in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            apiState.getResolve = {data: {session_hour: {e: null}}};

            const {container} = await renderSlot();
            const input = container.querySelector('input[name="sessionHour"]');
            fireEvent.input(input, {target: {value: ""}});
            fireEvent.submit(container.querySelector("form"));

            expect(
                await screen.findByText(tP(lng)("evaluations.slot.requiredError")),
            ).toBeInTheDocument();
        },
    );

    test("a filled sessionHour does NOT render the required-error <p>", async () => {
        await i18n.changeLanguage("fr");
        global.fetch = vi.fn().mockResolvedValue({ok: true, json: () => Promise.resolve({})});

        const {container} = await renderSlot();
        fireEvent.input(container.querySelector('input[name="sessionHour"]'), {
            target: {value: "30"},
        });
        fireEvent.submit(container.querySelector("form"));

        await waitFor(() => expect(swal).toHaveBeenCalled());
        expect(
            screen.queryByText(tP("fr")("evaluations.slot.requiredError")),
        ).not.toBeInTheDocument();
    });

    test.each(["fr", "en"])(
        "onSubmit fires swal(loadingTitle) then swal(saveSuccess) on a 2xx fetch in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            global.fetch = vi.fn().mockResolvedValue({ok: true, json: () => Promise.resolve({})});

            const {container} = await renderSlot();
            fireEvent.input(container.querySelector('input[name="sessionHour"]'), {
                target: {value: "30"},
            });
            fireEvent.submit(container.querySelector("form"));

            await waitFor(() => expect(swal).toHaveBeenCalledTimes(2));
            expect(swal.mock.calls[0][0].title).toBe(tC(lng)("loading"));
            expect(swal.mock.calls[1][0].title).toBe(tP(lng)("shared.saveCompleted"));
        },
    );

    test.each(["fr", "en"])(
        "onSubmit fires swal(genericError) when the fetch is not ok in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            global.fetch = vi.fn().mockResolvedValue({ok: false});

            const {container} = await renderSlot();
            fireEvent.input(container.querySelector('input[name="sessionHour"]'), {
                target: {value: "30"},
            });
            fireEvent.submit(container.querySelector("form"));

            await waitFor(() => expect(swal).toHaveBeenCalledTimes(2));
            expect(swal.mock.calls[0][0].title).toBe(tC(lng)("loading"));
            expect(swal.mock.calls[1][0].title).toBe(tP(lng)("shared.genericErrorShort"));
        },
    );
});

// ============================================================================================
// 8. Localisations — HOC shape, headers, ReactTable pagination strings, deleteStatus swal
// ============================================================================================
describe("Localisations", () => {
    test("default export is withTranslation-wrapped over a plain React.Component", () => {
        expect(Localisations.WrappedComponent).toBeDefined();
        expect(Localisations.WrappedComponent.prototype instanceof React.Component).toBe(true);
        expect(Object.getPrototypeOf(Localisations.WrappedComponent.prototype)).toBe(
            React.Component.prototype,
        );
    });

    test.each(["fr", "en"])("renders the (translated) column headers in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<Localisations rooms={[]} />);

        const got = screen
            .getAllByTestId("col-header")
            .map((el) => el.textContent)
            .filter(Boolean);
        // colSite / shared.actions happen to be identical fr/en, but they must still resolve
        // (no "translation missing", no key leak).
        expect(got).toEqual(["#", tP(lng)("rooms.localisations.colSite"), tP(lng)("shared.actions")]);
        expect(got.join("|")).not.toMatch(/rooms\.|shared\.|translation missing/i);
    });

    test.each(["fr", "en"])("threads translated ReactTable pagination strings in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<Localisations rooms={[]} />);

        expect(rtProps.last).toBeTruthy();
        expect(rtProps.last.previousText).toBe(tC(lng)("reactTable.previousText"));
        expect(rtProps.last.nextText).toBe(tC(lng)("reactTable.nextText"));
        expect(rtProps.last.loadingText).toBe(tC(lng)("reactTable.loadingText"));
        expect(rtProps.last.noDataText).toBe(tC(lng)("reactTable.noDataText"));
        expect(rtProps.last.pageText).toBe(tC(lng)("reactTable.pageText"));
        expect(rtProps.last.ofText).toBe(tC(lng)("reactTable.ofText"));
        expect(rtProps.last.rowsText).toBe(tC(lng)("reactTable.rowsText"));
    });

    test("pagination strings actually differ between fr and en (previousText)", async () => {
        await i18n.changeLanguage("fr");
        render(<Localisations rooms={[]} />);
        expect(rtProps.last.previousText).toBe("Précédent");

        await i18n.changeLanguage("en");
        render(<Localisations rooms={[]} />);
        expect(rtProps.last.previousText).toBe("Previous");
    });

    function mountInstance(lng) {
        const Klass = Localisations.WrappedComponent;
        let inst;
        render(
            <Klass t={tP(lng)} i18n={i18n} tReady rooms={[]} ref={(r) => { inst = r; }} />,
        );
        return inst;
    }

    test.each(["fr", "en"])(
        "deleteStatus builds a %s-translated swal (deleteConfirm {{name}} + cancel + confirm)",
        async (lng) => {
            await i18n.changeLanguage(lng);
            const t = tP(lng);
            mountInstance(lng).deleteStatus({id: 1, label: "Zephyr"});

            expect(swal).toHaveBeenCalledTimes(1);
            const opts = swal.mock.calls[0][0];
            expect(opts.title).toBe(t("rooms.localisations.deleteConfirm", {name: "Zephyr"}));
            expect(opts.title).toContain("Zephyr");
            expect(opts.title).not.toContain("{");
            expect(opts.cancelButtonText).toBe(t("shared.deleteConfirmNo"));
            expect(opts.confirmButtonText).toBe(t("shared.deleteConfirmYes"));
        },
    );

    test("explicit fr / en strings (deleteStatus swal)", async () => {
        await i18n.changeLanguage("fr");
        mountInstance("fr").deleteStatus({id: 1, label: "Zephyr"});
        let opts = swal.mock.calls[0][0];
        expect(opts.title).toBe("Voulez-vous vraiment supprimer la localisation 'Zephyr' ?");
        expect(opts.cancelButtonText).toBe("non");
        expect(opts.confirmButtonText).toBe("oui");

        swal.mockClear();

        await i18n.changeLanguage("en");
        mountInstance("en").deleteStatus({id: 1, label: "Zephyr"});
        opts = swal.mock.calls[0][0];
        expect(opts.title).toBe("Do you really want to delete the location 'Zephyr'?");
        expect(opts.cancelButtonText).toBe("no");
        expect(opts.confirmButtonText).toBe("yes");
    });

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

            mountInstance(lng).deleteStatus({id: 1, label: "Zephyr"});
            await new Promise((r) => setTimeout(r, 0));
            await new Promise((r) => setTimeout(r, 0));

            expect(swal).toHaveBeenCalledTimes(2);
            expect(swal.mock.calls[1][0].title).toBe(t("shared.errorTitle"));
            expect(swal.mock.calls[1][0].text).toBe("boom");
        },
    );
});

// ============================================================================================
// 9. LocalizationParameters — lot-E i18n assertions ONLY (the sibling test owns the PR#5 fixes)
// ============================================================================================
describe("LocalizationParameters (lot-E i18n additions)", () => {
    const OK_DATA = {supportedLocales: ["fr", "en"], defaultLanguage: "fr", availableLanguages: ["fr", "en"]};

    test.each(["fr", "en"])("loading placeholder is common:loading in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<LocalizationParameters />);
        expect(screen.getByText(tC(lng)("loading"))).toBeInTheDocument();
    });

    test.each(["fr", "en"])(
        "headings + hints + save button are translated once loaded in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(<LocalizationParameters />);
            act(() => { apiState.lastSuccess(OK_DATA); });

            expect(
                screen.getByRole("heading", {name: tP(lng)("localization.availableHeading")}),
            ).toBeInTheDocument();
            expect(
                screen.getByRole("heading", {name: tP(lng)("localization.defaultHeading")}),
            ).toBeInTheDocument();
            expect(screen.getByText(tP(lng)("localization.availableHint"))).toBeInTheDocument();
            expect(screen.getByText(tP(lng)("localization.defaultHint"))).toBeInTheDocument();
            expect(
                screen.getByRole("button", {name: tC(lng)("actions.save")}),
            ).toBeInTheDocument();
        },
    );

    test.each(["fr", "en"])("mount load-error fires swal titled shared.loadParamsError in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<LocalizationParameters />);
        act(() => { apiState.lastError(); });

        expect(swal).toHaveBeenCalledTimes(1);
        expect(swal.mock.calls[0][0].title).toBe(tP(lng)("shared.loadParamsError"));
    });

    test.each(["fr", "en"])(
        "the default-not-available guard fires swal titled localization.defaultMustBeAvailable in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(<LocalizationParameters />);
            act(() => {
                apiState.lastSuccess({supportedLocales: ["fr", "en"], defaultLanguage: "fr", availableLanguages: ["en"]});
            });

            fireEvent.click(screen.getByRole("button", {name: tC(lng)("actions.save")}));

            expect(swal).toHaveBeenCalledTimes(1);
            expect(swal.mock.calls[0][0].title).toBe(tP(lng)("localization.defaultMustBeAvailable"));
        },
    );

    test.each(["fr", "en"])("onSubmit success / error swal titles in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<LocalizationParameters />);
        act(() => { apiState.lastSuccess(OK_DATA); });

        fireEvent.click(screen.getByRole("button", {name: tC(lng)("actions.save")}));
        act(() => { apiState.lastSuccess(); });
        expect(swal.mock.calls[0][0].title).toBe(tP(lng)("shared.saveSuccess"));

        swal.mockClear();
        fireEvent.click(screen.getByRole("button", {name: tC(lng)("actions.save")}));
        act(() => { apiState.lastError(); });
        expect(swal.mock.calls[0][0].title).toBe(tP(lng)("shared.saveError"));
    });
});

// ============================================================================================
// 10. PricingCategoriesEdit — column headers, boolean Cell, resource-type props, CreateButton
// ============================================================================================
describe("PricingCategoriesEdit", () => {
    const HEADERS = {
        fr: ["Nom de la catégorie de prix", "Nombre de leçons", "Est un pack ?"],
        en: ["Pricing category name", "Number of lessons", "Is a pack?"],
    };

    test.each(["fr", "en"])("renders the translated column headers in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        render(<PricingCategoriesEdit />);

        const got = screen
            .getAllByTestId("bdt-col-header")
            .map((el) => el.textContent)
            .filter(Boolean);
        expect(got).toEqual(HEADERS[lng]);
    });

    test.each(["fr", "en"])("is_pack Cell renders shared.yes / shared.no in %s", async (lng) => {
        await i18n.changeLanguage(lng);

        globalThis.__packValue = true;
        const {unmount} = render(<PricingCategoriesEdit />);
        expect(screen.getByTestId("bdt-col-cell").textContent).toBe(tP(lng)("shared.yes"));
        unmount();

        globalThis.__packValue = false;
        render(<PricingCategoriesEdit />);
        expect(screen.getByTestId("bdt-col-cell").textContent).toBe(tP(lng)("shared.no"));
    });

    test.each(["fr", "en"])(
        "oneResourceTypeName / thisResourceTypeName props are translated in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(<PricingCategoriesEdit />);

            expect(screen.getByTestId("one-resource").textContent).toBe(
                tP(lng)("activities.pricing.oneResourceTypeName"),
            );
            expect(screen.getByTestId("this-resource").textContent).toBe(
                tP(lng)("activities.pricing.thisResourceTypeName"),
            );
        },
    );

    test.each(["fr", "en"])(
        "the module-level CreateButton (its own useTranslation) renders a translated label in %s",
        async (lng) => {
            await i18n.changeLanguage(lng);
            render(<PricingCategoriesEdit />);

            expect(screen.getByRole("button").textContent).toContain(
                tP(lng)("activities.pricing.createButton"),
            );
        },
    );

    test("explicit fr / en column headers + create button", async () => {
        await i18n.changeLanguage("fr");
        let rendered = render(<PricingCategoriesEdit />);
        expect(screen.getAllByTestId("bdt-col-header").map((e) => e.textContent)).toEqual(HEADERS.fr);
        expect(screen.getByRole("button").textContent).toContain("Créer une catégorie de prix");
        rendered.unmount();

        await i18n.changeLanguage("en");
        render(<PricingCategoriesEdit />);
        expect(screen.getAllByTestId("bdt-col-header").map((e) => e.textContent)).toEqual(HEADERS.en);
        expect(screen.getByRole("button").textContent).toContain("Create a pricing category");
    });
});

// ============================================================================================
// 11. PricingCategoryFormContent — HOC shape + three translated <Field label>s
// ============================================================================================
describe("PricingCategoryFormContent", () => {
    test("default export is withTranslation-wrapped over a plain React.Component", () => {
        expect(PricingCategoryFormContent.WrappedComponent).toBeDefined();
        expect(Object.getPrototypeOf(PricingCategoryFormContent.WrappedComponent.prototype)).toBe(
            React.Component.prototype,
        );
    });

    function renderInForm() {
        return render(
            <Form onSubmit={() => {}}>
                {({handleSubmit}) => (
                    <form onSubmit={handleSubmit}>
                        <PricingCategoryFormContent />
                    </form>
                )}
            </Form>,
        );
    }

    test.each(["fr", "en"])("the three <Field label>s are translated in %s", async (lng) => {
        await i18n.changeLanguage(lng);
        renderInForm();

        const labels = screen.getAllByTestId("ff-label").map((e) => e.textContent);
        expect(labels).toContain(tP(lng)("activities.pricing.categoryName"));
        expect(labels).toContain(tP(lng)("activities.pricing.lessonsCount"));
        expect(labels).toContain(tP(lng)("activities.pricing.isPack"));
    });

    test("explicit fr / en labels", async () => {
        await i18n.changeLanguage("fr");
        const {unmount} = renderInForm();
        let labels = screen.getAllByTestId("ff-label").map((e) => e.textContent);
        expect(labels).toEqual(["Nom de la catégorie de prix", "Nombre de leçons", "Est un pack ?"]);
        unmount();

        await i18n.changeLanguage("en");
        renderInForm();
        labels = screen.getAllByTestId("ff-label").map((e) => e.textContent);
        expect(labels).toEqual(["Pricing category name", "Number of lessons", "Is a pack?"]);
    });
});
