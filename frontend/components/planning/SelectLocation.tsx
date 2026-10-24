import React, { useRef, useState, useEffect } from "react";
import Select, { MultiValue } from "react-select";
import type { Room, Location } from "../utils/entities";

//------------------
// Utility functions

interface LocationOption {
    id: number;
    value: number;
    label: string;
}

type LocationKey = "location_id";

// Only "room" is actually implemented -- kept as a switch (not a plain `if`) the way the
// original did, to leave an obvious slot for a future mode.
function resolveModeTarget(
    mode: string | undefined,
    rooms: Room[] | undefined
): { elements: Room[]; locationKey: LocationKey | null } {
    switch (mode) {
        case "room":
            // `Array.isArray` (not `??`) -- a non-array truthy `rooms` (unexpected, but not
            // provably unreachable given `react_component` callers aren't statically checked)
            // must still fall back to `[]`, same as the original's `Array.isArray(elements)`
            // guard before this was factored out.
            return {
                elements: Array.isArray(rooms) ? rooms : [],
                locationKey: "location_id",
            };
        default:
            return { elements: [], locationKey: null };
    }
}

/**
 * Find the ids of every room located in one of the given `locations`.
 */
export const findElementsByLocation = (
    { rooms }: { rooms?: Room[] },
    mode: string | undefined,
    locations: readonly LocationOption[]
): number[] => {
    const planningIds: number[] = [];
    const locationsIds = locations.map((l) => l.id);
    const { elements, locationKey } = resolveModeTarget(mode, rooms);
    const idFn = (x: Room) => x.id;

    for (const elt of elements) {
        if (locationKey && Boolean(elt[locationKey])) {
            const elementLocationId = elt[locationKey];

            for (const id of locationsIds) {
                if (elementLocationId === id) {
                    planningIds.push(idFn(elt));
                    break;
                }
            }
        }
    }

    return planningIds;
};

/**
 * Format options for locations selections
 */
export const formatOptions = (
    { rooms }: { rooms?: Room[] },
    locations: Location[] | undefined,
    mode: string | undefined
): LocationOption[] => {
    const { elements, locationKey } = resolveModeTarget(mode, rooms);

    return Array.isArray(elements) && Array.isArray(locations)
        ? elements.reduce<LocationOption[]>((acc, elt) => {
              // Check if element has a location at all
              if (!locationKey || !Boolean(elt[locationKey])) {
                  // BEHAVIOR FIX, not a mechanical rewrite -- see docs/KnownIssues.md. The
                  // original was `return acc.splice();` (zero arguments): per spec, a 0-arg
                  // `splice()` call deletes nothing and returns `[]`, so that line actually
                  // reset the whole accumulator to empty every time a location-less room was
                  // hit mid-iteration, silently discarding every option built up before it.
                  // `acc.splice(0)` (one argument: `start`) deletes *every* item in `acc` and
                  // returns them -- i.e. returns a copy of what `acc` held, which is what
                  // "skip this element, keep the accumulator as-is" actually requires.
                  return acc.splice(0);
              }

              const options: LocationOption[] = [];

              const location = locations.find(
                  (act) => elt[locationKey] === act.id
              );

              if (location) {
                  if (!acc.map((opt) => opt.id).includes(location.id)) {
                      options.push({
                          id: location.id,
                          value: location.id,
                          label: location.label ?? "",
                      });
                  }
              }

              // Return the list of options
              return acc.concat(options);
          }, [])
        : [];
};

//----------------
// REACT COMPONENT

interface SelectLocationProps {
    defaultPlanning?: number;
    lastReinitialize?: number;
    rooms?: Room[];
    // Only "room" is actually implemented (see the switches above); kept as a plain string to
    // leave room for other modes the way the original switch statements did.
    mode?: string;
    locations?: Location[];
    // Called unconditionally from handleSelect with no guard -- every real caller must supply
    // this for the component to be usable at all.
    onChange: (planningIds: (number | undefined)[]) => void;
}

// Dropped from the old propTypes: `activities` (declared but never read anywhere in this file --
// confirmed by grep). Added `mode`/`locations`, which the component always reads from props but
// propTypes never declared.

function SelectLocation({
    rooms,
    mode,
    locations,
    defaultPlanning,
    lastReinitialize,
    onChange,
}: SelectLocationProps) {
    // `options` was only ever computed once, in the constructor, from the initial props --
    // componentDidUpdate only ever reset `values`, never recomputed `options`. `useState`'s
    // lazy initializer (a function, not a call result) preserves that "computed once, ignores
    // later prop changes" semantics AND guarantees `formatOptions` itself only ever runs once --
    // React only invokes the initializer on the very first render. `useRef(formatOptions(...))`
    // would still only *keep* the first call's result past mount, but would re-run
    // `formatOptions` as a wasted computation on every render feeding that ref assignment; a
    // `useMemo` keyed on rooms/locations/mode would (incorrectly) recompute the kept value too.
    const [options] = useState<LocationOption[]>(() =>
        formatOptions({ rooms }, locations, mode)
    );
    const [values, setValues] = useState<LocationOption[]>([]);

    // componentDidUpdate(prevProps) only reset `values` when `lastReinitialize` actually changed
    // -- it never fired on mount. A plain `useEffect([lastReinitialize])` would fire once right
    // after the initial render too (unlike componentDidUpdate), so the previous value is tracked
    // in a ref and compared explicitly to skip that first run.
    const prevLastReinitializeRef = useRef(lastReinitialize);
    useEffect(() => {
        if (prevLastReinitializeRef.current !== lastReinitialize) {
            setValues([]);
            prevLastReinitializeRef.current = lastReinitialize;
        }
    }, [lastReinitialize]);

    const handleSelect = (selectedLocations: MultiValue<LocationOption>) => {
        setValues(selectedLocations as LocationOption[]);

        if (selectedLocations.length === 0) {
            onChange([defaultPlanning]);
        } else {
            onChange(
                Array.from(
                    new Set([
                        defaultPlanning,
                        ...findElementsByLocation(
                            { rooms },
                            mode,
                            selectedLocations
                        ),
                    ])
                )
            );
        }
    };

    return (
        <Select
            isMulti
            isClearable
            hideSelectedOptions
            options={options}
            value={values}
            onChange={handleSelect}
        />
    );
}

export default SelectLocation;
