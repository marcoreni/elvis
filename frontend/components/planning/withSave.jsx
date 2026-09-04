import React from "react";

// Extracted from the now-deleted planning/activity_management/index.jsx, which was an abandoned
// extract-into-files refactor -- withSave was its only live export, used by ActivityDetailsModal.jsx.
// See README.md's "Removed dead code" section.
// `label` defaults to null rather than a hardcoded French string: all 3 live call sites pass an
// explicit translated label, so the default is unreachable today -- null makes a future caller
// that forgets to pass one render an empty button rather than a silent French string.
export const withSave = (component, {
    onSave = () => {},
    label = null
} = {}) => <div>
    {component}
    <button className="btn btn-primary pull-right" onClick={onSave}>
        {label}
    </button>
</div>;
