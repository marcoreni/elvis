import React from "react";
import { withTranslation } from "react-i18next";
import { initializeElasticPlugin, initializeLang } from "./utils.js";
import { csrfToken } from "../utils";
import _ from "lodash";

const initializeQueryBuilder = (element, t) => {
    const filters = [
        {
            id: "first_name",
            label: t("users:userForm.fields.firstName"),
            type: "string",
            operators: ["equal", "not_equal"],
        },
        {
            id: "last_name",
            label: t("users:userForm.fields.lastName"),
            type: "string",
            operators: ["equal", "not_equal"],
        },
        {
            id: "age",
            label: t("users:advancedSearch.age"),
            type: "integer",
            operators: [
                "equal",
                "not_equal",
                "between",
                "not_between",
                "greater",
                "greater_or_equal",
                "less",
                "less_or_equal",
            ],
        },
        {
            id: "sex",
            label: t("users:userForm.fields.sex"),
            type: "string",
            input: "checkbox",
            values: {
                m: t("users:userForm.sexes.M"),
                f: t("users:userForm.sexes.F"),
                a: t("users:userForm.sexes.A"),
            },
            operators: ["in", "not_in"],
        },
        {
            id: "handicap",
            label: t("users:advancedSearch.handicap"),
            type: "boolean",
            input: "radio",
            values: {
                true: t("users:advancedSearch.yes"),
                false: t("users:advancedSearch.no"),
            },
            operators: ["equal", "not_equal"],
        },
    ];

    $(element).queryBuilder({
        filters,
        lang_code: "fr",
        icons: {
            add_group: "fas fa-plus",
            add_rule: "fas fa-plus",
            remove_group: "fas fa-times",
            remove_rule: "fas fa-times",
            error: "fas fa-exclamation-triangle",
        },
        plugins: {
            sortable: null,
        },
    });
};

class AdvancedSearch extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            rules: {},
            results: [],
            count: 0,
        };
    }

    componentDidMount() {
        initializeElasticPlugin();
        initializeLang();
        initializeQueryBuilder(this.queryBuilder, this.props.t);
    }

    componentWillUnmount() {
        $(this.queryBuilder).queryBuilder("destroy");
    }

    shouldComponentUpdate() {
        return false;
    }

    handleSetRulesClick() {
        const newRules = { ...defaultRules };
        newRules.rules[0].value = newRules.rules[0].value + 10;
        $(this.queryBuilder).queryBuilder("setRules", newRules);
        this.setState({ rules: newRules });
    }

    handleGetRulesClick() {
        const rules = $(this.queryBuilder).queryBuilder("getESBool");

        fetch("/advanced_query", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "X-CSRF-Token": csrfToken,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ query: rules }),
        })
            .then(response => response.json())
            .then(results => {
                this.setState({
                    rules,
                    results: results.results,
                    count: results.count,
                });
                this.forceUpdate();
            });
    }

    render() {
        const { t } = this.props;
        return (
            <React.Fragment>
                <div className="row wrapper border-bottom white-bg page-heading m-b-md">
                    <h2>{t("users:advancedSearch.title")}</h2>
                </div>
                <div
                    className="query-container"
                    style={{
                        backgroundColor: "white",
                        padding: "20px 10px",
                        marginBottom: 20,
                    }}
                >
                    <div
                        id="query-builder"
                        ref={div => (this.queryBuilder = div)}
                    />
                </div>
                <button
                    className="btn btn-success"
                    onClick={this.handleGetRulesClick.bind(this)}
                >
                    GET Query
                </button>
                <pre>
                    {this.state.count} Results:
                    <ul>
                        {_.map(this.state.results, (r, i) => (
                            <li key={i}>
                                {r.adherent_number} {r.first_name} {r.last_name}
                            </li>
                        ))}
                    </ul>
                </pre>
                <pre>
                    Query:
                    {JSON.stringify(this.state.rules, undefined, 2)}
                </pre>
            </React.Fragment>
        );
    }
}

export default withTranslation("users")(AdvancedSearch);
