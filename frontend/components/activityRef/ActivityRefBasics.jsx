import React from "react";
import { withTranslation } from "react-i18next";
import i18n from "../../i18n";
import { csrfToken } from "../utils";
import swal from "sweetalert2";
import { Form, Field, FormSpy } from "react-final-form";
import Input from "../common/Input";
import InputSelect from "../common/InputSelect";
import InputColor from "../common/InputColor";
import DragAndDrop from "../editParameters/DragAndDrop";
import BaseDataTable from "../common/baseDataTable/BaseDataTable";
import ActivityRefPricingModal from "./ActivityRefPricingModal";
import DefaultActionButtons from "../common/baseDataTable/DefaultActionButtons";
import DefaultCreateButton from "../common/baseDataTable/DefaultCreateButton";
import * as api from "../../tools/api";
import ActivityRefDataService from "./ActivityRefDataService";
import NewActivityRefDataService from "./NewActivityRefDataService";

const required = value => (value ? undefined : i18n.t('activities:activityRefBasics.validators.required'))
const mustBeInteger = value => (!Number.isInteger(Number(value)) ? i18n.t('activities:activityRefBasics.validators.mustBeInteger') : undefined)
const mustBeIntegerOrUndefined = value => ((value!==undefined && !Number.isInteger(Number(value))) ? i18n.t('activities:activityRefBasics.validators.mustBeInteger') : undefined)
const minValue = min => value =>
    isNaN(value) || value >= min ? undefined : i18n.t('activities:activityRefBasics.validators.minValue', {min})
const composeValidators = (...validators) => value =>
    validators.reduce((error, validator) => error || validator(value), undefined)


class ActivityRefBasics extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            tabs: [],
            activityRefKinds: this.props.activityRefKinds.map(ark => { return { value: ark[1], label: ark[0] } }),
            seasons: [],
            pricingCategories: [],
            activityRefPricings: [],
            packs: [],
        }

        this.activityTypes = this.props.activityTypes
        this.addKind = this.addKind.bind(this);
        this.fetchSeasonsAndPricings();
        this.handleSaveForNewActivity = this.handleSaveForNewActivity.bind(this);
        this.handleUpdateForNewActivity = this.handleUpdateForNewActivity.bind(this);
        this.handleDeleteForNewActivity = this.handleDeleteForNewActivity.bind(this);
    }

    addKind()
    {
        const {t} = this.props;
        swal({
            title: t('activityRefBasics.addKind.title'),
            input: 'text',
            showCancelButton: true,
            confirmButtonText: t('common:actions.add'),
            showLoaderOnConfirm: true,
            preConfirm: async (text) =>
            {
                const response = await fetch('/activity_ref_kinds', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({ activity_ref_kind: { name: text } })
                });

                const data = await response.json();

                if (data.message !== undefined && data.message !== "ok") {
                    swal.showValidationMessage(
                        data.message
                    )
                }

                return data
            }
        }).then(res =>
        {
            const value = (res.value || {}).value;

            if (value)
            {
                this.setState({ activityRefKinds: [...this.state.activityRefKinds, { value: value.id, label: value.name }] })
            }
        });
    }

    fetchSeasonsAndPricings = () => {
        const {t} = this.props;
        api.set()
            .success(res => {
                this.setState({
                    seasons: res.seasons,
                    pricingCategories: res.pricing_categories,
                    activityRefPricings: this.props.activityRef.id === null ? [] : res.activity_ref_pricings,
                    packs: res.packs
                })
            })
            .error(res => {
                swal(t('activityRefBasics.fetchError'), res.error, "error");
            })
            .get("/activity_ref_pricings/get_seasons_and_pricing_categories", {});
    }

    handleSaveForNewActivity(pricingCategory) {
        this.props.addPricingCategoriesToSave(pricingCategory);
    }

    handleUpdateForNewActivity(pricingCategory) {
        this.props.updatePricingCategoriesToSave(pricingCategory);
    }

    handleDeleteForNewActivity(pricingCategory) {
        this.props.deletePricingCategoriesToSave(pricingCategory);
    }

    CreateButton({onCreate}) {
        const {t} = this.props;
        return (
            <DefaultCreateButton
                label={t("activityRefBasics.createPricing")}
                onCreate={onCreate}
            />
        );
    }

    render() {
        const {t} = this.props;
        if (this.state.seasons.length === 0) {
            return <div className="spinner-border text-primary" role="status">
                <span className="sr-only">{t("common:loading")}</span>
            </div>
        } else {
            const columns = [
                {
                    id: "pricing_name",
                    Header: t("activityRefBasics.pricingColumns.name"),
                    accessor: "pricing_category.name",
                },
                {
                    id: "activity_quantity",
                    Header: t("activityRefBasics.pricingColumns.lessonCount"),
                    accessor: "pricing_category.number_lessons",
                },
                {
                    id: "amount",
                    Header: t("activityRefBasics.pricingColumns.price"),
                    accessor: "price",
                },
                {
                    id: "selectedSeasons",
                    Header: t("activityRefBasics.pricingColumns.seasons"),
                    Cell: row => {
                        const seasonStart = this.state.seasons.find(s => s.id === row.original.from_season_id);
                        const seasonEnd = row.original.to_season_id !== undefined ? this.state.seasons.find(s => s.id === row.original.to_season_id) : null;
                        return seasonEnd != null ? seasonStart.label + " > " + seasonEnd.label : seasonStart.label + " > ...";
                    }
                },
            ];

            const {activityRef} = this.props;
            let dataService = null;

            if (activityRef.id !== null)
                // si l'activité existe déjà, on utilise le dataService classique
                dataService = new ActivityRefDataService(activityRef.id, this.state.packs);
            else
                // sinon, on utilise le dataService pour les nouvelles activités
                dataService = new NewActivityRefDataService(this.handleSaveForNewActivity, this.handleUpdateForNewActivity, this.handleDeleteForNewActivity, this.state.activityRefPricings, this.state.pricingCategories);

            return (
                <div>
                    <hr/>
                    <div className="row">
                        <DragAndDrop
                            file_url={this.props.activityRefImage}
                            setFile={f => this.props.onImageChange ? this.props.onImageChange(f) : ""}
                            acceptedTypes={"image/jpeg, image/png, image/jpg"}
                            textDisplayed={t("activityRefBasics.imageDropText")}/>
                    </div>

                    <div className="row">

                        <div className="col-sm-6">
                            <Field
                                label={t("activityRefBasics.fields.name")}
                                name="activityRef.label"
                                type="text"
                                required
                                validate={required}
                                render={Input}
                            />
                        </div>

                        <div className="col-sm-6">
                            <Field
                                label={t("activityRefBasics.fields.family")}
                                name="activityRef.activity_ref_kind_id"
                                type="select"
                                required
                                validate={required}
                                componentAdd={this.state.activityRefKinds.length === 0 ?
                                    <i className="fa fa-plus pointer-event" onClick={this.addKind}/> : undefined}
                                options={this.state.activityRefKinds}
                                render={InputSelect}
                            />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-sm-6">
                            <Field
                                label={t("activityRefBasics.fields.spots")}
                                name="activityRef.occupation_limit"
                                type="number"
                                required
                                validate={composeValidators(required, mustBeInteger, minValue(0))}
                                render={Input}
                            />
                        </div>

                        <div className="col-sm-6">
                            <Field
                                label={t("activityRefBasics.fields.spotsOverbooking")}
                                name="activityRef.occupation_hard_limit"
                                type="number"
                                required
                                tooltip={t("activityRefBasics.fields.spotsOverbookingTooltip")}
                                validate={composeValidators(required, mustBeInteger, minValue(0))}
                                render={Input}
                            />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-sm-6">
                            <Field
                                label={t("activityRefBasics.fields.ageMin")}
                                name="activityRef.from_age"
                                type="number"
                                required
                                validate={composeValidators(required, mustBeInteger, minValue(0))}
                                render={Input}
                            />
                        </div>

                        <div className="col-sm-6">
                            <Field
                                label={t("activityRefBasics.fields.ageMax")}
                                name="activityRef.to_age"
                                type="number"
                                required
                                validate={composeValidators(required, mustBeInteger, minValue(0))}
                                render={Input}
                            />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-sm-6">
                            <Field
                                label={t("activityRefBasics.fields.activityType")}
                                name="activityRef.activity_type"
                                type="select"
                                render={InputSelect}
                                options={this.activityTypes}
                            />
                        </div>
                        <div className="col-sm-6">
                            <Field
                                label={t("activityRefBasics.fields.duration")}
                                name="activityRef.duration"
                                type="number"
                                required
                                validate={composeValidators(required, mustBeIntegerOrUndefined, minValue(0))}
                                render={Input}
                            />
                        </div>
                    </div>

                    <div className="row">
                        <div className="col-sm-6">
                            <div className="form-group">
                                <label className="small d-block mb-1" style={{ color: "#003E5C" }}>
                                    {t("activityRefBasics.fields.colorLabel")}
                                </label>

                                <p className="text-muted small mb-2">
                                    {t("activityRefBasics.fields.colorHint")}
                                </p>

                                <Field
                                    name="activityRef.color_code"
                                    component={InputColor}
                                    label={null}
                                />
                            </div>
                        </div>
                    </div>


                    <hr />

                    <div className="row">
                        <div className="col-sm-6">
                            <label>{t("activityRefBasics.pricing.sectionLabel")}</label>
                            <p className="mt-3">{t("activityRefBasics.pricing.sectionHint")}</p>
                        </div>

                        <div className="col-sm-12 mt-4 mb-5">
                            <BaseDataTable
                                dataService={dataService}
                                columns={columns}
                                actionButtons={DefaultActionButtons}
                                createButton={this.CreateButton.bind(this)}
                                formContentComponent={
                                    (props) => <ActivityRefPricingModal
                                        {...props}
                                        seasons={this.state.seasons}
                                        pricingCategories={this.state.pricingCategories}
                                    />
                                }
                                showFullScreenButton={false}
                                oneResourceTypeName={t("activityRefBasics.pricing.oneResourceTypeName")}
                                thisResourceTypeName={t("activityRefBasics.pricing.thisResourceTypeName")}
                                defaultSorted={[{id: "to_season_id", desc: true}, {id: "pricing_category_id", asc: true}]}
                            />
                        </div>

                        {/*<div className="col-sm-12">*/}
                        {/*    <label>Choix des séances</label><br/>*/}
                        {/*    <Field*/}
                        {/*        name="activityRef.studentCanPick"*/}
                        {/*        type="checkbox"*/}
                        {/*        component="input"*/}
                        {/*        className="form-check-input mt-3 ml-2"*/}
                        {/*    />*/}
                        {/*    <span className="ml-2">L'élève peut choisir le créneau de sa séance de cours depuis son interface</span>*/}
                        {/*</div>*/}
                    </div>

                </div>
            );
        }
    }
}

export default withTranslation("activities")(ActivityRefBasics);
