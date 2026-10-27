import React, {Fragment, useEffect, useState} from "react";
import ToggleButton from "./ToggleButton";

// Takes a single props object (maxSelected?: number, childrenContent: JSX.Element[],
// selected: number[], onChange?: Function, buttonStyles?: object, buttonClasses?: string) --
// previously documented as one `@param` tag per destructured field, which TS's allowJs JSDoc
// inference matched positionally against this function's one real (destructured) parameter,
// inferring it as plain `number` (the first tag's type) instead of an object. Harmless as long
// as no .tsx file imported this component to notice; fixed as part of jsx-to-tsx batch 3 when
// PayerPaymentTerms.tsx became the first one to (see docs/KnownIssues.md).
export default function ToggleButtonGroup({maxSelected = 1, childrenContent, selected, onChange, buttonStyles, buttonClasses}) {

    const [buttonsState, setButtonsState] = useState([]);

    useEffect(() => {
            setButtonsState(childrenContent.map((child, i) => (
                {active: selected.indexOf(i) !== -1}
            )))
        },
        [childrenContent]
    );

    useEffect(() =>
    {
        if(selected.length > maxSelected)
        {
            selected.length = maxSelected;
            setButtonsState(buttonsState.map((b, i) => ({active: selected.indexOf(i) !== -1})));
            onChange && onChange(selected);
        }

    }, [maxSelected]);

    function handleChange(key, value)
    {
        const newButtonsState = [...buttonsState];

        if (value && (newButtonsState.filter(b => b.active).length >= maxSelected || selected.length >= maxSelected))
        {
            const lastActive = newButtonsState.filter(b => b.active).pop();

            if(lastActive)
                lastActive.active = false;
        }

        newButtonsState[key].active = value;
        setButtonsState(newButtonsState);

        const newSelected = buttonsState
            .filter(b => b.active)
            .map(b => buttonsState.indexOf(b));
        selected.length = 0;
        newSelected.forEach(i => selected.push(i));

        if(onChange && typeof onChange === 'function')
        {
            const onChangeRes = onChange(newSelected);

            return onChangeRes === undefined ? true : onChangeRes;
        }

        return true;
    }

    return <Fragment>
        {childrenContent && childrenContent.map((child, i) =>
            <ToggleButton
                key={i}
                index={i}
                onClick={handleChange}
                status={buttonsState[i]}
                divStyle={buttonStyles}
                divClasses={buttonClasses}
            >
                {child}
            </ToggleButton>
        )}
    </Fragment>
}
