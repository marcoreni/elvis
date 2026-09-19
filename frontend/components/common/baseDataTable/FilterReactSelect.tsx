import React from "react";
import Select, { Props as ReactSelectProps } from "react-select";
import fscreen from "fscreen";

/**
 * A react-select `<Select>` for use inside a TanStackGrid column's `Filter` render prop, wired to
 * portal its dropdown menu -- the filter row lives inside TanStackGrid's own `overflow-x: auto`
 * scroll wrapper (needed for wide tables), and per the CSS spec that also clips the *y* axis, so a
 * react-select menu rendered in place gets cut off whenever the table area is shorter than the
 * open menu. Portalling escapes that clipping entirely; every real consumer already renders one
 * react-select filter per column, so this is a drop-in replacement for a raw `<Select>` in any
 * new/edited Filter, not a broader change to react-select's defaults.
 *
 * Portals to the fullscreen element when one is active, not unconditionally `document.body`: the
 * Fullscreen API only paints the fullscreened element's own subtree, so a menu portalled to
 * `document.body` (an ancestor of TanStackGrid's fullscreen root, not a descendant) would render
 * outside that subtree and never actually be visible while a table is fullscreened. Recomputed on
 * every render (not memoized), so it stays correct across entering/exiting fullscreen.
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
                typeof document !== "undefined"
                    ? (fscreen.fullscreenElement ?? document.body)
                    : undefined
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
