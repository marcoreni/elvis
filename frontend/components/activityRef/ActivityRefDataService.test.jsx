// i18n-layer coverage for the "activities" pricing string added this lot (i18n-06 lot 2a).
//
// ActivityRefDataService is a non-component data class (extends common/baseDataTable/DataService)
// whose deleteData() reject path now calls i18n.t("activities:activityRef.pricing.inUseError").
// Two things are asserted:
//   1. the key resolves in fr + en (non-empty, not the key, no leftover interpolation braces);
//   2. deleteData() on a pricing that is still referenced by a pack rejects with
//      { status: 400, message: <the resolved string> }.

import i18n from "../../i18n";
import ActivityRefDataService from "./ActivityRefDataService";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

describe("activities:activityRef.pricing.inUseError resolution", () => {
    for (const lng of ["fr", "en"]) {
        test(`${lng}: resolves`, async () => {
            await i18n.changeLanguage(lng);
            const value = i18n.t("activities:activityRef.pricing.inUseError");
            expect(value).toBeTruthy();
            expect(value).not.toBe("activityRef.pricing.inUseError");
            expect(value).not.toBe("activities:activityRef.pricing.inUseError");
            expect(value).not.toMatch(/\{\{/);
        });
    }
});

describe("ActivityRefDataService#deleteData", () => {
    test("rejects an in-use pricing with the resolved 400 message", async () => {
        await i18n.changeLanguage("fr");
        const service = new ActivityRefDataService(1, [{activity_ref_pricing_id: 9}]);

        await expect(service.deleteData({id: 9})).rejects.toEqual({
            status: 400,
            message: i18n.t("activities:activityRef.pricing.inUseError"),
        });
    });
});
