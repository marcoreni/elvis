// i18n extraction test — i18n-06 "parameters" domain, lot B (the 7 Practice/* CRUD tables).
//
// Covers the lot-B extraction of `frontend/components/parameters/Practice/`:
//   BandsType, Features, FlatRate, Groups, Instruments, Materials, MusicGenres.
// Each is `class X extends BaseDataTable`, now `export default withTranslation("parameters")(X)`:
//   - constructor: `const {t} = props;` then `this.state.columns` built with
//     `Header: t("practice.cols.*")`, and the boolean columns render their `Cell` as
//     `t("practice.yes") / t("practice.no")` (Features / FlatRate / Instruments / Materials).
//   - `deleteStatus(status)`: `const {t} = this.props;` then a `swal({ title:
//     t("practice.delete.<entity>", {name}), cancelButtonText: t("practice.delete.confirmNo"),
//     confirmButtonText: t("practice.delete.confirmYes") })`; the error branch uses
//     `t("practice.errorTitle")`. Instruments interpolates `status.label`, the rest `status.name`.
//
// New keys live in `frontend/locales/{fr,en}/parameters.json` under
// `practice.{cols,delete,yes,no,errorTitle}` (`practice.*` == 30 leaves).
//
// The `withTranslation("parameters")(X)` wrappers are NOT created with `{withRef: true}`, so a
// `ref` on the default export never reaches the class instance. To exercise `deleteStatus` and
// the inheritance chain we reach through `X.WrappedComponent` and pass `t` / `i18n` explicitly
// (mirrors the "getting an instance of a withTranslation-wrapped class" note in the qa brief).

import React from "react";
import {render, screen} from "@testing-library/react";
import i18n from "../../../i18n";
import fr from "../../../locales/fr/parameters.json";
import en from "../../../locales/en/parameters.json";

// --- react-table stub: echo every column's (string) Header into the DOM, in column order.
//     Also short-circuits the real ReactTable's mount-time `onFetchData` -> no `fetch`.
vi.mock("react-table", () => ({
    default: ({columns = []}) => (
        <div data-testid="react-table">
            {columns.map((col, idx) => (
                <span key={idx} data-testid="col-header">
                    {typeof col.Header === "string" ? col.Header : ""}
                </span>
            ))}
        </div>
    ),
}));

// --- sweetalert2 stub: `swal(opts)` resolves to `{}` so `.then(res => res.value)` is falsy and
//     no DELETE `fetch` fires from `deleteStatus`.
vi.mock("sweetalert2", () => ({
    default: Object.assign(vi.fn(() => Promise.resolve({})), {fire: vi.fn()}),
}));

import swal from "sweetalert2";
import BaseDataTable from "../BaseDataTable";
import BandsType from "./BandsType";
import Features from "./Features";
import FlatRate from "./FlatRate";
import Groups from "./Groups";
import Instruments from "./Instruments";
import Materials from "./Materials";
import MusicGenres from "./MusicGenres";

// Per-table facts: default export, expected translated column headers (in order, after the
// literal "#"), the `practice.delete.*` key `deleteStatus` uses, and which status field it
// interpolates as `{{name}}`.
const TABLES = [
    {
        name: "BandsType",
        Component: BandsType,
        deleteKey: "practice.delete.bandType",
        nameField: "name",
        headers: {
            fr: ["Nom", "Actions"],
            en: ["Name", "Actions"],
        },
    },
    {
        name: "Features",
        Component: Features,
        deleteKey: "practice.delete.feature",
        nameField: "name",
        headers: {
            fr: ["Nom", "Actif ?", "Actions"],
            en: ["Name", "Active?", "Actions"],
        },
    },
    {
        name: "FlatRate",
        Component: FlatRate,
        deleteKey: "practice.delete.flatRate",
        nameField: "name",
        headers: {
            fr: ["Nom", "Actif ?", "Nombre d'heures", "Tarif solo/duo", "Tarif de groupe", "Actions"],
            en: ["Name", "Active?", "Number of hours", "Solo/duo rate", "Group rate", "Actions"],
        },
    },
    {
        name: "Groups",
        Component: Groups,
        deleteKey: "practice.delete.band",
        nameField: "name",
        headers: {
            fr: ["Nom du groupe", "Type", "Genre musical", "Actions"],
            en: ["Band name", "Type", "Music genre", "Actions"],
        },
    },
    {
        name: "Instruments",
        Component: Instruments,
        deleteKey: "practice.delete.instrument",
        nameField: "label",
        headers: {
            fr: ["Nom", "Actif ?", "Actions"],
            en: ["Name", "Active?", "Actions"],
        },
    },
    {
        name: "Materials",
        Component: Materials,
        deleteKey: "practice.delete.material",
        nameField: "name",
        headers: {
            fr: ["Nom", "Prix /h", "Actif ?", "Actions"],
            en: ["Name", "Price /h", "Active?", "Actions"],
        },
    },
    {
        name: "MusicGenres",
        Component: MusicGenres,
        deleteKey: "practice.delete.musicGenre",
        nameField: "name",
        headers: {
            fr: ["Nom", "Actions"],
            en: ["Name", "Actions"],
        },
    },
];

afterEach(async () => {
    await i18n.changeLanguage("fr");
    vi.clearAllMocks();
});

// ============================================================================================
// 1. i18n layer — practice.* resolves in fr AND en, fr/en parity, delete.* interpolation
// ============================================================================================
describe("parameters practice.* — i18n layer", () => {
    const flatten = (obj, prefix = "") =>
        Object.entries(obj).flatMap(([k, v]) =>
            v && typeof v === "object" ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
        );

    const FR_KEYS = flatten({practice: fr.practice});
    const EN_KEYS = flatten({practice: en.practice});

    test("fr and en expose exactly the same practice.* key set", () => {
        expect(new Set(EN_KEYS)).toEqual(new Set(FR_KEYS));
        // pin the exact count — bump per lot so a lot adding fewer keys than intended trips here
        expect(FR_KEYS).toHaveLength(30);
    });

    test.each(["fr", "en"])(
        "every practice.* key resolves to real, non-empty, brace-free copy in %s",
        (lng) => {
            const t = i18n.getFixedT(lng, "parameters");
            for (const key of FR_KEYS) {
                const v = t(key, {name: "X"});
                expect(typeof v).toBe("string");
                expect(v.length).toBeGreaterThan(0);
                expect(v).not.toBe(key);
                expect(v).not.toMatch(/\{\{/);
            }
        },
    );

    // The 7 entity-specific delete prompts each interpolate {{name}} and name their entity.
    const DELETE_ENTITY = [
        ["practice.delete.bandType", "type de groupe"],
        ["practice.delete.feature", "feature"],
        ["practice.delete.flatRate", "forfait"],
        ["practice.delete.band", "groupe"],
        ["practice.delete.instrument", "instrument"],
        ["practice.delete.material", "matériel"],
        ["practice.delete.musicGenre", "genre"],
    ];

    test.each(DELETE_ENTITY)("fr %s interpolates {{name}} and mentions the entity", (key, word) => {
        const v = i18n.getFixedT("fr", "parameters")(key, {name: "Zephyr"});
        expect(v).toContain("Zephyr");
        expect(v).not.toMatch(/\{\{/);
        expect(v.toLowerCase()).toContain(word);
    });

    test.each(DELETE_ENTITY.map(([key]) => key))(
        "en %s interpolates {{name}} (brace-free, contains the value)",
        (key) => {
            const v = i18n.getFixedT("en", "parameters")(key, {name: "Zephyr"});
            expect(v).toContain("Zephyr");
            expect(v).not.toMatch(/\{\{/);
        },
    );

    test.each(["fr", "en"])("practice.delete.confirm* + yes/no + errorTitle resolve in %s", (lng) => {
        const t = i18n.getFixedT(lng, "parameters");
        for (const key of [
            "practice.delete.confirmYes", "practice.delete.confirmNo",
            "practice.yes", "practice.no", "practice.errorTitle",
        ]) {
            expect(t(key)).not.toBe(key);
            expect(t(key).length).toBeGreaterThan(0);
        }
    });
});

// ============================================================================================
// 2. Column headers — mount each wrapped table (real withTranslation -> real `t` prop threaded
//    into the constructor), react-table stubbed to surface the Header strings.
// ============================================================================================
describe("Practice tables — translated column headers", () => {
    for (const {name, Component, headers} of TABLES) {
        describe(name, () => {
            test.each(["fr", "en"])("renders the expected column headers in %s", async (lng) => {
                await i18n.changeLanguage(lng);
                render(<Component urlListData="/x" urlNew="/x/new" />);

                const got = screen
                    .getAllByTestId("col-header")
                    .map((el) => el.textContent)
                    .filter(Boolean);

                expect(got).toEqual(["#", ...headers[lng]]);
            });
        });
    }

    // Explicit spot-checks: shared headers + a few table-specific ones, both locales.
    test.each([
        ["fr", "Nom", "Actions"],
        ["en", "Name", "Actions"],
    ])("shared headers in %s (BandsType)", async (lng, nameCol, actionsCol) => {
        await i18n.changeLanguage(lng);
        render(<BandsType urlListData="/x" urlNew="/x/new" />);
        const got = screen.getAllByTestId("col-header").map((el) => el.textContent);
        expect(got).toContain(nameCol);
        expect(got).toContain(actionsCol);
    });

    test.each([
        ["fr", "Actif ?"],
        ["en", "Active?"],
    ])("boolean 'active' header in %s (Features)", async (lng, activeCol) => {
        await i18n.changeLanguage(lng);
        render(<Features urlListData="/x" urlNew="/x/new" />);
        expect(screen.getAllByTestId("col-header").map((el) => el.textContent)).toContain(activeCol);
    });

    test.each([
        ["fr", ["Nom du groupe", "Type", "Genre musical"]],
        ["en", ["Band name", "Type", "Music genre"]],
    ])("Groups table-specific headers in %s", async (lng, cols) => {
        await i18n.changeLanguage(lng);
        render(<Groups urlListData="/x" urlNew="/x/new" />);
        const got = screen.getAllByTestId("col-header").map((el) => el.textContent);
        for (const c of cols) expect(got).toContain(c);
    });

    test.each([
        ["fr", ["Nombre d'heures", "Tarif solo/duo", "Tarif de groupe"]],
        ["en", ["Number of hours", "Solo/duo rate", "Group rate"]],
    ])("FlatRate table-specific headers in %s", async (lng, cols) => {
        await i18n.changeLanguage(lng);
        render(<FlatRate urlListData="/x" urlNew="/x/new" />);
        const got = screen.getAllByTestId("col-header").map((el) => el.textContent);
        for (const c of cols) expect(got).toContain(c);
    });

    test.each([
        ["fr", ["Actif ?", "Prix /h"]],
        ["en", ["Active?", "Price /h"]],
    ])("Materials table-specific headers in %s", async (lng, cols) => {
        await i18n.changeLanguage(lng);
        render(<Materials urlListData="/x" urlNew="/x/new" />);
        const got = screen.getAllByTestId("col-header").map((el) => el.textContent);
        for (const c of cols) expect(got).toContain(c);
    });
});

// ============================================================================================
// 3. deleteStatus — swal() called with fully-translated title / cancel / confirm text.
//    Regression guard for the `const {t} = this.props;` binding inside `deleteStatus`.
// ============================================================================================
describe("Practice tables — deleteStatus swal i18n", () => {
    // Reach the class instance (the HOC is not `{withRef: true}`) by rendering WrappedComponent
    // with `t` / `i18n` supplied directly.
    function mountInstance(WrappedDefault, lng) {
        const Klass = WrappedDefault.WrappedComponent;
        let inst;
        render(
            <Klass
                t={i18n.getFixedT(lng, "parameters")}
                i18n={i18n}
                tReady
                urlListData="/x"
                urlNew="/x/new"
                ref={(r) => {
                    inst = r;
                }}
            />,
        );
        return inst;
    }

    // All 7 — MusicGenres included: it is the only table without an explicit
    // `this.deleteStatus = this.deleteStatus.bind(this)` in its constructor, so it must stay
    // covered here and in the `Cell` onClick test below.
    const DELETE_CASES = TABLES;

    for (const {name, Component, deleteKey, nameField} of DELETE_CASES) {
        describe(name, () => {
            test.each(["fr", "en"])(
                "deleteStatus builds a %s-translated swal (title + cancel + confirm)",
                async (lng) => {
                    await i18n.changeLanguage(lng);
                    const t = i18n.getFixedT(lng, "parameters");
                    const inst = mountInstance(Component, lng);

                    inst.deleteStatus({id: 1, name: "Jazz", label: "Piano"});

                    expect(swal).toHaveBeenCalledTimes(1);
                    const opts = swal.mock.calls[0][0];

                    const expectedName = nameField === "label" ? "Piano" : "Jazz";
                    expect(opts.title).toBe(t(deleteKey, {name: expectedName}));
                    expect(opts.title).toContain(expectedName);
                    expect(opts.title).not.toBe(deleteKey);
                    expect(opts.title).not.toMatch(/\{\{/);

                    expect(opts.cancelButtonText).toBe(t("practice.delete.confirmNo"));
                    expect(opts.confirmButtonText).toBe(t("practice.delete.confirmYes"));
                },
            );
        });
    }

    test("explicit fr / en strings (BandsType)", async () => {
        await i18n.changeLanguage("fr");
        mountInstance(BandsType, "fr").deleteStatus({id: 1, name: "Rock"});
        let opts = swal.mock.calls[0][0];
        expect(opts.title).toBe("Voulez-vous vraiment supprimer le type de groupe 'Rock' ?");
        expect(opts.cancelButtonText).toBe("non");
        expect(opts.confirmButtonText).toBe("oui");

        swal.mockClear();

        await i18n.changeLanguage("en");
        mountInstance(BandsType, "en").deleteStatus({id: 1, name: "Rock"});
        opts = swal.mock.calls[0][0];
        expect(opts.title).toBe("Do you really want to delete the band type 'Rock'?");
        expect(opts.cancelButtonText).toBe("no");
        expect(opts.confirmButtonText).toBe("yes");
    });

    test("Instruments interpolates status.label, not status.name", async () => {
        await i18n.changeLanguage("fr");
        mountInstance(Instruments, "fr").deleteStatus({id: 1, name: "WRONG", label: "Guitare"});
        const opts = swal.mock.calls[0][0];
        expect(opts.title).toContain("Guitare");
        expect(opts.title).not.toContain("WRONG");
    });

    // The actions-column `Cell` wires `onClick={() => this.deleteStatus(props.original)}`.
    // MusicGenres relies on that arrow for `this` (no `.bind` in its constructor), so drive the
    // real Cell for every table and confirm the click reaches a translated swal.
    for (const {name, Component, deleteKey, nameField} of TABLES) {
        test(`${name}: actions-column Cell onClick reaches deleteStatus (this bound)`, async () => {
            await i18n.changeLanguage("fr");
            const t = i18n.getFixedT("fr", "parameters");
            const inst = mountInstance(Component, "fr");

            const actionsCol = inst.state.columns.find((c) => c.id === "actions");
            const original = {id: 7, name: "Jazz", label: "Piano"};
            const {container} = render(<div>{actionsCol.Cell({original})}</div>);
            container.querySelector("a.btn-warning").click();

            expect(swal).toHaveBeenCalledTimes(1);
            const expectedName = nameField === "label" ? "Piano" : "Jazz";
            expect(swal.mock.calls[0][0].title).toBe(t(deleteKey, {name: expectedName}));
        });
    }

    // Error branch: user confirms, the DELETE comes back non-200 -> a second swal titled
    // `practice.errorTitle`. `t` must still be in scope inside the nested `.then` closures.
    test.each(["fr", "en"])("deleteStatus error branch titles the swal with errorTitle (%s)", async (lng) => {
        await i18n.changeLanguage(lng);
        const t = i18n.getFixedT(lng, "parameters");
        swal.mockImplementation(() => Promise.resolve({value: true}));
        global.fetch = vi.fn().mockResolvedValue({
            status: 422,
            text: () => Promise.resolve("boom"),
        });

        const inst = mountInstance(Materials, lng);
        await inst.deleteStatus({id: 1, name: "Amp"});
        await new Promise((r) => setTimeout(r, 0));

        const errCall = swal.mock.calls.find((c) => c[0].type === "error");
        expect(errCall).toBeTruthy();
        expect(errCall[0].title).toBe(t("practice.errorTitle"));
        expect(errCall[0].text).toBe("boom");

        delete global.fetch;
    });
});

// ============================================================================================
// 4. HOC shape — `withTranslation("parameters")(X)` kept the `extends BaseDataTable` chain.
// ============================================================================================
describe("Practice tables — withTranslation wrap preserves BaseDataTable inheritance", () => {
    test.each(TABLES.map(({name, Component}) => [name, Component]))(
        "%s.WrappedComponent still extends BaseDataTable",
        (_name, Component) => {
            expect(Component.WrappedComponent).toBeDefined();
            expect(Component.WrappedComponent.prototype instanceof React.Component).toBe(true);
            expect(Component.WrappedComponent.prototype instanceof BaseDataTable).toBe(true);
            expect(Object.getPrototypeOf(Component.WrappedComponent.prototype)).toBe(
                BaseDataTable.prototype,
            );
        },
    );
});
