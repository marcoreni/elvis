import React from "react";
import { MESSAGES } from "../../tools/constants";
import ErrorList from "./ErrorList";

// MESSAGES' keys are the sentinel strings validators return (see tools/constants.ts) -- typing
// `error` against them (rather than a plain `string`) is what the old `oneOfType([string, array])`
// propTypes meant to express, and it means the `MESSAGES[err]` lookup below needs no cast.
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
