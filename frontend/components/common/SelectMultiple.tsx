import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import CreatableSelect from "react-select/creatable";
import type { ActionMeta, MultiValue, OnChangeValue } from "react-select";
import swal from "sweetalert2";

// Valeur spéciale de l'option "tout sélectionner" (activée via la prop allowSelectAll).
const SELECT_ALL_VALUE = "__select_all__";

interface FeatureOption {
    label: string;
    value: number;
}

// react-final-form's field-array mutators -- every real caller passes `mutators` straight from
// a `<FormSpy>`/`Form` render prop, so this only needs the 3 methods actually called below.
interface Mutators {
    update: (name: string, index: number, value: number) => void;
    remove: (name: string, index: number) => void;
    pop: (name: string) => unknown;
}

interface SelectAllOption {
    label: string;
    value: typeof SELECT_ALL_VALUE;
}

type SelectableOption = FeatureOption | SelectAllOption;

interface SelectMultipleProps {
    title: string;
    name?: string;
    all_features: [string, number][];
    features?: number[];
    mutators?: Mutators;
    isMulti?: boolean;
    isClearable?: boolean;
    confirmBeforeClear?: boolean;
    allowSelectAll?: boolean;
    selectAllLabel?: string;
}

/**
 * Il y as quelques restrictions pour utiliser ce SelectMultiple.
 *
 * Il doit y avoir certaines propriété:
 * <ul>
 *  <li> Un Titre (title) qui seras le contenue du label affiché => Obligatoire </li>
 *  <li>Un nom (name) qui seras le nom de l'input à utilisé pour le formulaire parent => Optionnel</li>
 *  <li>
 *      Tous les champs possible (all_features) qui contient un tableau de tableau représentant tous les élement possible. =>Obligatoire
 *      <ul>
 *          <li> Chaque tableau doivent contenir deux élément, le premier étant le label/valeur affiché et le second la valeur/id </li>
 *          <ul>
 *              <li> => Ce qui donne [["un label", 0], ["un label2", 45]]</li>
 *          </ul>
 *      </ul>
 *  </li>
 *  <li>
 *      Tous les champs séléctionné (features) qui est un tableau du type de la valeur (id ?) => Optionnel
 *      <ul>
 *          <li>=> Ce qui donne [0, 45] pour l'exemple précédent si les deux éléments sont séléctionnés</li>
 *      </ul>
 *  </li>
 * </ul>
 */
function SelectMultiple({
    title,
    name,
    all_features,
    features,
    mutators,
    isMulti,
    isClearable,
    confirmBeforeClear,
    allowSelectAll,
    selectAllLabel,
}: SelectMultipleProps) {
    const { t } = useTranslation("common");

    // Both computed once, from the initial props only -- the class version only ever derived
    // these in its constructor, never recomputed them in a componentDidUpdate. A `useState` lazy
    // initializer (not `useMemo`) matches that: React only calls it on the very first render, so
    // it keeps ignoring later prop changes the same way the constructor-only computation did.
    const [selectedFeatures, setSelectedFeatures] = useState<FeatureOption[]>(
        () => {
            const allOptions = all_features.map(([label, value]) => ({
                label,
                value,
            }));
            return features !== undefined && features.length > 0
                ? allOptions.filter((f) => features.includes(f.value))
                : [];
        }
    );
    const [availableFeatures, setAvailableFeatures] = useState<FeatureOption[]>(
        () => {
            const allOptions = all_features.map(([label, value]) => ({
                label,
                value,
            }));

            if (features === undefined || features.length === 0) {
                return allOptions;
            }

            // BEHAVIOR FIX, not a mechanical rewrite -- see docs/KnownIssues.md. The original did
            // `_.remove(this.state.features, this.state.selectedFeatures)`: lodash's iteratee
            // shorthand treats an *array* predicate as `_.matchesProperty(value[0], value[1])`, not
            // as "remove every element present in this array" -- so passing the whole
            // `selectedFeatures` array removed nothing at all (verified empirically). The intent,
            // matching the single-item `_.remove(this.state.features, newFeature)` call a few lines
            // down in `handleChange`, is to drop every already-selected option from the list of
            // choices still offered.
            const selected = allOptions.filter((f) =>
                features.includes(f.value)
            );
            return allOptions.filter((f) => !selected.includes(f));
        }
    );

    // The constructor also pushed the initial `selectedFeatures` into the parent form via
    // `mutators.update` as a side effect, before the first render. Calling into an external
    // mutator during render would be impure, so this becomes a mount-only effect -- it must not
    // re-fire on later prop changes, matching the constructor's one-time behavior.
    useEffect(() => {
        if (features !== undefined && features.length > 0 && mutators && name) {
            selectedFeatures.forEach((f, i) =>
                mutators.update(name, i, f.value)
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function selectAll() {
        const nextSelected = [...selectedFeatures, ...availableFeatures];

        if (mutators && name) {
            nextSelected.forEach((f, i) => mutators.update(name, i, f.value));
        }

        setSelectedFeatures(nextSelected);
        setAvailableFeatures([]);
    }

    function handleChange(
        values: OnChangeValue<SelectableOption, boolean>,
        actionMeta: ActionMeta<SelectableOption>
    ) {
        if (actionMeta.action === "select-option") {
            const newFeature = (
                isMulti
                    ? (values as MultiValue<SelectableOption>).at(-1)
                    : values
            ) as SelectableOption | null;

            // Option "tout sélectionner" : bascule toutes les options disponibles.
            if (newFeature && newFeature.value === SELECT_ALL_VALUE) {
                selectAll();
                return;
            }

            if (!newFeature) return;
            const selectedFeature = newFeature as FeatureOption;

            if (isMulti) {
                setAvailableFeatures((prev) =>
                    prev.filter(
                        (f) =>
                            !(
                                f.label === selectedFeature.label &&
                                f.value === selectedFeature.value
                            )
                    )
                );
            }

            const nextSelected = [
                ...(isMulti ? selectedFeatures : []),
                selectedFeature,
            ];

            if (mutators && name) {
                nextSelected.forEach((f, i) =>
                    mutators.update(name, i, f.value)
                );
            }

            setSelectedFeatures(nextSelected);
        } else if (actionMeta.action === "remove-value") {
            const removedValue = actionMeta.removedValue as FeatureOption;

            setSelectedFeatures((prev) =>
                prev.filter(
                    (f) =>
                        !(
                            f.label === removedValue.label &&
                            f.value === removedValue.value
                        )
                )
            );

            setAvailableFeatures((prev) =>
                prev.includes(removedValue) ? prev : [...prev, removedValue]
            );

            if (mutators && name) {
                mutators.remove(name, selectedFeatures.indexOf(removedValue));
            }
        } else if (actionMeta.action === "clear") {
            const clear = () => {
                setAvailableFeatures((prev) => [
                    ...prev,
                    ...selectedFeatures.filter((f) => !prev.includes(f)),
                ]);

                if (mutators && name) {
                    while (mutators.pop(name) !== undefined);
                }

                setSelectedFeatures([]);
            };
            const confirm =
                confirmBeforeClear === undefined ? true : confirmBeforeClear;

            if (confirm) {
                swal.fire({
                    title: t("common:selectMultiple.confirmClearAll", {
                        title,
                    }),
                    icon: "warning",
                    confirmButtonText: t("common:yesNo.yes"),
                    cancelButtonText: t("common:yesNo.no"),
                    showCancelButton: true,
                }).then((willDelete) => {
                    if (willDelete.isConfirmed) clear();
                });
            } else {
                clear();
            }
        }
    }

    const canSelectAll =
        allowSelectAll && isMulti && availableFeatures.length > 0;

    const options: SelectableOption[] = canSelectAll
        ? [
              {
                  label:
                      selectAllLabel ||
                      t("common:selectMultiple.addAllLabel", {
                          title: title.toLowerCase(),
                      }),
                  value: SELECT_ALL_VALUE,
              },
              ...availableFeatures,
          ]
        : availableFeatures;

    return (
        <div>
            <input
                type="hidden"
                name={name}
                value={
                    isMulti
                        ? selectedFeatures.map((f) => String(f.value))
                        : selectedFeatures[0]?.value || ""
                }
                style={{ display: "none" }}
                className={"d-none none"}
            />

            <label>{title}</label>

            <CreatableSelect<SelectableOption, boolean>
                isMulti={isMulti}
                isClearable={isClearable || isMulti}
                options={options}
                value={selectedFeatures}
                onChange={handleChange}
            />
        </div>
    );
}

export default SelectMultiple;
