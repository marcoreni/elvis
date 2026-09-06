import React, { Component, Fragment } from "react";
import _ from "lodash";
import { withTranslation } from "react-i18next";
import Select from "react-select";
import makeAnimated from "react-select/animated";
import ReactTable from "react-table";
import Modal from "react-modal";
import { Field, Form } from "react-final-form";
import { required } from "../../tools/validators";
import Input from "../common/Input";
import { csrfToken } from "../utils";
import swal from "sweetalert2";

const requestData = (pageSize, page, sorted, filtered, format) => {
    return fetch(`/events_rules/list${format ? "." + format : ""}`, {
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
};

class EventsRules extends Component {
    constructor(props) {
        super(props);

        this.state = {
            data: [],
            pages: null,
            sorted: "",
            loading: false,
            filter: {},
            isRuleModalOpen: false,
            isModifyRuleModalOpen: false,
            label: "",
            selected: null,
            initialValues: {
                id: null,
                event: "",
                name: "",
                sendSMS: false,
                sendMail: false,
                templateName: "",
                selectedActions: [],
            },
        };

        this.fetchData = this.fetchData.bind(this);
        this.onSubmit = this.onSubmit.bind(this);
        this.onUpdateSubmit = this.onUpdateSubmit.bind(this);
        this.openModifyRuleModal = this.openModifyRuleModal.bind(this);
    }

    fetchData(state) {
        this.setState({ loading: true, filter: state });

        requestData(state.pageSize, state.page, state.sorted, state.filtered)
            .then(response => response.json())
            .then(data => {
                const res = {
                    data: data.rules,
                    pages: data.pages,
                    total: data.total,
                };

                return res;
            })
            .then(res => {
                this.setState({
                    ...res,
                    loading: false,
                });
            });
    }

    openRuleModal() {
        this.setState({ isRuleModalOpen: true });
    }

    closeRuleModal() {
        this.setState({ isRuleModalOpen: false });
    }

    openModifyRuleModal(event) {
        console.log(event);

        let i;
        if (event.templateName != null && event.templateName != "null") {
            i = _.findIndex(this.props.templateNames, {
                value: JSON.parse(event.templateName).value,
            });
        }

        let selectedActions = [];

        event.sendSMS
            ? selectedActions.push({
                  value: "sendSMS",
                  label: "Envoyer un SMS",
              })
            : null;

        event.sendMail
            ? selectedActions.push({
                  value: "sendMail",
                  label: "Envoyer un Mail",
              })
            : null;

        this.setState({
            isModifyRuleModalOpen: true,
            initialValues: {
                id: event.id,
                event: JSON.parse(event.event).label,
                name: event.name,
                sendSMS: event.sendSMS,
                sendMail: event.sendMail,
                templateName: event.templateName
                    ? this.props.templateNames[i]
                    : "",
                sendTo: event.carbon_copy ? JSON.parse(event.carbon_copy) : "",
                selectedActions: selectedActions,
            },
        });
    }

    closeModifyRuleModal() {
        this.setState({ isModifyRuleModalOpen: false });
    }

    onSubmit(e) {
        const { t } = this.props;
        if (e.event !== undefined && e.action !== undefined) {
            let alreadyExists = false;

            this.state.data.forEach((template, index) => {
                if (JSON.parse(template.event).value === e.event.value)
                    alreadyExists = true;
            });

            if (!alreadyExists) {
                fetch(`/events_rules/`, {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "X-CSRF-Token": csrfToken,
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        name: e.name,
                        event: e.event,
                        action: e.action,
                    }),
                })
                    .then(response => {
                        if (!response.ok)
                            swal(
                                t("parameters:eventsRules.toasts.errorTitle"),
                                t("parameters:eventsRules.toasts.routingError"),
                                "error"
                            );

                        return response.json();
                    })
                    .then(json => {
                        swal(
                            t("parameters:eventsRules.toasts.successTitle"),
                            t("parameters:eventsRules.toasts.ruleCreated"),
                            "success"
                        );
                        this.fetchData(this.state.filter);
                        this.closeRuleModal();
                    });
            } else {
                swal(
                    t("parameters:eventsRules.toasts.errorTitle"),
                    t("parameters:eventsRules.toasts.ruleAlreadyExists", {
                        event: e.event.label,
                    }),
                    "error"
                );
            }
        } else {
            swal(
                t("parameters:eventsRules.toasts.errorTitle"),
                t("parameters:eventsRules.toasts.missingFields"),
                "error"
            );
        }
    }

    onUpdateSubmit(e) {
        const { t } = this.props;
        fetch(`/events_rules/` + e.id, {
            method: "PATCH",
            credentials: "same-origin",
            headers: {
                "X-CSRF-Token": csrfToken,
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                id: e.id,
                name: e.name,
                event: e.event,
                templateName: e.template,
                action: e.action,
                sendMail: e.sendMail,
                sendSMS: e.sendSMS,
                sendTo: e.sendTo,
            }),
        })
            .then(response => {
                if (!response.ok)
                    swal(
                        t("parameters:eventsRules.toasts.errorTitle"),
                        t("parameters:eventsRules.toasts.routingError"),
                        "error"
                    );

                return response.json();
            })
            .then(json => {
                swal(
                    t("parameters:eventsRules.toasts.successTitle"),
                    t("parameters:eventsRules.toasts.ruleUpdated"),
                    "success"
                );
                this.fetchData(this.state.filter);
                this.closeModifyRuleModal();
            });
    }

    DeleteRulesProcess(e, id) {
        const { t } = this.props;
        e.preventDefault();
        swal({
            title: t("parameters:eventsRules.deleteConfirm"),
            type: "warning",
            confirmButtonText: t("parameters:eventsRules.deleteYes"),
            cancelButtonText: t("common:actions.cancel"),
            showCancelButton: true,
        }).then(a => {
            if (a.value) {
                fetch(`/events_rules/` + id, {
                    method: "DELETE",
                    credentials: "same-origin",
                    headers: {
                        "X-CSRF-Token": csrfToken,
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        id: id,
                    }),
                }).then(response => {
                    if (!response.ok)
                        swal(
                            t("parameters:eventsRules.toasts.errorTitle"),
                            t("parameters:eventsRules.toasts.routingError"),
                            "error"
                        );

                    this.fetchData(this.state.filter);
                    swal(
                        t("parameters:eventsRules.toasts.successTitle"),
                        t("parameters:eventsRules.toasts.ruleDeleted"),
                        "success"
                    );
                });
            }
        });
    }

    render() {
        const { t } = this.props;
        const { data, pages, loading } = this.state;
        const animatedComponents = makeAnimated();

        const columns = [
            {
                id: "ruleName",
                Header: t("parameters:eventsRules.columns.name"),
                accessor: "name",
            },
            {
                id: "eventName",
                Header: t("parameters:eventsRules.columns.event"),
                accessor: event => {
                    return (
                        <a onClick={() => this.openModifyRuleModal(event)}>
                            {JSON.parse(event.event).label}
                        </a>
                    );
                },
            },
            {
                id: "actions",
                Header: t("parameters:eventsRules.columns.actions"),
                Cell: props => {
                    return (
                        <div className="btn-wrapper text-center">
                            {props.original.sendMail ? (
                                props.original.templateName &&
                                props.original.templateName != "null" ? (
                                    <a
                                        className="btn btn-sm btn-primary m-r-sm mb-3"
                                        href={
                                            props.original.templateName &&
                                            props.original.templateName !=
                                                "null"
                                                ? "/notification_templates/edit/" +
                                                  JSON.parse(
                                                      props.original
                                                          .templateName
                                                  ).value +
                                                  "?event=" +
                                                  JSON.parse(
                                                      props.original.event
                                                  ).value
                                                : ""
                                        }
                                    >
                                        <i className="fas fa-edit" /> Mail
                                    </a>
                                ) : (
                                    <a
                                        className="btn btn-primary btn-sm m-r-sm mb-3"
                                        disabled={true}
                                    >
                                        <i className="fas fa-edit" /> Mail
                                    </a>
                                )
                            ) : (
                                ""
                            )}

                            {props.original.sendSMS ? (
                                <a
                                    className="btn btn-sm btn-warning m-r-sm mb-3 disabled"
                                    // onClick={(e) => this.handleSMSProcess(e, props.original.id)}
                                >
                                    <i className="fas fa-edit" /> SMS
                                </a>
                            ) : (
                                ""
                            )}

                            <a
                                className="btn btn-sm btn-danger mb-3"
                                onClick={e =>
                                    this.DeleteRulesProcess(
                                        e,
                                        props.original.id
                                    )
                                }
                            >
                                <i className="fas fa-times" />
                            </a>
                        </div>
                    );
                },
                sortable: false,
                filterable: false,
                width: 300,
            },
        ];

        const events = [
            {
                value: "user_created",
                label: t("parameters:eventsRules.events.user_created"),
            },
            {
                value: "activity_accepted",
                label: t("parameters:eventsRules.events.activity_accepted"),
            },
            {
                value: "activity_assigned",
                label: t("parameters:eventsRules.events.activity_assigned"),
            },
            {
                value: "application_created",
                label: t("parameters:eventsRules.events.application_created"),
            },
        ];

        const actions = [
            {
                value: "sendSMS",
                label: t("parameters:eventsRules.actions.sendSMS"),
            },
            {
                value: "sendMail",
                label: t("parameters:eventsRules.actions.sendMail"),
            },
        ];

        const sendOptions = [
            {
                value: "is_admin",
                label: t("parameters:eventsRules.sendOptions.is_admin"),
            },
            {
                value: "is_teacher",
                label: t("parameters:eventsRules.sendOptions.is_teacher"),
            },
            {
                value: "is_paying",
                label: t("parameters:eventsRules.sendOptions.is_paying"),
            },
        ];

        const ReactSelectAdapter = ({ input, ...rest }) => (
            <Select {...input} {...rest} searchable required />
        );

        return (
            <Fragment>
                <div className="row">
                    <div className="col-12">
                        <div className="col-8 margin-auto">
                            <ReactTable
                                id="templateTable"
                                data={data}
                                manual
                                loading={loading}
                                onFetchData={this.fetchData}
                                columns={columns}
                                // getTrProps={(state, rowInfo) => {
                                //     if (rowInfo && rowInfo.row) {
                                //         return {
                                //             onClick: (e) => {
                                //                 this.setState({
                                //                     selected: rowInfo.original.id,
                                //                     isModifyRuleModalOpen : true
                                //                 })
                                //             },
                                //         }
                                //     } else {
                                //         return {}
                                //     }
                                // }}
                                resizable={false}
                                showPagination={false}
                                previousText={t(
                                    "common:reactTable.previousText"
                                )}
                                nextText={t("common:reactTable.nextText")}
                                loadingText={t("common:reactTable.loadingText")}
                                noDataText={t("common:reactTable.noDataText")}
                                pageText={t("common:reactTable.pageText")}
                                ofText={t("common:reactTable.ofText")}
                                rowsText={t("common:reactTable.rowsText")}
                                minRows={1}
                            />
                            <div className="pull-right mt-3">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => this.openRuleModal()}
                                >
                                    {t("parameters:eventsRules.addRule")}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <Modal
                    isOpen={this.state.isRuleModalOpen}
                    onRequestClose={() => this.closeRuleModal()}
                    className="modal-body"
                    ariaHideApp={false}
                    contentLabel={t("parameters:eventsRules.addContentLabel")}
                >
                    <h2 className="modal-header">
                        {t("parameters:eventsRules.addRuleTitle")}
                    </h2>
                    <div className="content">
                        <div className="form-group">
                            <Form
                                onSubmit={this.onSubmit}
                                render={({ handleSubmit }) => (
                                    <form
                                        onSubmit={handleSubmit}
                                        className="p-lg"
                                    >
                                        <div className="row justify-content-center">
                                            <div className="pl-4 col-12">
                                                <Field
                                                    label={t(
                                                        "parameters:eventsRules.nameLabel"
                                                    )}
                                                    name="name"
                                                    type="text"
                                                    validate={required}
                                                    required
                                                    render={Input}
                                                />
                                            </div>

                                            <div>
                                                <label className="ml-4 mt-3">
                                                    {t(
                                                        "parameters:eventsRules.addConditionLabel"
                                                    )}
                                                </label>
                                                <Field
                                                    name="event"
                                                    component={
                                                        ReactSelectAdapter
                                                    }
                                                    options={events}
                                                    className="col-12"
                                                />
                                            </div>

                                            <div>
                                                <label className="ml-4 mt-5">
                                                    {t(
                                                        "parameters:eventsRules.addActionLabel"
                                                    )}
                                                </label>
                                                <Field
                                                    className="col-12"
                                                    name="action"
                                                    component={
                                                        ReactSelectAdapter
                                                    }
                                                    options={actions}
                                                    isMulti
                                                    components={
                                                        animatedComponents
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-5">
                                            <button
                                                onClick={() =>
                                                    this.closeRuleModal()
                                                }
                                                className="btn btn-white"
                                            >
                                                {t(
                                                    "parameters:eventsRules.back"
                                                )}
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn btn-primary pull-right"
                                            >
                                                {t(
                                                    "parameters:eventsRules.confirm"
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            />
                        </div>
                    </div>
                </Modal>

                <Modal
                    isOpen={this.state.isModifyRuleModalOpen}
                    onRequestClose={() => this.closeModifyRuleModal()}
                    className="modal-body"
                    ariaHideApp={false}
                    contentLabel={t("parameters:eventsRules.addContentLabel")}
                >
                    <h2 className="modal-header">
                        {t("parameters:eventsRules.editRuleTitle")}
                    </h2>
                    <div className="content">
                        <div className="form-group">
                            <Form
                                onSubmit={this.onUpdateSubmit}
                                initialValues={this.state.initialValues}
                                render={({
                                    handleSubmit,
                                    form: { getState },
                                }) => (
                                    <form
                                        onSubmit={handleSubmit}
                                        className="p-lg"
                                    >
                                        <div className="row justify-content-center">
                                            <div className="pl-4 col-12 mt-3">
                                                <Field
                                                    label={t(
                                                        "parameters:eventsRules.conditionLabel"
                                                    )}
                                                    name="event"
                                                    render={Input}
                                                    className="col-12"
                                                    type="text"
                                                    disabled
                                                />
                                            </div>

                                            <div className="pl-4 col-12 mt-3">
                                                <Field
                                                    label={t(
                                                        "parameters:eventsRules.nameLabel"
                                                    )}
                                                    name="name"
                                                    type="text"
                                                    validate={required}
                                                    render={Input}
                                                />
                                            </div>

                                            <div>
                                                <label className="ml-4">
                                                    {t(
                                                        "parameters:eventsRules.actionLabel"
                                                    )}
                                                </label>
                                                <Field
                                                    className="col-12"
                                                    name="action"
                                                    component={
                                                        ReactSelectAdapter
                                                    }
                                                    options={actions}
                                                    isMulti
                                                    required
                                                    components={
                                                        animatedComponents
                                                    }
                                                    defaultValue={
                                                        this.state.initialValues
                                                            .selectedActions
                                                    }
                                                />
                                            </div>

                                            <div className="mt-4">
                                                <label className="ml-4">
                                                    {t(
                                                        "parameters:eventsRules.templateLabel"
                                                    )}
                                                </label>
                                                <Field
                                                    className="col-12"
                                                    name="template"
                                                    component={
                                                        ReactSelectAdapter
                                                    }
                                                    options={
                                                        this.props.templateNames
                                                    }
                                                    components={
                                                        animatedComponents
                                                    }
                                                    defaultValue={
                                                        this.state.initialValues
                                                            .templateName
                                                    }
                                                />
                                            </div>

                                            <div className="mt-4">
                                                <label className="ml-4">
                                                    {t(
                                                        "parameters:eventsRules.sendCopyLabel"
                                                    )}
                                                </label>
                                                <Field
                                                    className="col-12"
                                                    name="sendTo"
                                                    component={
                                                        ReactSelectAdapter
                                                    }
                                                    options={sendOptions}
                                                    components={
                                                        animatedComponents
                                                    }
                                                    isMulti
                                                    defaultValue={
                                                        this.state.initialValues
                                                            .sendTo
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-5">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    this.closeModifyRuleModal()
                                                }
                                                className="btn btn-white"
                                            >
                                                {t(
                                                    "parameters:eventsRules.back"
                                                )}
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn btn-primary pull-right"
                                            >
                                                {t(
                                                    "parameters:eventsRules.confirm"
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            />
                        </div>
                    </div>
                </Modal>
            </Fragment>
        );
    }
}

export default withTranslation("parameters")(EventsRules);
