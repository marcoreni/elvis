// Regression test for the KnownIssues "availabilityRef.current.componentDidMount() reads stale
// props under automatic batching" bug (call site 2: SchoolAvailabilities.tsx's weekly-intervals
// fetch, mounted on /parameters/planning_parameters). The fetch's `.success` handler called
// `setIntervals(data.intervals)` immediately followed by `availabilityRef.current.componentDidMount()`
// -- under React 18+ automatic batching that setState hadn't committed yet, so the imperative call
// re-synced AvailabilityManager's own `state.list` from the still-stale (empty) `props.intervals`,
// and the fetched availabilities never rendered. The fix drops that imperative call and gives
// AvailabilityManager a real `componentDidUpdate` instead; this test exercises the real (unmocked)
// AvailabilityManager end to end.

import React from "react";
import { render, act } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import i18n from "../../../i18n";
import SchoolAvailabilities from "./SchoolAvailabilities";

let lastApiSuccess: ((data: { intervals: unknown[] }) => void) | null = null;
vi.mock("../../../tools/api", () => {
    const chain = () => {
        const c: any = {};
        c.before = () => c;
        c.success = (fn: any) => {
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

vi.mock("sweetalert2", () => ({ default: { fire: vi.fn() } }));

afterEach(async () => {
    lastApiSuccess = null;
    await i18n.changeLanguage("fr");
});

const seasons = [
    { id: 1, label: "2025-26", start: "2025-09-01", is_current: true },
];

describe("SchoolAvailabilities -- weekly intervals actually render (not stale under batching)", () => {
    test("the fetched interval appears in AvailabilityManager's rendered list", async () => {
        await i18n.changeLanguage("fr");
        const { container } = render(
            <SchoolAvailabilities
                planningId={1}
                authToken=""
                seasons={seasons}
            />
        );

        expect(container.querySelectorAll(".border-kind-p")).toHaveLength(0);
        expect(lastApiSuccess).toBeInstanceOf(Function);

        act(() => {
            lastApiSuccess!({
                intervals: [
                    {
                        id: 1,
                        start: "2025-09-01T10:00:00.000Z",
                        end: "2025-09-01T11:00:00.000Z",
                        kind: "p",
                    },
                ],
            });
        });

        expect(container.querySelectorAll(".border-kind-p")).toHaveLength(1);
    });
});
