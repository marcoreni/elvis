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
            // `form-control-sm` (Bootstrap 4's compact-size modifier) doesn't exist anywhere in
            // this app's actual CSS (a Bootstrap 3.3.7 vendor file + a separate BS4 grid/flex-only
            // utility sheet) -- `form-control-small` is this app's own, differently-shaped
            // equivalent (min-width + rounded corners, not a padding/font-size reduction).
            className={["form-control", "form-control-small", className]
                .filter(Boolean)
                .join(" ")}
            {...rest}
        />
    );
}
