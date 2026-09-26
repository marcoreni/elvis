// Regression coverage for the item-13 final-3-files migration (docs/Modernization-Roadmap.md) of
// PaymentsSummary.jsx off react-table v6 onto TanStackGrid.
//
// v6's table had a `Footer` render prop building the totals summary (footerTotal /
// footerScheduleTotal / footerPaidToDate / footerBalance); TanStackGrid has no footer concept, so
// that content moved to a plain sibling block rendered right after the grid. This file didn't have
// any test coverage before this migration -- these are basic checks that the moved block still
// renders the right values from real props, plus a sanity check that the (real, unmocked)
// TanStackGrid renders actual row data rather than a mocked stub.
//
// TanStackGrid is NOT mocked here -- rendered for real, same as the AdhesionSettings coverage in
// parameters/Payments/PaymentsSettings.test.jsx.

import React from "react";
import { render, screen } from "@testing-library/react";
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
