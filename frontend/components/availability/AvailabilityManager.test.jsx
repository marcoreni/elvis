// Regression test: `withTranslation("planning")(AvailabilityManager)` without `{ withRef: true }`
// attaches a `ref` passed to the exported component to react-i18next's own function-component
// wrapper instead of forwarding it to the wrapped class instance. TimePreferencesStep.jsx relies
// on `availabilityRef.current.componentDidMount()` (a real class method) actually existing --
// without `withRef: true` that ref stays permanently null and the call throws
// `TypeError: Cannot read properties of null`.

import React from "react";
import { render, screen, act } from "@testing-library/react";
import i18n from "../../i18n";
import AvailabilityManager from "./AvailabilityManager";

afterEach(async () => {
    await i18n.changeLanguage("fr");
});

const baseProps = {
    day: new Date("2024-01-01"),
    authToken: "",
    isTeacher: false,
    locked: true,
    kinds: ["p"],
    seasonId: 1,
    forSeason: true,
    disableLiveReload: true,
    onAdd: () => {},
    onDelete: () => {},
};

describe("AvailabilityManager -- ref forwarding (withTranslation withRef)", () => {
    test("a ref passed to the exported component resolves to the real class instance, not null", () => {
        const ref = React.createRef();

        render(<AvailabilityManager {...baseProps} ref={ref} intervals={[]} />);

        expect(ref.current).not.toBeNull();
        expect(typeof ref.current.componentDidMount).toBe("function");
        expect(ref.current.state).toBeDefined();
    });

    test("componentDidMount is callable directly through the ref, exactly like TimePreferencesStep does", () => {
        const ref = React.createRef();
        const intervals = [
            {
                id: 1,
                start: "2024-01-01T10:00:00Z",
                end: "2024-01-01T11:00:00Z",
                kind: "p",
            },
        ];

        render(
            <AvailabilityManager
                {...baseProps}
                ref={ref}
                intervals={intervals}
            />
        );

        expect(() => ref.current.componentDidMount()).not.toThrow();
        expect(ref.current.state.list).toHaveLength(1);
    });
});

// KnownIssues "availabilityRef.current.componentDidMount() reads stale props under automatic
// batching" fix: AvailabilityManager now has a real `componentDidUpdate` syncing `state.list`
// from `props.intervals` whenever that reference actually changes, instead of relying solely on
// `componentDidMount` (its only previous props->state path) plus an external, timing-sensitive
// imperative re-invocation of that same method.
describe("AvailabilityManager -- componentDidUpdate syncs state.list from props.intervals", () => {
    test("a new `intervals` reference on rerender updates state.list (the real automatic-batching bug this fixes)", () => {
        const ref = React.createRef();
        const { rerender } = render(
            <AvailabilityManager {...baseProps} ref={ref} intervals={[]} />
        );
        expect(ref.current.state.list).toHaveLength(0);

        const newIntervals = [
            {
                id: 1,
                start: "2024-01-01T10:00:00Z",
                end: "2024-01-01T11:00:00Z",
                kind: "p",
            },
        ];
        rerender(
            <AvailabilityManager
                {...baseProps}
                ref={ref}
                intervals={newIntervals}
            />
        );

        expect(ref.current.state.list).toHaveLength(1);
        expect(ref.current.state.list[0].id).toBe(1);
    });

    test("rerendering with the same `intervals` reference does not clobber unrelated state changes", () => {
        const ref = React.createRef();
        const intervals = [
            {
                id: 1,
                start: "2024-01-01T10:00:00Z",
                end: "2024-01-01T11:00:00Z",
                kind: "p",
            },
        ];
        const { rerender } = render(
            <AvailabilityManager
                {...baseProps}
                ref={ref}
                intervals={intervals}
            />
        );
        expect(ref.current.state.list).toHaveLength(1);

        // Simulate a local-only change (e.g. a delete) that doesn't come from props.
        act(() => {
            ref.current.setState({ list: [] });
        });
        expect(ref.current.state.list).toHaveLength(0);

        // An unrelated parent rerender with the identical `intervals` reference must NOT
        // re-sync state.list from props and undo the local change.
        rerender(
            <AvailabilityManager
                {...baseProps}
                ref={ref}
                intervals={intervals}
            />
        );
        expect(ref.current.state.list).toHaveLength(0);
    });

    // Regression: `buildListFromIntervals` used to check `!interval.tabId`/`!interval.id`, which
    // treats the real value `0` (a wizard-mode interval's first tabId, see `getNewTabId`) as
    // absent and regenerates a fresh random tabId for it -- silently losing the original tabId
    // every time this resync runs. Pre-existing, just exercised a lot more now that it also runs
    // on every props.intervals change, not only at mount.
    test("an interval with tabId: 0 (falsy, but present) keeps that tabId across a props-driven resync", () => {
        const ref = React.createRef();
        const intervals = [
            {
                tabId: 0,
                start: "2024-01-01T10:00:00Z",
                end: "2024-01-01T11:00:00Z",
                kind: "p",
            },
        ];

        const { rerender } = render(
            <AvailabilityManager
                {...baseProps}
                ref={ref}
                intervals={intervals}
            />
        );
        expect(ref.current.state.list[0].tabId).toBe(0);

        // A props-driven resync (new `intervals` reference, same tabId: 0 content) must not
        // regenerate the tabId.
        rerender(
            <AvailabilityManager
                {...baseProps}
                ref={ref}
                intervals={[{ ...intervals[0] }]}
            />
        );
        expect(ref.current.state.list[0].tabId).toBe(0);
    });
});

// Phase 4c: the `availabilityInfo` banner swapped from the old Draft.js-based `WysiwygViewer` to
// `RichTextViewer` -- a pure prop-compatible swap, not previously exercised by any test here.
describe("AvailabilityManager -- availabilityInfo banner (RichTextViewer)", () => {
    test("renders availabilityInfo through RichTextViewer", () => {
        render(
            <AvailabilityManager
                {...baseProps}
                intervals={[]}
                availabilityInfo="<p>Please submit by Friday</p>"
            />
        );

        expect(screen.getByText("Please submit by Friday")).toBeInTheDocument();
    });

    test("renders nothing extra when availabilityInfo is absent", () => {
        const { container } = render(
            <AvailabilityManager {...baseProps} intervals={[]} />
        );

        expect(container.querySelector(".wysiwyg-viewer")).toBeNull();
    });
});
