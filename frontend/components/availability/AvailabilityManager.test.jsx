// Regression test: `withTranslation("planning")(AvailabilityManager)` without `{ withRef: true }`
// attaches a `ref` passed to the exported component to react-i18next's own function-component
// wrapper instead of forwarding it to the wrapped class instance. TimePreferencesStep.jsx relies
// on `availabilityRef.current.componentDidMount()` (a real class method) actually existing --
// without `withRef: true` that ref stays permanently null and the call throws
// `TypeError: Cannot read properties of null`.

import React from "react";
import { render, screen } from "@testing-library/react";
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
