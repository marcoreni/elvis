// Component test for the vendored StepZilla (frontend/components/utils/ui/StepZilla.tsx),
// replacing the git-pinned react-stepzilla npm dependency. Exercises the behavior real callers
// (AddCourse.jsx, Wizard.jsx) depend on: step rendering, next/previous navigation, per-step
// isValidated() gating via a real ref (not react-stepzilla's legacy string refs), nav-bar
// jumpToStep, and the fork's steps.length-resync fix. AddCourse.test.jsx already covers this
// mounted for real inside its actual consumer; this file is the focused unit-level coverage.
//
// next()/previous()/jumpToStep() all wrap their validation check in Promise.resolve(...).then(),
// even for a synchronous true/false -- upstream's own design, to treat sync and async
// isValidated() the same way. That means every click that goes through them needs a real
// microtask flush before asserting, not a bare fireEvent.click(); `await waitFor(...)` below
// isn't defensive boilerplate, it's required.

import React, { Component } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StepZilla from "./StepZilla";

class PlainStep extends Component {
    render() {
        return <div>Plain step {this.props.label}</div>;
    }
}

class ValidatingStep extends Component {
    isValidated() {
        return this.props.valid;
    }

    render() {
        return <div>Validating step {this.props.label}</div>;
    }
}

function FunctionStep({ label }) {
    return <div>Function step {label}</div>;
}

const steps = () => [
    { name: "Step 1", component: <PlainStep label="1" /> },
    { name: "Step 2", component: <PlainStep label="2" /> },
    { name: "Step 3", component: <PlainStep label="3" /> },
];

test("renders the first step's component and hides the Previous button", () => {
    render(<StepZilla steps={steps()} />);

    expect(screen.getByText("Plain step 1")).toBeInTheDocument();
    expect(screen.getByText("Next")).not.toHaveStyle({ display: "none" });
    expect(screen.getByText("Previous")).toHaveStyle({ display: "none" });
});

test("Next advances to the next step when the active step has no isValidated (auto-valid)", async () => {
    render(<StepZilla steps={steps()} />);

    fireEvent.click(screen.getByText("Next"));

    await waitFor(() =>
        expect(screen.getByText("Plain step 2")).toBeInTheDocument()
    );
    expect(screen.queryByText("Plain step 1")).not.toBeInTheDocument();
});

test("Next is blocked while isValidated() returns false, and proceeds once it returns true", async () => {
    const stepList = [
        {
            name: "Step 1",
            component: <ValidatingStep label="1" valid={false} />,
        },
        { name: "Step 2", component: <PlainStep label="2" /> },
    ];

    const { rerender } = render(<StepZilla steps={stepList} />);

    fireEvent.click(screen.getByText("Next"));
    await waitFor(() =>
        expect(screen.getByText("Validating step 1")).toBeInTheDocument()
    );

    stepList[0] = {
        ...stepList[0],
        component: <ValidatingStep label="1" valid={true} />,
    };
    rerender(<StepZilla steps={stepList} />);

    fireEvent.click(screen.getByText("Next"));
    await waitFor(() =>
        expect(screen.getByText("Plain step 2")).toBeInTheDocument()
    );
});

test("a step with no ref (function component) is treated as always-valid, same as a class step with no isValidated", async () => {
    const stepList = [
        { name: "Step 1", component: <FunctionStep label="1" /> },
        { name: "Step 2", component: <PlainStep label="2" /> },
    ];

    render(<StepZilla steps={stepList} />);

    fireEvent.click(screen.getByText("Next"));

    await waitFor(() =>
        expect(screen.getByText("Plain step 2")).toBeInTheDocument()
    );
});

test("Previous is shown on the last step by default, and hidden when prevBtnOnLastStep=false", async () => {
    const twoSteps = [
        { name: "Step 1", component: <PlainStep label="1" /> },
        { name: "Step 2", component: <PlainStep label="2" /> },
    ];

    const { rerender } = render(<StepZilla steps={twoSteps} />);
    fireEvent.click(screen.getByText("Next"));
    await waitFor(() =>
        expect(screen.getByText("Plain step 2")).toBeInTheDocument()
    );

    // Regression: the last-step branch must override the "hide on step 0" default, not just
    // leave Previous visible because compState !== 0.
    expect(screen.getByText("Previous")).not.toHaveStyle({ display: "none" });

    rerender(<StepZilla steps={twoSteps} prevBtnOnLastStep={false} />);

    expect(screen.getByText("Previous")).toHaveStyle({ display: "none" });
});

test("clicking a step in the nav bar (jumpToStep) navigates directly when stepsNavigation is true", async () => {
    render(<StepZilla steps={steps()} />);

    fireEvent.click(screen.getByText("3"));

    await waitFor(() =>
        expect(screen.getByText("Plain step 3")).toBeInTheDocument()
    );
});

test("clicking a nav bar step does nothing when stepsNavigation is false", () => {
    render(<StepZilla steps={steps()} stepsNavigation={false} />);

    fireEvent.click(screen.getByText("3"));

    expect(screen.getByText("Plain step 1")).toBeInTheDocument();
});

test("re-syncs the nav bar when steps.length changes (the fork's fix over upstream)", async () => {
    const initial = steps();
    const { rerender } = render(<StepZilla steps={initial} />);

    fireEvent.click(screen.getByText("Next"));
    await waitFor(() =>
        expect(screen.getByText("Plain step 2")).toBeInTheDocument()
    );

    // Drop a step out from under the current position -- should not crash, and should
    // re-render on the new array without staying stuck on stale nav state.
    const shrunk = [initial[0], initial[1]];
    rerender(<StepZilla steps={shrunk} />);

    expect(screen.getByText("Plain step 2")).toBeInTheDocument();
    expect(screen.getByText("Next")).toHaveStyle({ display: "none" });
});

test("passes through custom button text and classes", async () => {
    render(
        <StepZilla
            steps={steps()}
            nextButtonText="Continuer"
            backButtonText="Retour"
            nextButtonCls="custom-next"
            backButtonCls="custom-back"
        />
    );

    const nextBtn = screen.getByText("Continuer");
    expect(nextBtn).toHaveClass("custom-next");
    fireEvent.click(nextBtn);
    await waitFor(() =>
        expect(screen.getByText("Retour")).toHaveClass("custom-back")
    );
});

test("onStepChange fires with the new step index", async () => {
    const onStepChange = vi.fn();
    render(<StepZilla steps={steps()} onStepChange={onStepChange} />);

    fireEvent.click(screen.getByText("Next"));

    await waitFor(() => expect(onStepChange).toHaveBeenCalledWith(1));
});
