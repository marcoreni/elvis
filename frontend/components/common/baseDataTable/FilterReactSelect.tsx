import React from "react";
import Select, { Props as ReactSelectProps } from "react-select";

/**
 * A react-select `<Select>` for use inside a TanStackGrid column's `Filter` render prop, wired to
 * portal its dropdown menu to `document.body` -- the filter row lives inside TanStackGrid's own
 * `overflow-x: auto` scroll wrapper (needed for wide tables), and per the CSS spec that also
 * clips the *y* axis, so a react-select menu rendered in place gets cut off whenever the table
 * area is shorter than the open menu. Portalling escapes that clipping entirely; every real
 * consumer already renders one react-select filter per column, so this is a drop-in replacement
 * for a raw `<Select>` in any new/edited Filter, not a broader change to react-select's defaults.
 *
 * Marked for a future look, not done here: react-select and FilterSelect's native `<select>` end
 * up visually distinct from each other (different border/radius/focus styling) when a table mixes
 * both in the same filter row. react-select genuinely earns its place for multi-select
 * (DuePaymentList's payment-method filter) and custom option rendering (the colored-dot validity
 * filter) that a native `<select>` can't replicate -- but the many *simple* single-choice
 * dropdowns using react-select today could plausibly move to FilterSelect instead for a more
 * consistent look, or the reverse (standardize all filters on react-select). Worth deciding
 * deliberately later rather than as a side effect of this sweep.
 */
export default function FilterReactSelect(
    props: ReactSelectProps<any, boolean, any>
) {
    const { styles, ...rest } = props;
    return (
        <Select
            menuPortalTarget={
                typeof document !== "undefined" ? document.body : undefined
            }
            {...rest}
            styles={{
                ...styles,
                menuPortal: (base, state) => {
                    const merged = styles?.menuPortal
                        ? styles.menuPortal(base, state)
                        : base;
                    return { ...merged, zIndex: 9999 };
                },
            }}
        />
    );
}
