import React, {Fragment, useEffect, useState} from "react";
import _ from "lodash";
import * as api from "../../../tools/api";
import swal from "sweetalert2";
import PaymentTermsSettingModal from "./PaymentTermsSettingModal";
import {useTranslation} from "react-i18next";

const LOCAL_STORAGE_KEY_SEASON = "user_payments_v2_season";

export default function UserPaymentsV2({seasons, user, is_current_user, onPayClicked, onSeasonChanged})
{
    const {t} = useTranslation("payments");
    const savedSeasonId = parseInt(localStorage.getItem(LOCAL_STORAGE_KEY_SEASON));

    const [season, setSeason] = useState(seasons.find(s => s.id == savedSeasonId) || _.sortBy(seasons, "start").pop());

    const [data, setData] = useState([]);
    const [duePaymentsData, setDuePaymentsData] = useState([]);
    const [paymentTerms, setPaymentTerms] = useState({});

    function handleChangeProrataForDesiredActivity(id, prorata) {
        const updatedData = data.map(item => {
            if (item.id === id) {
                return {...item, prorata: prorata};
            }
            return item;
        });
        setData(updatedData);

        api.set()
            .success(() => {
            })
            .error(() => {
                getDatas(); // Recharger les données en cas d'erreur
                swal(t("general.reminder.errorTitle"), t("terms.v2.prorataUpdateError"), "error");
            })
            .patch(`/desired_activities/${id}/update_prorata`, {
                prorata: prorata
            });
    }

    function getDatas()
    {
        api.set()
            .success((data) =>
            {
                setData(data.general_infos);
                setDuePaymentsData(data.due_payments);
                setPaymentTerms(data.payer_payment_terms);
            })
            .error(data =>
            {
                console.error(data);

                swal({
                    title: t("general.reminder.errorTitle"),
                    text: t("terms.v2.fetchPaymentInfoError"),
                    type: "error",
                });
            })
            .get(`/users/${user.id}/payments/data`, {season_id: season.id});
    }

    useEffect(() =>
    {
        localStorage.setItem(LOCAL_STORAGE_KEY_SEASON, season.id);

        getDatas();

        if(onSeasonChanged && typeof onSeasonChanged === "function")
            onSeasonChanged(season);
    }, [season]);

    return <Fragment>
        <div className="row wrapper border-bottom white-bg page-heading m-b-md">
            <h2>
                {is_current_user ? t("terms.v2.myPayments") : t("terms.v2.paymentsOf", { name: user.full_name })}
            </h2>
        </div>

        <div className="row m-b-md">
            <div className="col-sm-3 col-xl-2">
                <select className="form-control"
                        value={season.id}
                        onChange={(e) => setSeason(seasons.find(s => s.id === parseInt(e.target.value)))}>
                    {seasons.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
            </div>
        </div>

        <div className="row m-b-md">
            <div className="col-sm-12 col-md-9 col-xl-6">
                <div className="ibox">
                    <div className="ibox-title">
                        <h3>{t("terms.v2.generalInfo")}</h3>
                    </div>

                    <div className="ibox-content p-4">
                        <div className="row">
                            <div className="col-sm-10">
                                <table className="table table-borderless m-b-md table-hover">
                                    <thead>
                                    <tr>
                                        <th>{t("terms.v2.colActivities")}</th>
                                        <th>{t("terms.v2.colStudent")}</th>
                                        <th>{t("terms.v2.colProrata")}</th>
                                        <th>{t("terms.v2.colAmount")}</th>
                                    </tr>
                                    </thead>

                                    <tbody>
                                    {data.map(d => <tr key={d.id}>
                                        <td>{d.activity}</td>
                                        <td>{d.user_full_name}</td>
                                        <td>
                                            {d.intended_nb_lessons ? (
                                                is_current_user ? (
                                                    `${d.prorata || d.intended_nb_lessons} / ${d.intended_nb_lessons}`
                                                ) : (
                                                    <div style={{ display: "flex", alignItems: "center", fontSize: "14px" }}>
                                                        <input
                                                            type="number"
                                                            className="form-control"
                                                            style={{
                                                                width: "45px",
                                                                height: "28px",
                                                                padding: "2px 4px",
                                                                fontSize: "12px",
                                                                marginRight: "3px",
                                                                textAlign: "center",
                                                                border: "1px solid #ccc"
                                                            }}
                                                            value={d.prorata || d.intended_nb_lessons}
                                                            min="0"
                                                            max={d.intended_nb_lessons}
                                                            onChange={e => {
                                                                const newProrata = parseInt(e.target.value) || 0;
                                                                if (newProrata <= d.intended_nb_lessons) {
                                                                    handleChangeProrataForDesiredActivity(d.id, newProrata);
                                                                }
                                                            }}
                                                        />
                                                        <span>/ {d.intended_nb_lessons}</span>
                                                    </div>
                                                )
                                            ) : ""}
                                        </td>
                                        <td>{d.amount} €</td>
                                    </tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-sm-12">
                                <h3>{t("terms.v2.totalAmount", { amount: _.sumBy(data, d => d.amount) })}</h3>
                            </div>
                        </div>

                        {onPayClicked && typeof onPayClicked === "function" && <div className="row">
                            <div className="col-sm-12 text-right">
                                <button className="btn btn-primary px-sm-5" onClick={() => onPayClicked(season)}>
                                    {t("terms.v2.pay")}
                                </button>
                            </div>
                        </div>}
                    </div>
                </div>
            </div>

            <div className="col-sm-6 col-md-3 col-xl-4">
                <div className="ibox">
                    <div className="ibox-title">
                        <h3>{t("terms.v2.yourPaymentTerms")}</h3>
                    </div>

                    <div className="ibox-content p-4">
                        <div className="row m-b-md">
                            <div className="col-sm-12">
                                <h4>{t("terms.v2.payment")}</h4>

                                {(paymentTerms || {}).term_name || t("terms.v2.notSet")}
                            </div>
                        </div>

                        {(paymentTerms || {}).payment_method && <div className="row">
                            <div className="col-sm-12">
                                <h4>{t("terms.v2.paymentMethod")}</h4>
                            </div>

                            <div className="col-sm-6">
                                <div style={{border: "1px solid lightgrey"}} className="p-sm-2 img-rounded">
                                    <div className="row">
                                        <div className="col-sm-12 text-center">
                                            <i className="fa fa-credit-card fa-2x"></i>
                                        </div>
                                    </div>

                                    <div className="row m-t-sm">
                                        <div className="col-sm-12 text-center">
                                            <strong>{paymentTerms.payment_method}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>}

                        <div className="row m-t-md">
                            <div className="col-sm-12 text-right">
                                <PaymentTermsSettingModal
                                    user={user}
                                    season={season}
                                    isForNew={!(paymentTerms || {}).payment_method}
                                    onSaved={() => getDatas()}>
                                    {(paymentTerms || {}).payment_method ? t("terms.v2.edit") : t("common:actions.add")}
                                </PaymentTermsSettingModal>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {duePaymentsData.length > 0 && <div className="row">
            <div className="col-sm-12 col-md-9 col-xl-6">
                <div className="ibox">
                    <div className="ibox-title">
                        <h3>{t("terms.v2.yourDueDates")}</h3>
                    </div>

                    <div className="ibox-content p-4">
                        <div className="alert alert-info p-2 px-sm-3 py-sm-4">
                            {t("terms.v2.preferredDayInfo1", { day: paymentTerms.day_for_collection })} <br/>
                            {t("terms.v2.preferredDayInfo2")}
                        </div>

                        <table className="table table-borderless table-hover">
                            <thead>
                            <tr>
                                <th>{t("terms.v2.colDueDate")}</th>
                                <th>{t("terms.v2.colAmount")}</th>
                                <th>{t("terms.v2.colStatus")}</th>
                            </tr>
                            </thead>

                            <tbody>
                            {duePaymentsData.map(d => <tr key={d.id}>
                                <td>{new Date(d.due_date).toLocaleDateString()}</td>
                                <td>{d.amount} €</td>
                                <td>
                                        <span style={{width: "87px"}} className={`d-block text-center text-white p-2 px-sm-4 ${d.status === 0 ? "bg-green" : d.status === 1 ? "bg-warning" : "bg-danger"}`}>
                                            {d.status === 0 ? t("terms.v2.statusValidated") : d.status === 1 ? t("terms.v2.statusUpcoming") : t("terms.v2.statusLate")}
                                        </span>
                                </td>
                            </tr>)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>}
    </Fragment>
}