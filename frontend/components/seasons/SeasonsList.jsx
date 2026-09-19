import React from "react";
import swal from "sweetalert2";

import TanStackGrid from "../common/baseDataTable/TanStackGrid";
import { withTranslation } from "react-i18next";
import { csrfToken } from "../utils";
import RemoveComponent from "../RemoveComponent";
import SeasonActivationModal from "./SeasonActivationModal";

class SeasonsList extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            seasons: this.props.seasons,
            modalRef: React.createRef(),
        };
    }

    deleteSeason(id) {
        const { t } = this.props;
        const selectedSeason = this.state.seasons.find((s) => s.id == id);

        if (selectedSeason.is_current) {
            swal.fire({
                icon: "error",
                title: t("planning:seasonsList.cannotDeleteCurrentTitle"),
                text: t("planning:seasonsList.cannotDeleteCurrentText"),
            });
            return;
        }

        swal.fire({
            title: t("planning:seasonsList.deleteTitle"),
            text: t("common:confirm.sure"),
            icon: "warning",
            showCancelButton: true,
            cancelButtonText: t("common:actions.cancel"),
            confirmButtonText: t("common:actions.confirm"),
        }).then((a) => {
            if (a.isConfirmed) {
                fetch(`/seasons/${id}`, {
                    method: "DELETE",
                    headers: {
                        "X-CSRF-Token": csrfToken,
                    },
                }).then((res) => {
                    if (res.ok) {
                        const previous = this.state.seasons.find(
                            (s) => s.next_season_id == id
                        );

                        if (previous) {
                            previous.next_season_id = null;
                            previous.next_season = null;
                        }

                        this.setState({
                            seasons: this.state.seasons.filter(
                                (c) => c.id !== id
                            ),
                        });

                        swal.fire({
                            title: t("planning:seasonsList.deleteSuccessTitle"),
                            text: t("planning:seasonsList.deleteSuccessText"),
                            icon: "success",
                        });
                    }
                });
            }
        });
    }

    switchToSeason(new_current_id) {
        if (this.state.modalRef.current) {
            this.state.modalRef.current.openModal(new_current_id);
        }
    }

    onActivationSuccess = (data) => {
        this.setState(function (previousState) {
            const state = Object.assign({}, previousState);
            const currentSeason = state.seasons.find((s) => s.is_current);
            if (currentSeason) {
                currentSeason.is_current = false;
            }

            const newCurrent = state.seasons.find((s) => s.id === data.id);
            if (newCurrent) {
                newCurrent.is_current = true;
            }

            if (data.new_next_season) {
                state.seasons.sort((a, b) => a.start < b.start);
                newCurrent.next_season = data.next;
                newCurrent.next_season_id = data.next.id;
                state.seasons.push(data.next);
            }

            return state;
        });
    };

    render() {
        const { t } = this.props;

        const columns = [
            // {
            //     id: "id",
            //     Header: "#",
            //     accessor: d => d.id,
            //     width: 50,
            //     maxWidth: 100
            // },
            {
                id: "label",
                Header: t("planning:seasonsList.columns.label"),
                accessor: (d) => d.label,
                // Table-level `filterable` was never passed to the old <ReactTable> below (v6
                // defaults filtering off unless a column opts in) -- explicit `false` here and on
                // start/end/next preserves that "no filter row" look under TanStackGrid, whose own
                // per-column default is filterable-on.
                filterable: false,
            },
            {
                id: "start",
                Header: t("planning:seasonsList.columns.start"),
                accessor: (d) => d.start,
                Cell: (props) => {
                    return props.original.start_formatted;
                },
                filterable: false,
            },
            {
                id: "end",
                Header: t("planning:seasonsList.columns.end"),
                accessor: (d) => d.end,
                Cell: (props) => {
                    return props.original.end_formatted;
                },
                filterable: false,
            },
            {
                id: "is_current",
                Header: t("planning:seasonsList.columns.status"),
                accessor: (d) => d.is_current,
                Cell: (props) => {
                    if (props.original.is_current) {
                        return (
                            <div style={{ textAlign: "center" }}>
                                <span
                                    style={{
                                        backgroundColor: "#27ae60",
                                        color: "white",
                                        padding: "6px 12px",
                                        borderRadius: "4px",
                                        fontSize: "12px",
                                        fontWeight: "bold",
                                        display: "inline-block",
                                    }}
                                >
                                    <i className="fas fa-check-circle"></i>{" "}
                                    {t("planning:seasonsList.active")}
                                </span>
                            </div>
                        );
                    }

                    return (
                        <div style={{ textAlign: "center" }}>
                            <button
                                className="btn btn-xs btn-info"
                                onClick={() =>
                                    this.switchToSeason(props.original.id)
                                }
                            >
                                <i className="fas fa-play-circle"></i>{" "}
                                {t("planning:seasonsList.activate")}
                            </button>
                        </div>
                    );
                },
                sortable: false,
                filterable: false,
            },
            {
                id: "next",
                Header: t("planning:seasonsList.columns.next"),
                accessor: (d) => (d.next_season_id ? d.next_season.label : "-"),
                filterable: false,
            },
            // {
            //     id: "is_off",
            //     Header: "Archivée ?",
            //     accessor: d => d.is_off ? "oui" : "non",
            //     sortable: false,
            //     filterable: false,
            // },
            {
                id: "actions",
                Header: t("planning:seasonsList.columns.actions"),
                Cell: (props) => {
                    return (
                        <div>
                            <a
                                href={`/seasons/${props.original.id}/edit`}
                                className="m-r-sm"
                            >
                                <button className="btn btn-xs btn-primary ">
                                    <i className="fas fa-edit" />
                                    &nbsp; {t("common:actions.edit")}
                                </button>
                            </a>
                            {/*<button*/}
                            {/*    className="btn btn-xs btn-warning"*/}
                            {/*    onClick={() =>*/}
                            {/*        this.deleteSeason(props.original.id)*/}
                            {/*    }*/}
                            {/*>*/}
                            {/*    <i className="fas fa-trash" />*/}
                            {/*</button>*/}

                            <RemoveComponent
                                classname="season"
                                id={props.original.id}
                                btnProps={{
                                    className: "btn btn-xs btn-warning",
                                }}
                                onSuccess={(data) => {
                                    const previous = this.state.seasons.find(
                                        (s) =>
                                            s.next_season_id ==
                                            props.original.id
                                    );

                                    if (previous) {
                                        previous.next_season_id = null;
                                        previous.next_season = null;
                                    }

                                    this.setState({
                                        seasons: this.state.seasons.filter(
                                            (c) => c.id !== props.original.id
                                        ),
                                    });

                                    swal.fire({
                                        title: t(
                                            "planning:seasonsList.deleteSuccessTitle"
                                        ),
                                        text: t(
                                            "planning:seasonsList.deleteSuccessText"
                                        ),
                                        icon: "success",
                                    });
                                }}
                            >
                                <i className="fas fa-trash" />
                            </RemoveComponent>
                        </div>
                    );
                },
                sortable: false,
                filterable: false,
            },
        ];

        return (
            <div>
                <SeasonActivationModal
                    ref={this.state.modalRef}
                    onSuccess={this.onActivationSuccess}
                />
                <TanStackGrid
                    tableName="seasons-list"
                    manual={false}
                    data={this.state.seasons}
                    loading={false}
                    pages={null}
                    columns={columns}
                    defaultSorted={[{ id: "start", desc: true }]}
                    minRows={1}
                />
            </div>
        );
    }
}

export default withTranslation("planning")(SeasonsList);
