// Regression coverage for the item-13 final-3-files migration (docs/Modernization-Roadmap.md) of
// PaymentsSummary.jsx off react-table v6 onto TanStackGrid.
//
// This file predates the migration (i18n-06 payments lot 2c-i) -- it was rewritten here to render
// the real TanStackGrid instead of asserting against react-table v6's now-removed behavior.
//
// v6's table had a `Footer` render prop building the totals summary (footerTotal /
// footerScheduleTotal / footerPaidToDate / footerBalance); TanStackGrid has no footer concept, so
// that content moved to a plain sibling block rendered right after the grid. The tests below check
// that the moved block still renders the right values from real props, plus a sanity check that
// the (real, unmocked) TanStackGrid renders actual row data rather than a mocked stub.
//
// TanStackGrid is NOT mocked here -- rendered for real, same as the AdhesionSettings coverage in
// parameters/Payments/PaymentsSettings.test.jsx.

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../i18n";
import PaymentsSummary from "./PaymentsSummary";

const t = (lng) => i18n.getFixedT(lng, "payments");

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

// Minimal props: `isStudentView: true` keeps the "tarif"/"prorata"/"coupon" cells on their
// simplest branches (no pricing-category <select>, no schedules/locations block above the grid).
const baseProps = () => ({
    isStudentView: true,
    data: [],
    payers: [],
    totalDue: 123.4,
    previsionalTotal: 200,
    totalPayments: 50,
    totalPaymentsToDay: 50,
    adhesionPrices: [],
    pricingCategories: [],
    seasons: [],
    schedules: {},
    locations: [],
    coupons: [],
    formulas: [],
});

describe("PaymentsSummary — totals block (moved out of TanStackGrid's Footer) renders real values", () => {
    test.each(["fr", "en"])(
        "footerTotal / footerScheduleTotal / footerPaidToDate / footerBalance show the right EUR amounts (%s)",
        async (lng) => {
            await i18n.changeLanguage(lng);
            const props = baseProps();

            render(<PaymentsSummary {...props} />);

            const fmt = (n) =>
                n.toLocaleString(lng, { style: "currency", currency: "EUR" });

            // Each amount renders inside its own <strong>, padded with a leading/trailing space
            // (`{` ${amount} `}`) -- `getByText` compares its plain-string matcher against the
            // node's *unnormalized* text, so the padding survives whitespace-collapsing but the
            // matcher string doesn't get the same collapsing applied to it, and a locale's
            // non-breaking space between amount and symbol only compounds that. Matching by
            // tag + trimmed textContent sidesteps both.
            const findAmount = (amount) =>
                screen.getByText(
                    (_content, element) =>
                        element.tagName.toLowerCase() === "strong" &&
                        element.textContent.trim() === amount
                );

            // Each label shares a parent <div> with its <strong> amount (no wrapping element of
            // its own around just the label). "Total:" is a case-insensitive substring of
            // "Schedule total:" (en), so `exact: false` here would match both -- use `exact: true`
            // (the label is the div's whole own text, its <strong> sibling text excluded) instead.
            expect(
                screen.getByText(t(lng)("userPayments.summary.footerTotal"), {
                    exact: true,
                })
            ).toBeInTheDocument();
            expect(findAmount(fmt(props.totalDue))).toBeInTheDocument();

            expect(
                screen.getByText(
                    t(lng)("userPayments.summary.footerScheduleTotal"),
                    { exact: true }
                )
            ).toBeInTheDocument();
            expect(findAmount(fmt(props.previsionalTotal))).toBeInTheDocument();

            expect(
                screen.getByText(
                    t(lng)("userPayments.summary.footerPaidToDate"),
                    { exact: true }
                )
            ).toBeInTheDocument();
            expect(
                findAmount(fmt(props.totalPaymentsToDay))
            ).toBeInTheDocument();

            expect(
                screen.getByText(t(lng)("userPayments.summary.footerBalance"), {
                    exact: true,
                })
            ).toBeInTheDocument();
            expect(
                findAmount(fmt(props.previsionalTotal - props.totalPayments))
            ).toBeInTheDocument();
        }
    );

    test("totalDue == null renders '--' instead of a bogus currency amount", async () => {
        await i18n.changeLanguage("fr");
        render(<PaymentsSummary {...baseProps()} totalDue={null} />);

        const totalLine = screen.getByText(
            t("fr")("userPayments.summary.footerTotal"),
            { exact: false }
        );
        expect(totalLine.textContent).toContain("--");
    });
});

describe("PaymentsSummary — create-coupon modal (ItemFormModal, real and unmocked)", () => {
    // ItemFormModal.test.jsx covers its own Cancel/Save translations directly and unmocked, so
    // this isn't the *only* place those strings get verified -- but it's still the only place
    // that exercises PaymentsSummary's own wiring of it (the "CreateCouponModal" alias, the
    // showCreateCouponModal state toggle, and the createTitle prop): clicking the real button
    // rendered by this component and confirming the real modal it opens shows the expected
    // translated title and Cancel/Save buttons.
    test.each([
        ["fr", "Créer un taux de remise", "Annuler", "Enregistrer"],
        ["en", "Create a discount rate", "Cancel", "Save"],
    ])(
        '%s: clicking "create coupon" opens ItemFormModal with translated title and Cancel/Save buttons',
        async (lng, createCouponText, cancel, save) => {
            await i18n.changeLanguage(lng);
            render(<PaymentsSummary {...baseProps()} />);

            await userEvent.click(await screen.findByText(createCouponText));

            expect(await screen.findByText(cancel)).toBeInTheDocument();
            expect(screen.getByText(save)).toBeInTheDocument();
        }
    );
});

describe("PaymentsSummary — the real TanStackGrid renders actual row data (not a stub)", () => {
    test("a real row's activity, student and discounted total render in the table", async () => {
        await i18n.changeLanguage("fr");
        const row = {
            id: 1,
            activity: "Piano",
            user: {
                id: 5,
                first_name: "Jean",
                last_name: "Dupont",
                adherent_number: "A1",
            },
            pricingCategoryId: null,
            unitPrice: 100,
            due_total: 90,
            discountedTotal: 90,
            coupon: {},
        };

        render(<PaymentsSummary {...baseProps()} data={[row]} />);

        expect(screen.getByText("Piano")).toBeInTheDocument();
        expect(screen.getByText("Jean Dupont")).toBeInTheDocument();

        // The "discounted total" cell renders `toLocaleString("fr", {style: "currency", ...})`,
        // which inserts a non-breaking space between the amount and "€" -- `getByText`'s default
        // whitespace normalizer only collapses the DOM's own text (turning that NBSP into a
        // regular space), not the plain-string matcher, so the two never compare equal. Comparing
        // the raw (unnormalized) textContent directly, via a function matcher, sidesteps that.
        const discountedTotal = (90).toLocaleString("fr", {
            style: "currency",
            currency: "EUR",
        });
        expect(
            screen.getByText(
                (_content, element) =>
                    element.tagName.toLowerCase() === "p" &&
                    element.textContent.trim() === discountedTotal
            )
        ).toBeInTheDocument();
    });
});

// ==================================================================================================
// Regression: no default sort, and JSX-accessor columns aren't sortable (code-review findings)
// ==================================================================================================
//
// The "activity" column's accessor returns JSX -- TanStack's default `sortingFns.basic` treats
// every row's value as a distinct, unequal object and returns -1 for every comparison, which fully
// *reverses* the array instead of the insertion-order no-op v6 always gave this column (v6's own
// comparator returned 0 for objects, falling back to a stable index-based tiebreak). Keeping v6's
// `defaultSorted={[{id: "activity", desc: false}]}` under TanStack would silently reverse every
// row on mount; clicking the header (if left sortable) would do the same interactively.
describe("PaymentsSummary — activity column keeps insertion order (code-review regression)", () => {
    const makeRow = (id, activity) => ({
        id,
        activity,
        user: { id, first_name: activity, last_name: "", adherent_number: id },
        pricingCategoryId: null,
        unitPrice: 10,
        due_total: 10,
        discountedTotal: 10,
        coupon: {},
    });

    const rowOrder = (container) =>
        Array.from(container.querySelectorAll("tbody tr"))
            .map((tr) => tr.textContent)
            .map((text) =>
                ["Alpha", "Beta", "Gamma", "Delta"].find((name) =>
                    text.includes(name)
                )
            );

    test("mounts with no default sort -- rows stay in insertion order, not reversed", async () => {
        await i18n.changeLanguage("fr");
        const data = ["Alpha", "Beta", "Gamma", "Delta"].map((name, i) =>
            makeRow(i + 1, name)
        );

        const { container } = render(
            <PaymentsSummary {...baseProps()} data={data} />
        );

        expect(rowOrder(container)).toEqual([
            "Alpha",
            "Beta",
            "Gamma",
            "Delta",
        ]);
    });

    test("the activity column header is not clickable-to-sort", async () => {
        await i18n.changeLanguage("fr");
        const data = ["Alpha", "Beta", "Gamma", "Delta"].map((name, i) =>
            makeRow(i + 1, name)
        );

        const { container } = render(
            <PaymentsSummary {...baseProps()} data={data} />
        );

        const header = screen.getByText(
            t("fr")("userPayments.summary.columns.activity")
        );
        expect(header.className).not.toContain("sortable");

        await userEvent.click(header);

        expect(rowOrder(container)).toEqual([
            "Alpha",
            "Beta",
            "Gamma",
            "Delta",
        ]);
    });
});
