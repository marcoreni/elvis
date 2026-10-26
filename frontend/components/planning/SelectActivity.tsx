import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Select, { MultiValue } from "react-select";
import { reactOptionMapper } from "../utils";
import type { ActivityRef, Room, Teacher, Location } from "../utils/entities";

//------------------
// Utility functions

type SelectActivityMode = "room" | "teacher";

interface ActivityOption {
    id: number;
    value: number;
    label: string;
}

// `rooms` carry `room_activities`, `teachers` carry `teachers_activity_refs` -- both are arrays
// of `{ activity_ref_id: number }` (plus, for teachers, a `planning.id` used as the id to report
// back instead of the teacher's own id). Neither field lives on entities.ts's `Room`/`Teacher`
// yet (UNVERIFIED against a serializer -- logged, not added speculatively, see
// docs/KnownIssues.md), so this is typed locally rather than widening those shared entities on a
// guess.
interface RoomWithActivities extends Room {
    room_activities?: { activity_ref_id: number }[];
}
interface TeacherWithActivities extends Teacher {
    teachers_activity_refs?: {
        activity_ref_id: number;
        planning: { id: number };
    }[];
    planning?: { id: number };
}

type ModeElement = RoomWithActivities | TeacherWithActivities;

// Both utility functions below only ever branch on `mode` to pick which field an element's
// activity-ref list lives under -- pulled out to one place instead of a per-function
// string-keyed lookup (which doesn't type-check cleanly against a union of 2 unrelated shapes).
function getEltActivityRefs(
    elt: ModeElement,
    mode: SelectActivityMode | undefined
): { activity_ref_id: number }[] | undefined {
    switch (mode) {
        case "room":
            return (elt as RoomWithActivities).room_activities;
        case "teacher":
            return (elt as TeacherWithActivities).teachers_activity_refs;
        default:
            return undefined;
    }
}

/**
 * Find all teachers having the given activities
 */
export const findElementsByActivities = (
    elements: ModeElement[],
    mode: SelectActivityMode | undefined,
    activities: ActivityOption[]
): number[] => {
    const planningIds: number[] = [];
    const activityRefIds = activities.map((act) => act.id);
    const idFn =
        mode === "teacher"
            ? (x: ModeElement) => (x as TeacherWithActivities).planning!.id
            : (x: ModeElement) => x.id;

    for (const elt of elements) {
        const eltActivities = getEltActivityRefs(elt, mode);

        if (Array.isArray(eltActivities)) {
            const elementActivityRefIds = eltActivities.map(
                (act) => act.activity_ref_id
            );

            for (const id of activityRefIds) {
                if (elementActivityRefIds.includes(id)) {
                    planningIds.push(idFn(elt));
                    break;
                }
            }
        }
    }

    return planningIds;
};

/**
 * Format options for activities selections
 */
export const formatOptions = (
    elements: ModeElement[],
    activities: ActivityRef[],
    mode: SelectActivityMode | undefined
): ActivityOption[] => {
    return Array.isArray(elements) && Array.isArray(activities)
        ? elements.reduce<ActivityOption[]>((acc, elt) => {
              const eltActivities = getEltActivityRefs(elt, mode);

              // Check if element has activity refs.
              //
              // BEHAVIOR FIX, not a mechanical rewrite -- same bug pattern as batch 2's
              // SelectLocation (see docs/KnownIssues.md). The original was `return
              // acc.splice();` (zero-arg `splice()`), which deletes nothing and returns `[]` per
              // spec -- so it reset the whole accumulator to empty every time an element with no
              // activity refs was hit mid-iteration, silently discarding every option already
              // built up before it. `return acc` (this element contributes nothing, keep the
              // accumulator as-is) is what "skip this element" actually requires.
              if (!Array.isArray(eltActivities)) {
                  return acc;
              }

              const options: ActivityOption[] = [];
              // Foreach activity refs, check if we already pushed the option
              eltActivities.forEach((ref) => {
                  const activityRef = activities.find(
                      (act) => ref.activity_ref_id === act.id
                  );

                  if (activityRef) {
                      if (!acc.map((opt) => opt.id).includes(activityRef.id)) {
                          options.push({
                              id: activityRef.id,
                              value: activityRef.id,
                              label: activityRef.label ?? "",
                          });
                      }
                  }
              });

              // Return the list of options
              return acc.concat(options);
          }, [])
        : [];
};

const SELECT_STYLES = {
    container: (p: Record<string, unknown>) => ({
        ...p,
        flex: "auto",
    }),
};

//----------------
// REACT COMPONENT

interface SelectActivityProps {
    mode?: SelectActivityMode;
    defaultPlanning?: number;
    lastReinitialize?: number;
    teachers?: TeacherWithActivities[];
    rooms?: RoomWithActivities[];
    activities?: ActivityRef[];
    locations?: Location[];
    // Called unconditionally with no guard from both handlers below -- every real caller
    // (Planning.jsx) must supply this for the component to be usable at all.
    onChange: (planningIds: (number | undefined)[]) => void;
}

// Dropped from the old propTypes' usage/declaration mismatch, fixed the other way around:
// `rooms`, `mode`, and `locations` were all read unconditionally but never declared.

function SelectActivity({
    mode,
    defaultPlanning,
    lastReinitialize,
    teachers,
    rooms,
    activities = [],
    locations = [],
    onChange,
}: SelectActivityProps) {
    const { t } = useTranslation("planning");

    // Both computed once, from the initial props only -- the class constructor never recomputed
    // either in a componentDidUpdate (only `values` was reset there, see below). A `useState`
    // lazy initializer (not `useMemo`) keeps that "first render only" behavior even if
    // mode/rooms/teachers/activities change later.
    const [elements, setElements] = useState<ModeElement[]>(() => {
        switch (mode) {
            case "room":
                return rooms || [];
            case "teacher":
                return teachers || [];
            default:
                return [];
        }
    });
    const [options] = useState<ActivityOption[]>(() =>
        formatOptions(elements, activities, mode)
    );
    const [values, setValues] = useState<ActivityOption[]>([]);

    // componentDidUpdate(prevProps) only reset `values` when `lastReinitialize` actually
    // changed -- it never fired on mount. A plain `useEffect([lastReinitialize])` would fire once
    // right after the initial render too, so the previous value is tracked in a ref and compared
    // explicitly to skip that first run (same pattern as planning/SelectLocation.tsx).
    const prevLastReinitializeRef = useRef(lastReinitialize);
    useEffect(() => {
        if (prevLastReinitializeRef.current !== lastReinitialize) {
            setValues([]);
            prevLastReinitializeRef.current = lastReinitialize;
        }
    }, [lastReinitialize]);

    // Only for room planning. `reactOptionMapper`'s default value accessor stringifies the id
    // (DEFAULT_VALUE_ACCESSOR in evaluation/question/select_targets.ts), so `locationValue.value`
    // is a string here -- `parseInt` before comparing against `location_id` (a real number)
    // matches the original, not a mechanical drop.
    function handleChangeLocation(locationValue: { value?: string } | null) {
        let nextElements = rooms || [];

        if (locationValue?.value) {
            const locationId = parseInt(locationValue.value);
            nextElements = (rooms || []).filter(
                (e) => e.location_id === locationId
            );
        }

        if (values.length > 0) {
            onChange(
                Array.from(
                    new Set([
                        defaultPlanning,
                        ...findElementsByActivities(nextElements, mode, values),
                    ])
                )
            );
        }

        setElements(nextElements);
    }

    function handleSelect(selectedActivities: MultiValue<ActivityOption>) {
        setValues(selectedActivities as ActivityOption[]);

        if (selectedActivities.length === 0) {
            onChange([defaultPlanning]);
        } else {
            onChange(
                Array.from(
                    new Set([
                        defaultPlanning,
                        ...findElementsByActivities(
                            elements,
                            mode,
                            selectedActivities as ActivityOption[]
                        ),
                    ])
                )
            );
        }
    }

    return (
        <div>
            <h3>{t("selectActivity.title")}</h3>
            <div
                className="flex flex-center-aligned"
                style={{ minWidth: "400px" }}
            >
                {mode === "room" && (
                    <Select
                        placeholder={t(
                            "selectActivity.allLocationsPlaceholder"
                        )}
                        isClearable
                        onChange={(v) => handleChangeLocation(v)}
                        options={locations.map(reactOptionMapper())}
                        className="m-r-sm"
                        styles={SELECT_STYLES}
                    />
                )}
                <Select
                    placeholder={t(
                        "selectActivity.selectActivitiesPlaceholder"
                    )}
                    isMulti
                    isClearable
                    hideSelectedOptions
                    options={options}
                    value={values}
                    styles={SELECT_STYLES}
                    onChange={handleSelect}
                />
            </div>
        </div>
    );
}

export default SelectActivity;
