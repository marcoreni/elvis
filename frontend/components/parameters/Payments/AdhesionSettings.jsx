import React, { Fragment, useEffect, useState } from "react";
import { csrfToken } from "../../utils";
import swal from "sweetalert2";
import TanStackGrid from "../../common/baseDataTable/TanStackGrid";
import AdhesionEditModal from "./AdhesionEditModal";
import * as api from "../../../tools/api";
import _ from "lodash";
import { useTranslation } from "react-i18next";

export default function AdhesionSettings() {
    const { t } = useTranslation("parameters");
    const [adhesionEnabled, setAdhesionEnabled] = useState(false);
    const [adhesionPrices, setAdhesionPrices] = useState([]);
    const [seasons, setSeasons] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);
    // Controlled, rather than TanStackGrid's own uncontrolled default (pageSize 20), so the
    // page-size selector below can start at v6's old `defaultPageSize={10}`.
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    // TanStackGrid's own auto-reset only covers filter changes (see its `handleColumnFiltersChange`),
    // not a shrinking `data` array -- a non-manual, pagination-controlled table like this one (see
    // Activity.jsx's clampPageIndex / DuePaymentList.jsx for the same class of fix) needs its own
    // clamp: deleting a row can drop the page count below the current pageIndex, otherwise stranding
    // the view on an out-of-range, empty "no data" page.
    useEffect(() => {
        setPagination((prev) => {
            const maxPageIndex = Math.max(
                0,
                Math.ceil(adhesionPrices.length / prev.pageSize) - 1
            );
            return prev.pageIndex > maxPageIndex
                ? { ...prev, pageIndex: maxPageIndex }
                : prev;
        });
    }, [adhesionPrices]);

    useEffect(() => {
        fetch(`/parameters/payment_parameters/show_adhesion`, {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json, text/csv",
                "X-CSRF-Token": csrfToken,
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setIsInitialized(true);
                setAdhesionEnabled(data.adhesion_enabled);
                setSeasons({ ...data }.seasons);
            });

        api.set()
            .success((data) => {
                setAdhesionPrices([...data]);
            })
            .error((data) => {
                console.error(data);

                swal.fire({
                    title: t("shared.errorTitle"),
                    text: t("shared.genericError"),
                    icon: "error",
                });
            })
            .get("/adhesion-prices", {});
    }, []);

    useEffect(() => {
        if (isInitialized) {
            fetch("/parameters/payment_parameters/update_adhesion", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "X-CSRF-TOKEN": csrfToken,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    adhesion: {
                        adhesion_enabled: adhesionEnabled,
                    },
                }),
            })
                .then((response) => {
                    if (!response.ok) {
                        swal.fire({
                            title: t("shared.errorTitle"),
                            text: t("shared.genericError"),
                            icon: "error",
                        });
                    }

                    return response.json();
                })
                .then((data) => {
                    if (!_.isEmpty(data)) {
                        swal.fire({
                            title: t("shared.errorTitle"),
                            text: data.errors.adhesionFee,
                            icon: "error",
                        });
                    }
                });
        }
    }, [adhesionEnabled]);

    function deleteStatus(adh) {
        swal.fire({
            title: t("payments.adhesion.deleteConfirm", { label: adh.label }),
            icon: "warning",
            showCancelButton: true,
            cancelButtonText: t("common:actions.cancel"),
            confirmButtonText: t("common:actions.delete"),
            customClass: {
                cancelButton: "order-1",
                confirmButton: "order-2",
            },
        }).then((result) => {
            if (result.isConfirmed) {
                api.set()
                    .success((data) => {
                        setAdhesionPrices(
                            adhesionPrices.filter((a) => a.id != data.id)
                        );
                    })
                    .error((data) => {
                        console.error(data.errors);

                        swal.fire({
                            title: t("payments.adhesion.deleteImpossibleTitle"),
                            text: t("payments.adhesion.deleteImpossibleText", {
                                label: adh.label,
                            }),
                            icon: "error",
                        });
                    })
                    .del(`/adhesion-prices/${adh.id}`, {});
            }
        });
    }

    return (
        <Fragment>
            <div className="row">
                <div className="col-sm-4">
                    <div className="form-group">
                        <div className="checkbox checkbox-primary">
                            <input
                                className="m-3"
                                type="checkbox"
                                id="adhesionEnabled"
                                checked={adhesionEnabled}
                                onChange={(e) =>
                                    setAdhesionEnabled(e.target.checked)
                                }
                            />
                            <label
                                className="control-label"
                                htmlFor="adhesionEnabled"
                            >
                                {t("payments.adhesion.enableLabel")}
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {adhesionEnabled && (
                <div className={"row mt-5"}>
                    <div className={"col-sm-12 text-right"}>
                        <AdhesionEditModal
                            seasons={seasons}
                            onAdd={(adh) =>
                                setAdhesionPrices([...adhesionPrices, adh])
                            }
                        >
                            <i className="fas fa-plus" />{" "}
                            {t("common:actions.add")}
                        </AdhesionEditModal>
                    </div>
                </div>
            )}

            {adhesionEnabled && (
                <div className="row mt-2">
                    <div className="col-sm-12">
                        <TanStackGrid
                            tableName="adhesion-settings"
                            manual={false}
                            data={adhesionPrices}
                            loading={false}
                            pages={null}
                            // No filter UI existed in the v6 table (no `filterable`/`Filter` set
                            // on any column); also sidesteps the id/price columns' auto-picked
                            // client-mode filterFn (numeric/accessor-less) that a real filter row
                            // would otherwise need explicit `filterable: false` for.
                            filterable={false}
                            pagination={pagination}
                            onPaginationChange={setPagination}
                            pageSizeOptions={[5, 10, 20, 25, 50, 100]}
                            columns={[
                                {
                                    id: "id",
                                    Header: "#",
                                    accessor: "id",
                                    width: 50,
                                },
                                {
                                    id: "label",
                                    Header: t("payments.adhesion.cols.labels"),
                                    accessor: "label",
                                },
                                {
                                    id: "price",
                                    Header: t("payments.adhesion.cols.prices"),
                                    accessor: "price",
                                },
                                {
                                    id: "season_id",
                                    Header: t(
                                        "payments.adhesion.cols.defaultForSeason"
                                    ),
                                    Cell: (props) => (
                                        <div>
                                            {
                                                (props.original.season || {})
                                                    .label
                                            }
                                        </div>
                                    ),
                                },
                                {
                                    id: "actions",
                                    Header: t("shared.actions"),
                                    Cell: (props) => (
                                        <Fragment>
                                            <AdhesionEditModal
                                                adhesion={props.original}
                                                seasons={seasons}
                                                onEdit={(adh) =>
                                                    setAdhesionPrices([
                                                        ...adhesionPrices.map(
                                                            (a) =>
                                                                a.id === adh.id
                                                                    ? adh
                                                                    : a
                                                        ),
                                                    ])
                                                }
                                            >
                                                <i className="fas fa-edit" />
                                            </AdhesionEditModal>

                                            {props.original.built_in ? (
                                                ""
                                            ) : (
                                                <button
                                                    className="btn btn-warning"
                                                    onClick={() =>
                                                        deleteStatus(
                                                            props.original
                                                        )
                                                    }
                                                >
                                                    <i className="fas fa-trash" />
                                                </button>
                                            )}
                                        </Fragment>
                                    ),
                                },
                            ]}
                        />
                    </div>
                </div>
            )}
        </Fragment>
    );
}
