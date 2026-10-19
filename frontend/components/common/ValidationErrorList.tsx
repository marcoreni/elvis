import React from "react";
import { MESSAGES } from "../../tools/constants";
import ErrorList from "./ErrorList";

// MESSAGES' keys are the sentinel strings validators return (see tools/constants.ts) -- typing
// `error` against them (rather than a plain `string`) is what the old `oneOfType([string, array])`
// propTypes meant to express, and it means the `MESSAGES[err]` lookup below needs no cast. That
// said, this only buys type-safety for the lookup itself: 6 of MESSAGES' entries
// (`err_min_length`/`err_exact_length`/the 4 `err_ord_*`) are functions, not strings, and this
// type doesn't stop one of those keys being passed -- `MESSAGES[err]` would then be a function,
// which React would reject as a child at render time. Pre-existing, currently moot (this
// component has zero real call sites to pass one), not fixed here.
type MessageKey = keyof typeof MESSAGES;

interface ValidationErrorListProps {
    error?: MessageKey | MessageKey[];
}

function ValidationErrorList({ error }: ValidationErrorListProps) {
    if (!error) {
        return null;
    }

    if (Array.isArray(error)) {
        return <ErrorList errors={error.map((err) => MESSAGES[err])} />;
    }

    return <ErrorList errors={[MESSAGES[error]]} />;
}

// Was a PureComponent -- React.memo's default shallow-props comparison is the functional
// equivalent (there's no state here, so no need for shouldComponentUpdate's state half).
export default React.memo(ValidationErrorList);
