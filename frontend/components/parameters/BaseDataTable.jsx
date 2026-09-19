import React, { Component, Fragment } from "react";
import { csrfToken } from "../utils";
import i18n from "../../i18n";
import TanStackGrid from "../common/baseDataTable/TanStackGrid";

// `BaseDataTable` is a base class extended by ~12 CRUD tables (`class X extends BaseDataTable`),
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
export default class BaseDataTable extends Component {
    constructor(props) {
        super(props);

        this.state = {
            data: [],
            pages: null,
            loading: true,
            filter: {},
            tableState: {},
        };

        this.fetchData = this.fetchData.bind(this);
    }

    fetchData(filter) {
        this.setState({ loading: true, filter, tableState: filter });

        this.requestData
            .call(
                this,
                filter.pageSize,
                filter.page,
                filter.sorted,
                filter.filtered
            )
            .then((response) => response.json())
            .then((data) => {
                return {
                    // TanStackGrid assumes an array (reads .length); fall back defensively rather
                    // than propagate a malformed/empty response into a render-time crash.
                    data: data.status || [],
                    pages: data.pages,
                    total: data.total,
                };
            })
            .then((res) => {
                this.setState({
                    ...res,
                    loading: false,
                });
            });
    }

    requestData(pageSize, page, sorted, filtered, format) {
        return fetch(`${this.props.urlListData}${format ? "." + format : ""}`, {
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

    render() {
        const { data, pages, loading } = this.state;

        return (
            <Fragment>
                <div className="row">
                    <div className="col">
                        <a
                            className="btn btn-success pull-right"
                            href={this.props.urlNew}
                        >
                            <i className="fas fa-plus"></i>{" "}
                            {i18n.t("common:actions.create")}
                        </a>
                    </div>
                </div>
                <div className="row">
                    <div className="col">
                        <TanStackGrid
                            tableName={
                                "table-" +
                                (this.props.urlListData || "parameters")
                            }
                            columns={this.state.columns}
                            data={data}
                            loading={loading}
                            pages={pages}
                            onFetchData={this.fetchData}
                            defaultSorted={[{ id: "id", desc: true }]}
                        />
                    </div>
                </div>
            </Fragment>
        );
    }
}
