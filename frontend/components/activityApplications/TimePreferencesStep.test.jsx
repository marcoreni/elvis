// Regression test for the KnownIssues "availabilityRef.current.componentDidMount() reads stale
// props under automatic batching" bug: TimePreferencesStep's PLANNING_MODE default-availabilities
// fetch calls `onAvailabilityAdd(...)` (a parent setState) and used to immediately follow it with
// `availabilityRef.current.componentDidMount()` to force AvailabilityManager to re-read the new
// `intervals` prop -- under React 18+ automatic batching the parent's setState hadn't committed
// yet, so that imperative call read stale (empty) props and the fetched availability never
// rendered. The fix (AvailabilityManager.jsx) replaces that with a real `componentDidUpdate`;
// this test exercises the real (unmocked) AvailabilityManager end to end, through a small harness
// that mirrors how Wizard.jsx actually owns `intervals` state and passes it down.

import React, { useState } from "react";
import { render, act } from "@testing-library/react";
import i18n from "../../i18n";
import TimePreferencesStep, { PLANNING_MODE } from "./TimePreferencesStep";

let lastApiSuccess = null;
vi.mock("../../tools/api", () => {
    const chain = () => {
        const c = {};
        c.before = () => c;
        c.success = (fn) => {
            lastApiSuccess = fn;
            return c;
        };
        c.error = () => c;
        c.get = () => c;
        c.post = () => c;
        c.patch = () => c;
        c.put = () => c;
        c.del = () => c;
        return c;
    };
    return { set: chain, del: () => Promise.resolve({}) };
});

afterEach(async () => {
    lastApiSuccess = null;
    await i18n.changeLanguage("fr");
});

// Mirrors Wizard.jsx's `handleAddAvailability`: owns `intervals` state and hands TimePreferencesStep
// a fresh array (via `.concat`) through `onAvailabilityAdd`, exactly like the real parent does.
function Harness() {
    const [intervals, setIntervals] = useState([]);
    return (
        <TimePreferencesStep
            mode={PLANNING_MODE}
            intervals={intervals}
            authToken=""
            planningId={1}
            onAvailabilityAdd={(added) =>
                setIntervals((prev) => prev.concat(added))
            }
            onAvailabilityDelete={() => {}}
            season={{ id: 1, start: "2024-01-01" }}
            selectionLabels={[]}
        />
    );
}

describe("TimePreferencesStep -- default availabilities actually render (not stale under batching)", () => {
    test("the fetched default interval appears in AvailabilityManager's rendered list", async () => {
        await i18n.changeLanguage("fr");
        const { container } = render(<Harness />);

        expect(container.querySelectorAll(".border-kind-p")).toHaveLength(0);
        expect(lastApiSuccess).toBeInstanceOf(Function);

        act(() => {
            lastApiSuccess([
                {
                    id: 1,
                    start: "2024-01-01T10:00:00.000Z",
                    end: "2024-01-01T11:00:00.000Z",
                    kind: "p",
                },
            ]);
        });

        expect(container.querySelectorAll(".border-kind-p")).toHaveLength(1);
    });
});
