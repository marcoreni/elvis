import React, {Component, Fragment} from "react";
import ReactTable from "react-table";
import {csrfToken} from "../utils";
import i18n from "../../i18n";

// `BaseDataTable` is a base class extended by ~15 CRUD tables (`class X extends BaseDataTable`),
// so it cannot be wrapped in `withTranslation()` without breaking that inheritance chain. It reads
// the i18n singleton directly instead. Consequence: these strings are resolved once at render and
// do not re-derive on `languageChanged` — currently harmless (nothing calls `i18n.changeLanguage`
// in-page; locale changes go through a server PATCH + reload), same caveat as the generalPayments
// tables noted in docs/KnownIssues.md.

/**
 * Il faut hériter de cette classe.
 * Elle permet de faire rapidement un tableau avec actions crud. Pour cela il faut:
 * mettre l'URL de récupération en json des données dans les propriétés de l'élément enfant sous le nom "urllistdata'
 * Modifier le state "column" pour mettre un tableau de colonne.
 */
export default class BaseDataTable extends Component
{
    constructor(props)
    {
        super(props);

        this.state = {
            data: [],
            pages: null,
            loading: true,
            filter: {},
            tableState: {},
            subComponent: null
        };
    }

    fetchData(state, instance)
    {
        this.setState({ loading: true, filter: state, tableState: state });

        this.requestData.call(this,
            state.pageSize,
            state.page,
            state.sorted,
            state.filtered,
        )
            .then(response => response.json())
            .then(data => {
                return {
                    data: data.status,
                    pages: data.pages,
                    total: data.total,
                };
            })
            .then(res => {
                this.setState({
                    ...res,
                    loading: false,
                });
            });
    }

    requestData(pageSize, page, sorted, filtered, format)
    {
        return fetch(`${this.props.urlListData}${format ? "." + format : ""}`,
            {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "X-CSRF-Token": csrfToken,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    pageSize,
                    page,
                    sorted: sorted[0],
                    filtered,
                }),
            });
    }

    render()
    {
        const { data, pages, loading } = this.state;

        return <Fragment>
            <div className="row">
                <div className="col">
                    <a className="btn btn-success pull-right" href={this.props.urlNew}><i className="fas fa-plus"></i> {i18n.t("common:actions.create")}</a>
                </div>
            </div>
            <div className="row">
                <div className="col">
                    <ReactTable
                        data={data}
                        manual
                        pages={pages}
                        loading={loading}
                        onFetchData={(state, instance) => this.fetchData.call(this, state, instance)}
                        columns={this.state.columns}
                        defaultSorted={[{ id: "id", desc: true }]}
                        filterable
                        defaultFilterMethod={(filter, row) => {
                            if (row[filter.id] != null) {
                                return row[filter.id]
                                    .toLowerCase()
                                    .startsWith(filter.value.toLowerCase());
                            }
                        }}
                        resizable={false}
                        previousText={i18n.t("common:reactTable.previousText")}
                        nextText={i18n.t("common:reactTable.nextText")}
                        loadingText={i18n.t("common:reactTable.loadingText")}
                        noDataText={i18n.t("common:reactTable.noDataText")}
                        pageText={i18n.t("common:reactTable.pageText")}
                        ofText={i18n.t("common:reactTable.ofText")}
                        rowsText={i18n.t("common:reactTable.rowsText")}
                        minRows={1}
                        SubComponent={this.state.subComponent}
                    />
                </div>
            </div>
        </Fragment>
    }
}