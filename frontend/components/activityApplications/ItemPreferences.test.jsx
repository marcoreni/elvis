// Regression test for the undeclared-lodash-global fix (fix/undeclared-lodash-global): before that
// fix, `ItemPreferences` read each item's location with `_.get(item, "activity.location.label")`,
// with no `import _ from "lodash"` in this file. Under jsdom (and in the real bundle) that threw
// `ReferenceError: _ is not defined` on every render, regardless of whether `item.activity` was
// even present.

import React from "react";
import { render, screen } from "@testing-library/react";
import ItemPreferences from "./ItemPreferences";

describe("ItemPreferences — _.get resolves the (optional) activity location without throwing", () => {
    test("renders the location badge when item.activity.location is present", () => {
        const items = [
            {
                start: "2025-09-01T10:00:00",
                end: "2025-09-01T11:00:00",
                activity: { location: { label: "Salle 2" } },
            },
        ];

        render(<ItemPreferences items={items} sortable={false} showDate={false} />);

        expect(screen.getByText("Salle 2")).toBeInTheDocument();
    });

    test("renders without throwing and without a location badge when item.activity is absent", () => {
        const items = [{ start: "2025-09-01T10:00:00", end: "2025-09-01T11:00:00" }];

        expect(() =>
            render(<ItemPreferences items={items} sortable={false} showDate={false} />)
        ).not.toThrow();
        expect(screen.queryByText("Salle 2")).not.toBeInTheDocument();
    });
});
