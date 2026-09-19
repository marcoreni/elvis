import React from "react";

/**
 * A native `<select>` for use inside a TanStackGrid column's `Filter` render prop, styled
 * consistently with the grid's own default text-filter `<input>` -- v6's react-table CSS used to
 * make a bare, unclassed `<select>` blend in well enough there; TanStack Table v8 is headless, so
 * a bare `<select>` here renders with no styling at all. Use this (or FilterReactSelect, for a
 * react-select-based filter) instead of a raw `<select>` in any new/edited Filter.
 */
export default function FilterSelect({
    className,
    ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            className={["form-control", "form-control-sm", className]
                .filter(Boolean)
                .join(" ")}
            {...rest}
        />
    );
}
