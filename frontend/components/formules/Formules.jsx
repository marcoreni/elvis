import React, {useState} from 'react';
import ReactTable from "react-table";
import {useTranslation} from "react-i18next";
import * as api from "../../tools/api";
import swal from "sweetalert2";


export default function Formules() {
    const {t} = useTranslation("formules");

    const [data, setData] = useState([]);
    const [pages, setPages] = useState(0);
    const [loading, setLoading] = useState(false);

    function deleteFormule(formule)
    {
        swal({
            title: t("common:confirm.sure"),
            text: t("list.delete.confirmText"),
            type: "warning",
            buttons: true,
            dangerMode: true,
        })
        .then(async (willDelete) => {
            if (willDelete) {
                try {
                    await api.set()
                        .success(res => {
                            fetchData({page: 0, pageSize: 10, sorted: [], filtered: {}}, null);
                            swal({
                                title: t("list.delete.successTitle"),
                                text: t("list.delete.successText"),
                                type: "success",
                                timer: 1000
                            })
                        })
                        .error(res => {
                            swal(t("list.delete.errorTitle"), res.error, "error");
                        })
                        .del('/formules/' + formule.id, {})
                } catch (error) {
                    console.error(error);
                    swal(t("list.delete.errorTitle"), error.message, "error");
                }
            }
        });
    }

    function archiveFormule(formule)
    {
        const isArchived = formule["archived?"];
        api.set()
            .success(() => {
                fetchData({page: 0, pageSize: 10, sorted: [], filtered: {}}, null);
                swal({
                    title: isArchived ? t("list.archive.unarchivedTitle") : t("list.archive.archivedTitle"),
                    text: isArchived
                        ? t("list.archive.unarchivedText")
                        : t("list.archive.archivedText"),
                    type: "success",
                    timer: 2500,
                });
            })
            .error(res => {
                swal(t("list.archive.errorTitle"), res.error, "error");
            })
            .patch('/formules/' + formule.id + '/archive', {});
    }

    function columns()
    {
        return [
            {
                id: "name",
                Header: t("list.columns.name"),
                accessor: d => d.name,
                Cell: props => (
                    <span>
                        {props.original.name}
                        {props.original["archived?"] &&
                            <span className="badge badge-secondary m-l-sm">{t("list.archivedBadge")}</span>}
                    </span>
                ),
            },
            {
                id: "activites",
                Header: t("list.columns.activities"),
                accessor: d => (d.activities || []).map(activite => activite.display_name).join(', '),
            },
            {
                id: "actions",
                Header: t("list.columns.actions"),
                Cell: props => {
                    const isUsed = props.original["used?"];
                    const isArchived = props.original["archived?"];
                    return (
                        <div className="btn-wrapper">
                            <a className="btn-sm btn-primary m-r-sm" href={'/formules/' + props.original.id + "/edit"}>
                                <i className="fas fa-edit"/>
                            </a>

                            <a className="btn-sm btn-info m-r-sm"
                               title={isArchived ? t("list.unarchiveAction") : t("list.archiveAction")}
                               onClick={() => archiveFormule(props.original)}>
                                <i className={isArchived ? "fas fa-box-open" : "fas fa-archive"}/>
                            </a>

                            {isUsed ? (
                                <span className="btn-sm btn-warning disabled"
                                      style={{opacity: 0.5, cursor: "not-allowed"}}
                                      title={t("list.deleteDisabledTitle")}>
                                    <i className="fas fa-trash"/>
                                </span>
                            ) : (
                                <a className="btn-sm btn-warning" onClick={() => deleteFormule(props.original)}>
                                    <i className="fas fa-trash"/>
                                </a>
                            )}
                        </div>
                    );
                },
                sortable: false,
                filterable: false,
            }
        ];
    }

    async function fetchData(state, instance) {
        setLoading(true);
        try {
            await api.set()
                .success(res => {
                    setData(res.data);
                    setPages(res.pages);
                })
                .error(res => {
                    swal(t("list.fetchError"), res.error, "error");

                })
                .get('/formules', {
                    page: state.page + 1,
                    pageSize: state.pageSize,
                    sorted: state.sorted[0] ? JSON.stringify(state.sorted[0]) : null,
                    filtered: JSON.stringify(state.filtered)
                })
        } catch (error) {
            swal(t("list.fetchError"), error, "error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <p>{t("list.intro")}</p>
            <div className="text-right">
                <a className="btn btn-sm btn-primary" href={"/formules/new"}>
                    <i className="fa fa-plus mr-2"></i>{t("list.create")}
                </a>
            </div>

            <div className="ibox mt-5">
                <div className="ibox-content p-5">
                    <ReactTable
                        columns={columns()}
                        data={data}
                        pages={pages}
                        loading={loading}
                        onFetchData={fetchData}
                        manual
                        className="-striped -highlight"
                        defaultPageSize={10}
                        previousText={t("common:reactTable.previousText")}
                        nextText={t("common:reactTable.nextText")}
                        loadingText={t("common:reactTable.loadingText")}
                        noDataText={t("common:reactTable.noDataText")}
                        pageText={t("common:reactTable.pageText")}
                        ofText={t("common:reactTable.ofText")}
                        rowsText={t("common:reactTable.rowsText")}
                    />
                </div>
            </div>
        </div>
    )
}
