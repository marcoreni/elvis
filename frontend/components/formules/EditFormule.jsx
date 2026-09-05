import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as api from "../../tools/api";
import swal from "sweetalert2";
import BaseDataTable from "../common/baseDataTable/BaseDataTable";
import ActivityRefPricingModal from "../activityRef/ActivityRefPricingModal";
import DefaultActionButtons from "../common/baseDataTable/DefaultActionButtons";
import FormulePricingDataService from "./FormulePricingDataService";
import NewFormulePricingDataService from "./NewFormulePricingDataService";
import DefaultCreateButton from "../common/baseDataTable/DefaultCreateButton";
import ReactSelect, { components } from "react-select";
import Modal from "react-modal";
import _ from "lodash";

/**
 *
 * @param {{
 * id: number,
 * name: string,
 * description: string,
 * active: boolean,
 * number_of_items: number,
 * formule_items: {
 *   id: number,
 *   item: {
 *      id: number,
 *      name: string
 *   },
 *   is_for_kind: boolean
 * }[]
 * formule_pricings: {
 *     id: number,
 *     price: number,
 *     pricing_category: {
 *      id: number,
 *      name: string
 *     },
 *     from_season: {
 *         id: number,
 *         name: string
 *     },
 *     to_season: {
 *         id: number,
 *         name: string
 *     }
 * }[]
 * }} formule
 * @returns {Element}
 * @constructor
 */
export default function EditFormule({ formule }) {
    const { t } = useTranslation("formules");

    const [name, setName] = useState(formule.name);
    const [description, setDescription] = useState(formule.description);
    const [active, setActive] = useState(formule.active);
    const [number_of_items, setNumberOfItems] = useState(
        formule.number_of_items
    );

    const fActivities = (formule.formule_items || [])
        .filter((i) => !i.is_for_kind)
        .map((i) => i.item);
    const fKinds = (formule.formule_items || [])
        .filter((i) => i.is_for_kind)
        .map((i) => i.item);

    const [selectedActivities, setSelectedActivities] = useState(fActivities);
    const [selectedKinds, setSelectedKinds] = useState(fKinds);
    const [selectedPricings, setSelectedPricings] = useState(
        formule.formule_pricings || []
    );

    const [allActivities, setAllActivities] = useState([]);
    const [allKinds, setKinds] = useState([]);
    const [allSeasons, setAllSeasons] = useState([]);
    const [allPricingCategories, setAllPricingCategories] = useState([]);

    const [validationError, setValidationError] = useState({
        selectedActivities: "",
        nbActivitiesToSelect: "",
        priceCategory: "",
        price: "",
        fromSeason: "",
    });

    const [activityModalIsOpen, setActivityModalIsOpen] = useState(false);
    const [reactSelectActivitiesSelected, setReactSelectActivitiesSelected] =
        useState([]);

    async function fetchActivityRefKind() {
        try {
            await api
                .set()
                .success((res) => {
                    setKinds(res);
                })
                .error((res) => {
                    swal(t("form.fetchError"), res.error, "error");
                })
                .get("/activity_ref_kind", {});
        } catch (e) {
            await swal(t("form.fetchError"), e.message, "error");
        }
    }

    async function fetchActivities() {
        try {
            await api
                .set()
                .success((res) => {
                    setAllActivities(res);
                })
                .error((res) => {
                    swal(t("form.fetchError"), res.error, "error");
                })
                .get("/activity_ref", {});
        } catch (e) {
            await swal(t("form.fetchError"), e.message, "error");
        }
    }

    async function fetchSeasonsAndPricings() {
        try {
            await api
                .set()
                .success((res) => {
                    setAllSeasons(res.seasons);
                    setAllPricingCategories(res.pricing_categories);
                })
                .error((res) => {
                    swal(t("form.fetchSeasonsError"), res.error, "error");
                })
                .get(
                    "/activity_ref_pricings/get_seasons_and_pricing_categories",
                    {}
                );
        } catch (e) {
            await swal(t("form.fetchSeasonsError"), e.message, "error");
        }
    }

    useEffect(() => {
        Promise.all([
            fetchActivityRefKind(),
            fetchActivities(),
            fetchSeasonsAndPricings(),
        ]);
    }, []);

    useEffect(() => {
        setReactSelectActivitiesSelected(
            selectedActivities
                .map((a) => ({ label: a.display_name, value: `a${a.id}` }))
                .concat(
                    selectedKinds.map((k) => ({
                        label: k.display_name,
                        value: `k${k.id}`,
                    }))
                )
        );
    }, [selectedActivities, selectedKinds]);

    // --------------------------------- Gestion des activités ---------------------------------
    function displayActivities() {
        const familyOptions = allKinds.map((kind) => ({
            label: kind.name,
            value: `k${kind.id}`,
            isFamily: true,
            activities: allActivities
                .filter((activity) => activity.activity_ref_kind_id === kind.id)
                .map((activity) => ({
                    label: activity.label,
                    value: `a${activity.id}`,
                    familyValue: `k${kind.id}`,
                })),
        }));

        return familyOptions.reduce((acc, family) => {
            acc.push({
                ...family,
                activities: family.activities, // Inclure les activités sous la famille
            });
            family.activities.forEach((activity) => acc.push(activity));
            return acc;
        }, []);
    }

    // --------------------------------- HandleChanges ---------------------------------

    function handleNbActivitiesToSelectChange(e) {
        const value = parseInt(e.target.value);

        if (isNaN(value) || value <= 0) {
            setValidationError((prevState) => ({
                ...prevState,
                nbActivitiesToSelect: t("form.validation.nbActivities"),
            }));
            setNumberOfItems(isNaN(value) ? "" : value);
        } else {
            setNumberOfItems(value);
            setValidationError((prevState) => ({
                ...prevState,
                nbActivitiesToSelect: "",
            }));
        }
    }

    function handleValidateActivitiesChanges() {
        const selectedActivities = reactSelectActivitiesSelected
            .filter((a) => a.value.startsWith("a"))
            .map((a) =>
                allActivities.find(
                    (activity) => activity.id === parseInt(a.value.substring(1))
                )
            );

        const selectedKinds = reactSelectActivitiesSelected
            .filter((a) => a.value.startsWith("k"))
            .map((k) =>
                allKinds.find(
                    (kind) => kind.id === parseInt(k.value.substring(1))
                )
            );

        setSelectedActivities(selectedActivities);
        setSelectedKinds(selectedKinds);
        setActivityModalIsOpen(false);
    }

    async function handleSubmit(e) {
        e.preventDefault();

        const isCreating = !formule.id;
        const errorTitle = isCreating
            ? t("form.submit.errorTitleCreate")
            : t("form.submit.errorTitleEdit");
        const requestErrorTitle = isCreating
            ? t("form.submit.requestErrorCreate")
            : t("form.submit.requestErrorEdit");

        if (selectedPricings.length === 0) {
            setValidationError((prevState) => ({
                ...prevState,
                priceCategory: t("form.validation.atLeastOnePricing"),
            }));

            swal(errorTitle, t("form.validation.atLeastOnePricing"), "error");
            return;
        }

        if (selectedPricings.some((p) => p.price === 0)) {
            setValidationError((prevState) => ({
                ...prevState,
                price: t("form.validation.priceNotZero"),
            }));

            swal(errorTitle, t("form.validation.priceNotZero"), "error");
            return;
        }

        const request = api
            .set()
            .success((res) => {
                swal({
                    title: isCreating
                        ? t("form.submit.successCreate")
                        : t("form.submit.successEdit"),
                    type: "success",
                    timer: 1500,
                });

                if (formule.id) {
                    setName(res.name);
                    setDescription(res.description);
                    setActive(res.active);
                } else {
                    window.location.href = "/formules";
                }
            })
            .error((res) => {
                if (res.errors) swal(requestErrorTitle, res.error, "error");
                else swal(requestErrorTitle, "", "error");
            });

        if (formule.id) {
            await request.patch(`/formules/${formule.id}`, {
                name,
                description,
                active,
                number_of_items,
                formuleItems: [
                    ...selectedActivities.map((a) => ({
                        itemId: a.id,
                        isFamily: false,
                    })),
                    ...selectedKinds.map((k) => ({
                        itemId: k.id,
                        isFamily: true,
                    })),
                ],
                formulePricings: selectedPricings.map((p) => ({
                    priceCategoryId: p.pricing_category.id,
                    price: p.price,
                    fromSeasonId: p.from_season_id,
                    toSeasonId: p.to_season_id ? p.to_season_id : null,
                })),
            });
        } else {
            await request.post(`/formules`, {
                name,
                description,
                active,
                number_of_items,
                formuleItems: [
                    ...selectedActivities.map((a) => ({
                        itemId: a.id,
                        isFamily: false,
                    })),
                    ...selectedKinds.map((k) => ({
                        itemId: k.id,
                        isFamily: true,
                    })),
                ],
                formulePricings: selectedPricings.map((p) => ({
                    priceCategoryId: p.pricing_category.id,
                    price: p.price,
                    fromSeasonId: p.from_season_id,
                    toSeasonId: p.to_season_id ? p.to_season_id : null,
                })),
            });
        }
    }

    function handleSavePricingForNewFormule(pricing) {
        setSelectedPricings(_.uniqBy([...selectedPricings, pricing], "id"));
    }

    function handleUpdatePricingForNewFormule(pricing) {
        setSelectedPricings(
            selectedPricings.map((p) => (p.id === pricing.id ? pricing : p))
        );
    }

    function handleDeletePricingForNewFormule(pricing) {
        setSelectedPricings(
            selectedPricings.filter((p) => p.id !== pricing.id)
        );
    }

    const pricingColumns = [
        {
            id: "pricing_name",
            Header: t("form.pricing.columns.name"),
            accessor: "pricing_category.name",
        },
        {
            id: "amount",
            Header: t("form.pricing.columns.amount"),
            accessor: "price",
        },
        {
            id: "selectedSeasons",
            Header: t("form.pricing.columns.seasons"),
            Cell: (row) => {
                const seasonStart = allSeasons.find(
                    (s) => s.id === row.original.from_season_id
                );
                const seasonEnd =
                    row.original.to_season_id !== undefined
                        ? allSeasons.find(
                              (s) => s.id === row.original.to_season_id
                          )
                        : null;
                return seasonEnd != null
                    ? seasonStart.label + " > " + seasonEnd.label
                    : seasonStart.label + " > ...";
            },
        },
    ];

    const pricingDataService = formule.id
        ? new FormulePricingDataService(formule.id)
        : new NewFormulePricingDataService(
              handleSavePricingForNewFormule,
              handleUpdatePricingForNewFormule,
              handleDeletePricingForNewFormule,
              selectedPricings,
              allPricingCategories
          );

    const Option = (props) => {
        const { data, isSelected } = props;

        return (
            <components.Option {...props}>
                {data.isFamily ? (
                    <div style={{ fontWeight: "bold" }}>
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => null}
                            style={{ marginRight: "10px" }}
                        />
                        {data.label}
                    </div>
                ) : (
                    <div className="ml-3">
                        <input
                            type="checkbox"
                            checked={
                                isSelected ||
                                reactSelectActivitiesSelected.find(
                                    (a) => a.value === data.familyValue
                                ) !== undefined
                            }
                            onChange={() => null}
                            style={{ marginRight: "10px" }}
                        />
                        {data.label}
                    </div>
                )}
            </components.Option>
        );
    };

    return (
        <div className="row p-2">
            <form onSubmit={handleSubmit}>
                <div className="row">
                    <div className="col-md-6 col-xs-12">
                        <div className="form-group mb-5">
                            <label htmlFor="name">{t("form.name.label")}</label>
                            <input
                                type="text"
                                className="form-control"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div className="form-group mb-5">
                            <label htmlFor="description">
                                {t("form.description.label")}
                            </label>
                            <textarea
                                className="form-control"
                                id="description"
                                rows="3"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="row">
                            <div className="col-sm-10">
                                <label htmlFor="activites">
                                    {t("form.activities.label")}
                                </label>
                            </div>
                            <div className="col-sm-2 text-right">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => setActivityModalIsOpen(true)}
                                >
                                    {t("form.activities.addButton")}
                                </button>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-12 mt-2 mb-3">
                                <p style={{ color: "#555" }}>
                                    {t("form.activities.help")}
                                </p>
                            </div>
                        </div>

                        {selectedKinds.length + selectedActivities.length ===
                        0 ? (
                            <div className="form-group mt-3 m-0">
                                <div
                                    className="form-control p-5 d-flex flex-column align-items-center justify-content-center"
                                    style={{
                                        backgroundColor: "#fff",
                                        border: "1px solid #dee2e6",
                                        borderRadius: "1rem",
                                        minHeight: "200px",
                                        width: "115.5%",
                                    }}
                                >
                                    <p
                                        className="h6 mb-2 font-weight-bold"
                                        style={{ color: "#000000" }}
                                    >
                                        {t("form.activities.emptyTitle")}
                                    </p>
                                    <button
                                        type="button"
                                        className="btn btn-link p-0"
                                        onClick={() =>
                                            setActivityModalIsOpen(true)
                                        }
                                    >
                                        {t("form.activities.emptyAction")}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {selectedKinds.map((kind) => (
                                    <div
                                        key={`kind_${kind.id}`}
                                        className="form-group mt-3 m-0"
                                    >
                                        <div className="form-control d-inline-flex align-items-center justify-content-between p-5">
                                            <label style={{ color: "#00334A" }}>
                                                {kind.display_name}
                                            </label>
                                            <button
                                                type="button"
                                                className="btn"
                                                onClick={() =>
                                                    setSelectedKinds(
                                                        selectedKinds.filter(
                                                            (a) =>
                                                                a.id !== kind.id
                                                        )
                                                    )
                                                }
                                            >
                                                <i
                                                    className="fas fa-trash"
                                                    style={{ color: "#00334A" }}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {selectedActivities.map((activity) => (
                                    <div
                                        key={`activity_${activity.id}`}
                                        className="form-group mt-3 m-0"
                                    >
                                        <div className="form-control d-inline-flex align-items-center justify-content-between p-5">
                                            <label style={{ color: "#00334A" }}>
                                                {activity.display_name}
                                            </label>
                                            <button
                                                type="button"
                                                className="btn"
                                                onClick={() =>
                                                    setSelectedActivities(
                                                        selectedActivities.filter(
                                                            (a) =>
                                                                a.id !==
                                                                activity.id
                                                        )
                                                    )
                                                }
                                            >
                                                <i
                                                    className="fas fa-trash"
                                                    style={{ color: "#00334A" }}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>

                <div className="col-md-10 col-xs-12 pl-0 mt-5">
                    <div className="ibox mt-3">
                        <div className="ibox-content p-5">
                            <BaseDataTable
                                dataService={pricingDataService}
                                columns={pricingColumns}
                                actionButtons={DefaultActionButtons}
                                createButton={({ onCreate }) => (
                                    <DefaultCreateButton
                                        label={t("form.pricing.createButton")}
                                        onCreate={onCreate}
                                    />
                                )}
                                formContentComponent={(props) => (
                                    <ActivityRefPricingModal
                                        {...props}
                                        seasons={allSeasons}
                                        pricingCategories={allPricingCategories}
                                    />
                                )}
                                showFullScreenButton={false}
                                oneResourceTypeName={t(
                                    "form.pricing.oneResourceTypeName"
                                )}
                                thisResourceTypeName={t(
                                    "form.pricing.thisResourceTypeName"
                                )}
                                defaultSorted={[
                                    { id: "to_season_id", desc: true },
                                    { id: "pricing_category_id", asc: true },
                                ]}
                            />
                        </div>
                    </div>
                </div>

                <div className="col-md-12 mt-5">
                    <button type="submit" className="btn btn-primary">
                        {t("common:actions.save")}
                    </button>
                </div>
            </form>

            <Modal
                isOpen={activityModalIsOpen}
                contentLabel="addActivityModal"
                className="Modal p-3"
                ariaHideApp={false}
            >
                <button
                    type="button"
                    className="close"
                    onClick={() => setActivityModalIsOpen(false)}
                >
                    &times;
                </button>

                <div className="row m-5">
                    <h2 className="m-0">{t("form.modal.title")}</h2>
                    <div className="mt-5">
                        <div className="form-group mb-5">
                            <label htmlFor="activites">
                                {t("form.modal.selectLabel")}
                            </label>
                            <ReactSelect
                                options={displayActivities()}
                                isMulti={true}
                                isClearable={true}
                                components={{ Option }}
                                isOptionDisabled={(option) =>
                                    !option.isFamily &&
                                    reactSelectActivitiesSelected.find(
                                        (a) => a.value === option.familyValue
                                    ) !== undefined
                                }
                                value={reactSelectActivitiesSelected}
                                onChange={(selectedOptions) => {
                                    setReactSelectActivitiesSelected([]);
                                    setTimeout(() => {
                                        setReactSelectActivitiesSelected(
                                            selectedOptions
                                        );
                                    }, 0);
                                }}
                                closeMenuOnSelect={false}
                                hideSelectedOptions={false}
                                required
                            />
                            {validationError.selectedActivities && (
                                <div className="text-danger">
                                    {validationError.selectedActivities}
                                </div>
                            )}
                        </div>
                        <div className="form-group mb-5">
                            <label htmlFor="activitiesToSelect">
                                {t("form.modal.nbLabel")}
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                id="activitiesToSelect"
                                onChange={handleNbActivitiesToSelectChange}
                                value={number_of_items}
                                required={true}
                            />
                            {validationError.nbActivitiesToSelect && (
                                <div className="text-danger">
                                    {validationError.nbActivitiesToSelect}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="row text-right m-5">
                    <button
                        className="btn btn-primary"
                        onClick={handleValidateActivitiesChanges}
                    >
                        {t("common:actions.validate")}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
