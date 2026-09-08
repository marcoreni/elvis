// i18n Phase 07 P5 (React-tail extraction) — bilingual smoke test.
//
// P5 commit fef1b3ba converted PacksApplications/MyActivities/placeholderCard.jsx to
// `useTranslation("activityApplications")`: the placeholder card's heading, description,
// enrol CTA and the <img alt> are now `t("activityApplications:packs.placeholder.*")` /
// `packs.card.cardImageAlt` instead of hardcoded French. This mounts the real component
// once per locale and checks the extracted keys resolve on both sides — no throw, no
// "translation missing", no raw dotted-key leak — asserting the fr vs en value of one
// representative string (packs.placeholder.notEnrolledYet).
//
// Leaf component: only prop is `user` (needs `.id` for the enrol href), no api / heavy
// children, so nothing to mock. Locale is driven through the frontend/i18n singleton;
// afterEach restores "fr".

import React from "react";
import { render } from "@testing-library/react";
import i18n from "../../../i18n";
import PlaceholderCard from "./placeholderCard";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

const baseProps = () => ({ user: { id: 42 } });

const REPRESENTATIVE = {
    fr: "Pas encore inscrit ?",
    en: "Not enrolled yet?",
};

describe.each(["fr", "en"])(
    "placeholderCard — activityApplications:packs.placeholder.* extraction (%s)",
    lng => {
        test("renders the extracted copy for the active language, no missing keys", async () => {
            await i18n.changeLanguage(lng);
            const { container } = render(<PlaceholderCard {...baseProps()} />);

            expect(container.textContent).toContain(REPRESENTATIVE[lng]);
            expect(container.textContent).not.toContain(
                REPRESENTATIVE[lng === "fr" ? "en" : "fr"]
            );

            // no i18next fallback markers, no un-resolved dotted keys bleeding into the DOM
            expect(container.textContent).not.toMatch(/translation missing/i);
            expect(container.textContent).not.toMatch(
                /activityApplications:packs\./
            );
            expect(container.innerHTML).not.toMatch(/packs\.placeholder\.\w+/);

            // the <img alt> is also driven by t(...) after P5
            const img = container.querySelector("img");
            expect(img).toBeTruthy();
            expect(img.getAttribute("alt")).toBe(
                lng === "fr" ? "image de la carte" : "card image"
            );
        });
    }
);
