// i18n-layer resolution check for the activity-ref form's <Trans> keys (i18n-06 "activities"
// domain, lot 2c). No component render — just `i18n.t(...)` on the singleton.
//
// A <Trans> i18nKey value is *supposed* to contain its numeric child markers (`<1>` / `<3>`) —
// react-i18next consumes those at render time, they do not leak into the DOM (the
// ActivityRefApplication / WorkGroupTemplateEditor component tests verify the rendered output).
// Here we only assert the raw strings resolve in both locales and still carry their markers, so a
// missing / renamed key is caught cheaply.

import i18n from "../../i18n";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

const transKeys = {
    "activityRefApplication.help.multiSelect": ["<1>"],
    "activityRefApplication.help.rangeSelect": ["<1>"],
    "activityRefApplication.help.combine": ["<1>", "<3>"],
    "workGroup.noInstruments": ["<1>"],
};

describe("activities <Trans> keys resolve at the i18n layer", () => {
    for (const lng of ["fr", "en"]) {
        for (const [key, markers] of Object.entries(transKeys)) {
            test(`${lng}: activities:${key}`, async () => {
                await i18n.changeLanguage(lng);
                const value = i18n.t(`activities:${key}`);

                expect(value).toBeTruthy();
                expect(value).not.toBe(key);
                expect(value).not.toBe(`activities:${key}`);
                for (const marker of markers) {
                    expect(value).toContain(marker);
                }
            });
        }
    }
});
