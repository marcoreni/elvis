// Vendored from react-stepzilla 6.0.3 (ISC License, Copyright (c) 2017 Mark Paul), via the
// SIXMON/react-stepzilla fork this app previously depended on (git-pinned, no version tag —
// https://github.com/SIXMON/react-stepzilla). Rewritten as a typed functional component; the
// fork's only behavioral delta over upstream -- re-syncing the nav bar when steps.length changes
// -- is preserved below (the effect watching stepsLength). Converted from legacy string refs
// (`this.refs.activeComponent`), which React 19 removes outright.
//
// Dropped vs. upstream: the react-validation-mixin HOC-validation path
// (`hocValidationAppliedTo`), which depends on a *second* library's own internal string refs and
// isn't a dependency of this app (confirmed: not in package.json, no call site passes
// hocValidationAppliedTo). Everything else upstream supports is preserved.
import React, {
    KeyboardEvent,
    ReactElement,
    useEffect,
    useRef,
    useState,
} from "react";

export interface StepZillaStep {
    name: React.ReactNode;
    component: ReactElement;
}

// The shape StepZilla expects a step's mounted class-component instance to (optionally) expose.
// Only class-component steps get a ref at all (see the instanceof check in renderStep below) --
// a step without isValidated() is treated as always-valid, same as upstream.
export interface StepZillaStepInstance {
    isValidated?: () => boolean;
}

interface StepZillaProps {
    steps: StepZillaStep[];
    showSteps?: boolean;
    showNavigation?: boolean;
    stepsNavigation?: boolean;
    prevBtnOnLastStep?: boolean;
    dontValidate?: boolean;
    preventEnterSubmission?: boolean;
    startAtStep?: number;
    nextButtonText?: string;
    nextTextOnFinalActionStep?: string;
    nextButtonCls?: string;
    backButtonText?: string;
    backButtonCls?: string;
    onStepChange?: (step: number) => void;
}

const hiddenStyle: React.CSSProperties = { display: "none" };

function getNavStates(
    indx: number,
    length: number,
    prevBtnOnLastStep: boolean
): string[] {
    const styles: string[] = [];

    for (let i = 0; i < length; i++) {
        if (i < indx || (!prevBtnOnLastStep && indx === length - 1)) {
            styles.push("done");
        } else if (i === indx) {
            styles.push("doing");
        } else {
            styles.push("todo");
        }
    }

    return styles;
}

export default function StepZilla(props: StepZillaProps) {
    const {
        steps,
        showSteps = true,
        showNavigation = true,
        stepsNavigation = true,
        prevBtnOnLastStep = true,
        dontValidate = false,
        preventEnterSubmission = false,
        startAtStep = 0,
        nextButtonText = "Next",
        nextTextOnFinalActionStep,
        nextButtonCls = "btn btn-prev btn-primary btn-lg pull-right",
        backButtonText = "Previous",
        backButtonCls = "btn btn-next btn-primary btn-lg pull-left",
        onStepChange,
    } = props;

    const [compState, setCompState] = useState(startAtStep);
    const [navState, setNavStateValue] = useState(() =>
        getNavStates(startAtStep, steps.length, prevBtnOnLastStep)
    );

    const activeComponentRef = useRef<StepZillaStepInstance | null>(null);

    // Per-step validated flags, mirroring upstream's approach of storing them on the step objects
    // themselves (mutated in place) rather than in separate React state. Only gates the
    // "jump ahead across multiple steps via the nav bar" check in jumpToStep below -- the normal
    // Next-button flow always calls isValidated() live via stepMoveAllowed(), regardless of this
    // flag. Upstream only ever initializes a step as not-yet-validated on the HOC-validation path
    // (react-validation-mixin), which this app doesn't use, so every step starts true here,
    // computed once at mount (matching the original constructor's one-time timing exactly, not
    // re-run on every steps-array identity change).
    const initializedRef = useRef(false);
    if (!initializedRef.current) {
        initializedRef.current = true;
        steps.forEach((step) => {
            (step as StepZillaStep & { validated?: boolean }).validated = true;
        });
    }

    const stepsLength = steps.length;
    const prevStepsLengthRef = useRef(stepsLength);
    useEffect(() => {
        if (prevStepsLengthRef.current !== stepsLength) {
            prevStepsLengthRef.current = stepsLength;
            setNavState(compState);
        }
        // Intentionally keyed only on stepsLength, matching upstream's componentDidUpdate, which
        // re-syncs the nav bar specifically when the number of steps changes -- not on every
        // compState change (that's already handled by setNavState's own callers).
    }, [stepsLength]);

    function setNavState(next: number) {
        setNavStateValue(getNavStates(next, steps.length, prevBtnOnLastStep));

        if (next < steps.length) {
            setCompState(next);
        }

        if (onStepChange) {
            onStepChange(next);
        }
    }

    function updateStepValidationFlag(val = true) {
        (steps[compState] as StepZillaStep & { validated?: boolean }).validated =
            val;
    }

    function stepMoveAllowed(skipValidationExecution = false): boolean {
        if (dontValidate) {
            return true;
        }

        if (skipValidationExecution) {
            // moving backwards -- don't validate, the user isn't committing to "save"
            return true;
        }

        const active = activeComponentRef.current;
        if (!active || typeof active.isValidated === "undefined") {
            return true;
        }

        return active.isValidated();
    }

    function next() {
        Promise.resolve(stepMoveAllowed())
            .then((proceed = true) => {
                updateStepValidationFlag(proceed);

                if (proceed) {
                    setNavState(compState + 1);
                }
            })
            .catch((e) => {
                if (e) {
                    setTimeout(() => {
                        throw e;
                    });
                }

                updateStepValidationFlag(false);
            });
    }

    function previous() {
        if (compState > 0) {
            setNavState(compState - 1);
        }
    }

    function jumpToStep(target: number) {
        if (!stepsNavigation || target === compState) {
            return;
        }

        const movingBack = target < compState;
        let passThroughStepsNotValid = false;
        let proceed = false;

        Promise.resolve(stepMoveAllowed(movingBack))
            .then((valid = true) => {
                proceed = valid;

                if (!movingBack) {
                    updateStepValidationFlag(proceed);
                }

                if (proceed && !movingBack) {
                    passThroughStepsNotValid = steps
                        .reduce((a: boolean[], c, i) => {
                            if (i >= compState && i < target) {
                                a.push(
                                    !!(c as StepZillaStep & { validated?: boolean })
                                        .validated
                                );
                            }
                            return a;
                        }, [])
                        .some((v) => v === false);
                }
            })
            .catch(() => {
                if (!movingBack) {
                    updateStepValidationFlag(false);
                }
            })
            .then(() => {
                if (proceed && !passThroughStepsNotValid) {
                    if (target === steps.length - 1 && compState === steps.length - 1) {
                        setNavState(steps.length);
                    } else {
                        setNavState(target);
                    }
                }
            })
            .catch((e) => {
                if (e) {
                    setTimeout(() => {
                        throw e;
                    });
                }
            });
    }

    function handleKeyDown(evt: KeyboardEvent<HTMLDivElement>) {
        const target = evt.target as HTMLElement;
        if (evt.key === "Enter") {
            if (!preventEnterSubmission && target.tagName !== "TEXTAREA") {
                next();
            } else if (target.tagName !== "TEXTAREA") {
                evt.preventDefault();
            }
        }
    }

    function getClassName(className: string, i: number): string {
        let liClassName = `${className}-${navState[i]}`;

        if (!stepsNavigation) {
            liClassName += " no-hl";
        }

        return liClassName;
    }

    function renderSteps() {
        return steps.map((s, i) => (
            <li
                className={getClassName("progtrckr", i)}
                onClick={() => {
                    jumpToStep(i);
                }}
                key={i}
                value={i}
            >
                <em>{i + 1}</em>
                <span>{steps[i].name}</span>
            </li>
        ));
    }

    let showPreviousBtn = compState !== 0;
    const showNextBtn = compState < steps.length - 1;
    if (compState >= steps.length - 1) {
        showPreviousBtn = prevBtnOnLastStep;
    }
    const nextStepText =
        compState === steps.length - 2
            ? nextTextOnFinalActionStep || nextButtonText
            : nextButtonText;

    const componentPointer = steps[compState].component;
    const cloneExtensions: {
        ref?: React.Ref<StepZillaStepInstance>;
    } = {};

    const pointerType = componentPointer.type as { prototype?: unknown };
    if (pointerType?.prototype instanceof React.Component) {
        cloneExtensions.ref = activeComponentRef as React.Ref<StepZillaStepInstance>;
    }

    const compToRender = React.cloneElement(
        componentPointer,
        cloneExtensions as object
    );

    return (
        <div
            className="multi-step"
            onKeyDown={(evt: KeyboardEvent<HTMLDivElement>) => {
                handleKeyDown(evt);
            }}
        >
            {showSteps ? (
                <ol className="progtrckr">{renderSteps()}</ol>
            ) : (
                <span></span>
            )}

            {compToRender}
            <div
                style={showNavigation ? {} : hiddenStyle}
                className="footer-buttons"
            >
                <button
                    type="button"
                    style={showPreviousBtn ? {} : hiddenStyle}
                    className={backButtonCls}
                    onClick={() => {
                        previous();
                    }}
                    id="prev-button"
                >
                    {backButtonText}
                </button>
                <button
                    type="button"
                    style={showNextBtn ? {} : hiddenStyle}
                    className={nextButtonCls}
                    onClick={() => {
                        next();
                    }}
                    id="next-button"
                >
                    {nextStepText}
                </button>
            </div>
        </div>
    );
}
