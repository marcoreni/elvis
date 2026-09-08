// Phase 07 P5 checkpoint guard — structural fr/en parity for every namespace the big
// React-tail extraction (~142 components) fed strings into.
//
// The per-component smoke tests below only prove ONE representative string per cluster
// flips language. This file is the cheap data-driven guard that a future one-sided key
// add (a new `foo.bar` in fr/ but not en/, or vice versa) is caught for the whole
// surface at once — and additionally that each leaf carries the *same* `{{…}}`
// interpolation tokens in both locales, so `t("…", { count })` can't silently drop a
// placeholder in one language.
//
// `frontend/i18n/index.test.js` already asserts identical fr/en key sets across all
// loaded namespaces; this narrows to the P5 list and adds the interpolation-token check.

import i18n from "./index";

// The 7 namespaces P5 extended (see the i18n(P5) commit series on feat/i18n-p5-react-tail).
const P5_NAMESPACES = [
    "users",
    "activityApplications",
    "planning",
    "evaluation",
    "parameters",
    "common",
    "courses",
];

const flattenLeaves = (obj, prefix = "") =>
    Object.entries(obj).flatMap(([k, v]) => {
        const key = prefix ? `${prefix}.${k}` : k;
        return v && typeof v === "object" && !Array.isArray(v)
            ? flattenLeaves(v, key)
            : [[key, v]];
    });

// `{{ teacher }}`, `{{count}}`, `{{val, number}}` -> "teacher" / "count" / "val".
const interpolationTokens = value => {
    if (typeof value !== "string") return [];
    const tokens = [];
    const re = /\{\{\s*([^}|,\s]+)/g;
    let m;
    while ((m = re.exec(value)) !== null) tokens.push(m[1]);
    return tokens.sort();
};

describe("frontend/i18n P5 namespace parity", () => {
    describe.each(P5_NAMESPACES)("%s", ns => {
        const fr = Object.fromEntries(
            flattenLeaves(i18n.getResourceBundle("fr", ns) || {})
        );
        const en = Object.fromEntries(
            flattenLeaves(i18n.getResourceBundle("en", ns) || {})
        );

        test("fr and en define the identical set of leaf key paths", () => {
            expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
        });

        test("each leaf carries the same {{…}} interpolation tokens in fr and en", () => {
            const mismatches = [];
            for (const key of Object.keys(fr)) {
                if (!(key in en)) continue; // key-set drift already reported above
                const frTokens = interpolationTokens(fr[key]);
                const enTokens = interpolationTokens(en[key]);
                if (JSON.stringify(frTokens) !== JSON.stringify(enTokens)) {
                    mismatches.push({ key, fr: frTokens, en: enTokens });
                }
            }
            expect(mismatches).toEqual([]);
        });
    });
});
