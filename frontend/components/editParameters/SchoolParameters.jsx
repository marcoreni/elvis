import React, {Fragment, useState} from "react";
import {useForm} from "react-hook-form";
import {validateEmail} from "../../tools/format";
import swal from "sweetalert2";
import {csrfToken} from "../utils";
import DragAndDrop from "./DragAndDrop";
import * as api from "../../tools/api";
import {useTranslation, Trans} from "react-i18next";

export default function SchoolParameters(props) {
    const {t} = useTranslation("parameters");
    const [academy, setAcademy] = useState((props.school || {}).academy)
    const [zone, setZone] = useState((props.school || {}).zone)
    const [imageUrl, setPicture] = useState(props.picture_url)
    const {register, formState: {errors}, handleSubmit, getValues, setValue} = useForm();

    let file = undefined;

    function onSubmit(data) {
        let formData = new FormData();
        formData.append("city", data.city);
        formData.append("contactPhone", data.contactPhone);
        formData.append("email", data.email);
        formData.append("schoolName", data.name);
        formData.append("street", data.street);
        formData.append("postalCode", data.postalCode);
        formData.append("countryCode", data.countryCode);
        formData.append("picture", file);
        formData.append("bankHolidaysZone", data.bankHolidaysZone);
        formData.append("recaptcha_score_min", data.min_score_recaptcha);
        formData.append("siret_rna", data.siretRna);
        formData.append("rcs", data.rcs);
        formData.append("entity_subject_to_vat", data.entitySubjectToVAT);
        formData.append("activities_not_subject_to_vat", data.activitiesNotSubjectToVat);
        formData.append("zone_set_by_user", data.zone_set_by_user);
        formData.append("academy", academy);
        formData.append("zone", zone || data.zone);
        swal({
            title: t("common:loading"),
            onOpen: () => swal.showLoading()
        });

        fetch("/parameters/school", {
            method: "post",
            credentials: "same-origin",
            headers: {
                "X-CSRF-Token": csrfToken,
            },
            body: formData
        }).then(res => {
            if (res.ok) {
                res.json().then(json => {
                    setAcademy(json.academy);
                    setZone(json.zone);
                    setPicture(json.picture)

                    swal({
                        type: "success",
                        title: t("shared.saveCompleted")
                    });
                });
            } else {
                swal({
                    type: "error",
                    title: t("shared.genericErrorShort")
                })
            }
        });
    }

    function onAddressChange(address, postalCode, city, countryCode) {
        api.set()
            .success(data => {
                setZone(data.zone || "");
                setAcademy(data.academy);

                if (data.zone) {
                    setValue("zone_set_by_user", false);
                }
            })
            .error(data => {
                console.error(data);
            })
            .get("/school/get_zone_by_address", {address, postalCode, city, countryCode});
    }

    let addressChangeTimeout = null;

    function addressChange() {
        const address = getValues("street");
        const postalCode = getValues("postalCode");
        const city = getValues("city");
        const countryCode = getValues("countryCode")
        const zone_set_by_user = getValues("zone_set_by_user")

        if ((zone_set_by_user === "false" || zone_set_by_user === false) && address && postalCode && city && countryCode) {
            if (addressChangeTimeout !== null) {
                clearTimeout(addressChangeTimeout);
            }

            addressChangeTimeout = setTimeout(() => onAddressChange(address, postalCode, city, countryCode), 500);
        }
    }

    function onZoneSetByUser() {
        setValue("zone_set_by_user", true);
    }

    function getSiretOrRnaPatternByCountry(countryCode) {
        const siretForCountry = (() => {
            switch (countryCode) {
                case "BE":
                    return /^[0-9]{10}$/
                default:
                    // FR by default
                    return /^[0-9]{14}$/
            }
        })();

        const rna = /|^W[0-9]{9}$/;

        return new RegExp(`^(${siretForCountry.source}|${rna.source})$`);
    }

    function validateSiretRna(value) {
        const pattern = getSiretOrRnaPatternByCountry(getValues("countryCode"));
        if (pattern.test(value.replace(/\s/g, ""))) {
            return true;
        } else {
            return t("editParameters.school.siretRnaError", {country: getValues("countryCode")});
        }
    }

    return <form className="m-b" onSubmit={handleSubmit(onSubmit)}>
        <div className="col-md-6 col-xs-12 ">

            {/*Informations de l'école*/}
            <div className="param">
                <h3 className="mb-4" style={{color: "black"}}>{t("editParameters.school.schoolInfoHeading")}</h3>
                <div className="form-group">
                    <label>{t("editParameters.school.logoLabel")}</label>
                    <DragAndDrop
                        file_url={imageUrl}
                        setFile={f => file = f}
                        acceptedTypes={"image/jpeg, image/png, image/jpg"}
                        textDisplayed={t("editParameters.school.logoDropText")}/>
                </div>
                <div className="form-group">
                    <label>{t("editParameters.school.nameLabel")} <span className="text-danger">*</span> :</label>
                    <input className="form-control" type="text" name="name"  {...register('name', {required: true})}
                           defaultValue={props.school.name}/>
                    <p className="text-danger">{errors.name && t("editParameters.school.nameRequired")}</p>
                </div>
                <div className="form-group">
                    <label>{t("editParameters.school.emailLabel")} <span className="text-danger">*</span> :</label>
                    <input type="email" name="email" {...register("email", {
                        required: true,
                        validate: value => !!validateEmail(value)
                    })} defaultValue={props.school.email} className="form-control"/>
                    <p className="text-danger">{errors.email && t("editParameters.school.emailRequired")}</p>
                </div>
                <div className="form-group">
                    <label>{t("editParameters.school.phoneLabel")} <span className="text-danger">*</span> :</label>
                    <input type="tel" name="contactPhone" {...register("contactPhone", {
                        required: true,
                        pattern: /^(?:0|\(?\+[1-9]?[0-9]{2}?\)?\s?|0033\s?)[1-79](?:[\.\-\s]?\d\d){4}$/
                    })} defaultValue={props.school.phone_number} className="form-control"/>
                    <p className="text-danger">{errors.contactPhone && t("editParameters.school.phoneRequired")}</p>
                </div>
            </div>

            {/*Coordonnées*/}
            <div className="param">
                <h3 className="mb-4" style={{color: "black"}}>{t("editParameters.school.contactsHeading")}</h3>
                <div className="form-group">
                    <label>{t("editParameters.school.streetLabel")} <span className="text-danger">*</span> :</label>
                    <input
                        type="text"
                        name="street"
                        {...register("street", {required: true})}
                        defaultValue={props.schoolAddress.street_address}
                        className="form-control"
                        onChange={addressChange}
                    />
                    <p className="text-danger">{errors.street && t("editParameters.school.streetRequired")}</p>
                </div>
                <div className="form-group">
                    <label>{t("editParameters.school.cityLabel")} <span className="text-danger">*</span> :</label>
                    <input className="form-control" type="text" name="city" {...register("city", {required: true})}
                           defaultValue={props.schoolAddress.city} onChange={addressChange}/>
                    <p className="text-danger">{errors.city && t("editParameters.school.cityRequired")}</p>
                </div>
                <div className="form-group">
                    <label>{t("editParameters.school.postalCodeLabel")} <span className="text-danger">*</span> :</label>
                    <input type="text" name="postalCode" {...register("postalCode", {
                        required: true,
                        pattern: /^\d+$/
                    })} defaultValue={props.schoolAddress.postcode} className="form-control" onChange={addressChange}/>
                    <p className="text-danger">{errors.postalCode && t("editParameters.school.postalCodeError")}</p>
                </div>
                <div className="form-group">
                    <label>{t("editParameters.school.countryLabel")} <span className="text-danger">*</span> :</label>
                    <select className="form-control" name="countryCode" {...register("countryCode", {required: true})}
                            defaultValue={props.schoolAddress.country || "FR"} onChange={addressChange}
                    >
                        {props.countries.map(country =>
                            <option value={country[1]} key={country[1]}>{country[0]}</option>
                        )}
                    </select>
                    <p className="text-danger">{errors.country && t("editParameters.school.countryRequired")}</p>
                </div>
            </div>

            {/*Vacances et jours fériés*/}
            <div className="param">
                <h3 className="mb-4" style={{color: "black"}}>{t("editParameters.school.holidaysHeading")}</h3>
                <div className="form-group">
                    <label>
                        {t("editParameters.school.bankHolidaysZoneLabel")} <small>{t("editParameters.school.optional")}</small> :
                    </label>
                    <select className="form-control" {...register("bankHolidaysZone")}
                            defaultValue={props.bankHolidaysZone}>
                        {Object.values(props.bankHolidaysZones).map((zone, index) =>
                            <option key={index} value={zone}>{zone}</option>
                        )}
                    </select>
                </div>
                <div className="form-group"> {/*Zone de vacances scolaires*/}
                    <label>{t("editParameters.school.schoolHolidaysZoneLabel")}</label>
                    {props.zone_set_by_user === true || getValues("zone_set_by_user") === "true" || zone === "" ?
                        <Fragment>
                            <select className="form-control" name="zone" {...register("zone")} defaultValue={zone}
                                    onChange={onZoneSetByUser}>
                                {Object.values(props.zones).map((z, index) =>
                                    <option key={index} value={z.toString()}>{z}</option>
                                )}
                            </select>
                        </Fragment> : <div>
                            <i className="fas fa-umbrella-beach h3 color-black m-r-sm"/>
                            <span className="nav-label">
                                <strong>{zone} </strong>
                                {t("editParameters.school.academyLine", {academy})}
                            </span>
                        </div>}
                </div>
                <input type="hidden" name="zone_set_by_user" {...register("zone_set_by_user")}
                       defaultValue={props.zone_set_by_user || false}/>
            </div>

            {/*/!*Recaptcha*!/*/}
            {/*<div className="param">*/}
            {/*    <h3 className="mb-4" style={{color: "black"}}>Recaptcha</h3>*/}
            {/*    <div className="form-group">*/}
            {/*        <label>Score minimum requis <small>(optionnel)</small> :</label>*/}
            {/*        <input type="number" name="min_score_recaptcha" {...register("min_score_recaptcha")}*/}
            {/*               defaultValue={props.min_score_recaptcha} className="form-control"/>*/}
            {/*    </div>*/}
            {/*</div>*/}

            {/*Informations de facturation*/}
            <div className="param">
                <h3 className="mb-4" style={{color: "black"}}>{t("editParameters.school.billingHeading")}</h3>
                <div className="form-group">
                    <label>{t("editParameters.school.siretRnaLabel")} <span className="text-danger">*</span> :</label>
                    <input type="text" name="siret" {...register("siretRna", {
                        required: true,
                        validate: validateSiretRna
                    })} defaultValue={props.school.siret_rna} className="form-control"/>
                    <p className="text-danger">{errors.siretRna && t("editParameters.school.siretRnaError", {country: getValues("countryCode")})}</p>
                </div>
                <div className="form-group">
                    <label>{t("editParameters.school.rcsLabel")}</label>
                    <input type="text" name="rcs" {...register("rcs", {
                        required: false,
                        pattern: /^[AB][0-9]{9}$/
                    })} defaultValue={props.school.rcs} className="form-control"/>
                </div>
                <div className="form-group">
                    <label htmlFor={"entitySubjectToVAT"}>{t("editParameters.school.vatLabel")}</label>
                    {/*<input type={"checkbox"} name={"entitySubjectToVAT"} id={"entitySubjectToVAT"} {...register("entitySubjectToVAT")} defaultChecked={props.school.entity_subject_to_vat} />*/}
                    <select
                        name={"entitySubjectToVAT"} id={"entitySubjectToVAT"}
                        {...register("entitySubjectToVAT")}
                        defaultValue={props.school.entity_subject_to_vat}
                        className={"form-control"}
                    >
                        <option value={"true"}>{t("editParameters.school.vatTaxable")}</option>
                        <option value={"false"}>{t("editParameters.school.vatExempt")}</option>
                    </select>
                </div>
                <div className="mt-5">
                    <input type={"checkbox"} name={"activitiesNotSubjectToVat"}
                           id={"activitiesNotSubjectToVat"} {...register("activitiesNotSubjectToVat")}
                           defaultChecked={props.school.activities_not_subject_to_vat}/>
                    <label className="m-l-sm" htmlFor={"activitiesNotSubjectToVat"}><Trans i18nKey="editParameters.school.activitiesNotVatLabel" ns="parameters">Les activités musicales <u>ne sont pas assujetties</u> à la TVA</Trans></label>
                </div>

            </div>

            {/*submit*/}
            <div className=" text-right mb-5">
                <input type="submit" value={t("common:actions.save")} className="btn text-white btn-primary"/>
            </div>
        </div>

    </form>
}