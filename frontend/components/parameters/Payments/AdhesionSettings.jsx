import React, {Fragment, useEffect, useState} from 'react';
import {csrfToken} from "../../utils";
import swal from "sweetalert2";
import ReactTable from "react-table";
import AdhesionEditModal from "./AdhesionEditModal";
import * as api from "../../../tools/api";
import _ from "lodash";
import {useTranslation} from "react-i18next";

export default function AdhesionSettings()
{
    const {t} = useTranslation("parameters");
    const [adhesionEnabled, setAdhesionEnabled] = useState(false);
    const [adhesionPrices, setAdhesionPrices] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() =>
    {
        fetch(`/parameters/payment_parameters/show_adhesion`, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json, text/csv",
                "X-CSRF-Token": csrfToken,
            },
        }).then(res => res.json())
            .then(data =>
            {
                setIsInitialized(true);
                setAdhesionEnabled(data.adhesion_enabled);
                setSeasons({...data}.seasons);
            });

        api.set()
            .success(data =>
            {
                setAdhesionPrices([...data]);
            })
            .error(data =>
            {
                console.error(data);

                swal({
                    title: t("shared.errorTitle"),
                    text: t("shared.genericError"),
                    type: 'error'
                });
            })
            .get('/adhesion-prices', {});
    }, []);


    useEffect(() =>
    {
        if(isInitialized)
        {
            fetch('/parameters/payment_parameters/update_adhesion', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    adhesion: {
                        adhesion_enabled: adhesionEnabled
                    }
                })
            }).then(response => {
                if (!response.ok)
                {
                    swal({
                        title: t("shared.errorTitle"),
                        text: t("shared.genericError"),
                        icon: 'error'
                    });
                }

                return response.json()
            }).then(data => {
                if (!_.isEmpty(data)) {
                    swal({
                        title: t("shared.errorTitle"),
                        text: data.errors.adhesionFee,
                        type: 'error'
                    });
                }
            });
        }
    }, [adhesionEnabled]);

    function deleteStatus(adh)
    {
        swal({
            title: t("payments.adhesion.deleteConfirm", {label: adh.label}),
            type: 'warning',
            showCancelButton: true,
            cancelButtonText: t("common:actions.cancel"),
            confirmButtonText: t("common:actions.delete"),
            cancelButtonClass: 'order-1',
            confirmButtonClass: 'order-2',
        }).then((result) =>
        {
            if(result.value)
            {
                api.set()
                    .success(data =>
                    {
                        setAdhesionPrices(adhesionPrices.filter(a => a.id != data.id));
                    })
                    .error(data =>
                    {
                        console.error(data.errors);

                        swal({
                            title: t("payments.adhesion.deleteImpossibleTitle"),
                            text: t("payments.adhesion.deleteImpossibleText", {label: adh.label}),
                            type: 'error'
                        });
                    })
                    .del(`/adhesion-prices/${adh.id}`, {});
            }
        });
    }

    return <Fragment>
        <div className="row">
            <div className="col-sm-4">
                <div className="form-group">
                    <div className="checkbox checkbox-primary">
                        <input
                            className="m-3"
                            type="checkbox"
                            id="adhesionEnabled"
                            checked={adhesionEnabled}
                            onChange={e => setAdhesionEnabled(e.target.checked)}
                        />
                        <label className="control-label" htmlFor="adhesionEnabled">{t("payments.adhesion.enableLabel")}</label>
                    </div>
                </div>
            </div>
        </div>

        {adhesionEnabled && <div className={"row mt-5"}>
            <div className={"col-sm-12 text-right"}>
                <AdhesionEditModal
                    seasons={seasons}
                    onAdd={adh => setAdhesionPrices([...adhesionPrices, adh])}
                >
                    <i className="fas fa-plus"/> {t("common:actions.add")}
                </AdhesionEditModal>
            </div>
        </div>}

        {adhesionEnabled && <div className="row mt-2">
            <div className="col-sm-12">
                <ReactTable
                    data={adhesionPrices}
                    columns={[
                        {
                            id: "id",
                            Header: "#",
                            accessor: "id",
                            width: 50
                        },
                        {
                            id: "label",
                            Header: t("payments.adhesion.cols.labels"),
                            accessor: "label"
                        },
                        {
                            id: "price",
                            Header: t("payments.adhesion.cols.prices"),
                            accessor: "price"
                        },
                        {
                            id: "season_id",
                            Header: t("payments.adhesion.cols.defaultForSeason"),
                            Cell: props => <div>{(props.original.season || {}).label}</div>
                        },
                        {
                            id: "actions",
                            Header: t("shared.actions"),
                            Cell: props => <Fragment>
                                <AdhesionEditModal
                                    adhesion={props.original}
                                    seasons={seasons}
                                    onEdit={adh => setAdhesionPrices([...adhesionPrices.map(a => a.id === adh.id ? adh : a)])}
                                >
                                    <i className="fas fa-edit"/>
                                </AdhesionEditModal>

                                {props.original.built_in ? "" :
                                    <button className="btn btn-warning" onClick={() => deleteStatus(props.original)}>
                                        <i className="fas fa-trash"/>
                                    </button>}
                            </Fragment>
                        }
                    ]}
                    defaultPageSize={10}
                    className="-striped -highlight"
                />

            </div>
        </div>}
    </Fragment>
}