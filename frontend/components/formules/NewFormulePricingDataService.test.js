// Code review follow-up (fix/known-issues-batch-5, item #4): not reachable today -- traced that
// new.html.erb always passes a pristine Formule.new with no formule_pricings -- but if
// EditFormule.jsx is ever rendered with `{id: null, formule_pricings: [...]}` (e.g. a future
// duplicate-formule flow), the constructor used to seed `tempIdCounter` at a hardcoded 1 (able to
// collide with a real seeded id) and hold the caller's array by reference (push/splice would
// mutate it in place, outside this component's own state). Both are now guarded.

import NewFormulePricingDataService from "./NewFormulePricingDataService";

function noop() {}

describe("NewFormulePricingDataService seeded with existing pricings", () => {
    test("tempIdCounter starts above the max seeded id, not at a hardcoded 1", () => {
        const seeded = [{ id: 5 }, { id: 2 }];
        const service = new NewFormulePricingDataService(
            noop,
            noop,
            noop,
            seeded,
            [{ id: 10, name: "Standard" }]
        );

        const created = service.createData({
            name: { label: "Standard" },
            price: 50,
            fromSeason: { value: 1 },
            toSeason: null,
        });

        expect(created).resolves.toEqual({
            data: expect.objectContaining({ id: 6 }),
        });
    });

    test("does not mutate the caller's array in place", () => {
        const seeded = [{ id: 5 }];
        const service = new NewFormulePricingDataService(
            noop,
            noop,
            noop,
            seeded,
            [{ id: 10, name: "Standard" }]
        );

        service.createData({
            name: { label: "Standard" },
            price: 50,
            fromSeason: { value: 1 },
            toSeason: null,
        });

        expect(seeded).toEqual([{ id: 5 }]);
    });

    test("an empty seed array still starts tempIdCounter at 1 (the common, reachable-today case)", () => {
        const service = new NewFormulePricingDataService(
            noop,
            noop,
            noop,
            [],
            [{ id: 10, name: "Standard" }]
        );

        expect(service.tempIdCounter).toBe(1);
    });
});
