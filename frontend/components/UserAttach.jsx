import React from "react";
import { withTranslation } from "react-i18next";
import swal from "sweetalert2";
import ReactTable from "react-table";
import { csrfToken } from "./utils";
import { makeDebounce } from "../tools/inputs";
import DetachAccount from "./DetachAccount";
import Modal from "react-modal";

import moment from "moment";

const requestData = (pageSize, page, sorted, filtered, format) => {
    return fetch(`/users/list${format ? "." + format : ""}`, {
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

const debounce = makeDebounce();

class UserAttach extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            attached_users: [],
            data: [],
            pages: null,
            loading: false,
            filter: {},
            selected: [],
            no_data_text: props.t("users:userAttach.searchPrompt"),
        };

        this.fetchAttachedUsers = this.fetchAttachedUsers.bind(this);
        this.fetchUsers = this.fetchUsers.bind(this);
        this.selectUserToAttach = this.selectUserToAttach.bind(this);
        this.postAttachUsers = this.postAttachUsers.bind(this);
        this.fetchReferentUser = this.fetchReferentUser.bind(this);
        this.loadAttachedUsers = this.loadAttachedUsers.bind(this);
    }

    async swalShowLoading() {
        swal({
            showConfirmButton: false,
            allowOutsideClick: false,
            allowEscapeKey: false,
            onOpen: () => swal.showLoading(),
        });
    }

    async fetchReferentUser(ref_user_id) {
        const res = await fetch("/users/" + ref_user_id + "/infos");
        const data = await res.json();
        return data;
    }

    async selectUserToAttach(user) {
        const { t } = this.props;

        this.swalShowLoading();

        const attached_users = await this.fetchAttachedUsers(user.id);

        const userName = `${user.first_name} ${user.last_name}`;
        const targetName = `${this.props.user.first_name} ${this.props.user.last_name}`;

        if (attached_users.length < 1) {
            if (user.attached_to_id) {
                //si compte déjà rattaché
                const referent_user = await this.fetchReferentUser(
                    user.attached_to_id
                );
                swal.hideLoading();

                swal({
                    type: "warning",
                    html: t("users:userAttach.alreadyAttachedHtml", {
                        name: userName,
                        referent: `${referent_user.first_name} ${referent_user.last_name}`,
                        target: targetName,
                    }),
                    cancelButtonText: t("common:actions.cancel"),
                    showCancelButton: !swal.isLoading(),
                    showLoaderOnConfirm: true,
                    allowOutsideClick: () => !swal.isLoading(),
                    preConfirm: async () => {
                        await this.postAttachUsers([user]);
                    },
                });
            } else {
                swal.hideLoading();

                swal({
                    type: "info",
                    html: t("users:userAttach.confirmAttachHtml", {
                        name: userName,
                        target: targetName,
                    }),
                    cancelButtonText: t("common:actions.cancel"),
                    showCancelButton: !swal.isLoading(),
                    showLoaderOnConfirm: true,
                    allowOutsideClick: () => !swal.isLoading(),
                    preConfirm: async () => {
                        await this.postAttachUsers([user]);
                    },
                });
            }
        } else {
            // mise en forme du texte
            let a_users = [];

            for (let u of attached_users) {
                a_users.push(`<br>- <b>${u.first_name} ${u.last_name}</b>`);
            }

            let str_users = a_users.join("?");

            // préparation des données
            attached_users.unshift(user);

            swal.hideLoading();

            swal({
                type: "warning",
                title: t("users:userAttach.hasAttachedTitle"),
                html: t("users:userAttach.confirmAttachWithListHtml", {
                    name: userName,
                    list: str_users,
                    target: targetName,
                }),
                cancelButtonText: t("common:actions.cancel"),
                showCancelButton: !swal.isLoading(),
                showLoaderOnConfirm: true,
                allowOutsideClick: () => !swal.isLoading(),
                preConfirm: async () => {
                    await this.postAttachUsers(attached_users);
                },
            });
        }
    }

    async postAttachUsers(users_to_attach) {
        const { t } = this.props;

        const res = await fetch("/users/" + this.props.user.id + "/attach", {
            method: "PUT",
            headers: {
                "X-Csrf-Token": csrfToken,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                users: users_to_attach,
            }),
        });

        if (res.ok) {
            return swal({
                type: "success",
                title: t("users:userAttach.attachSuccess"),
            }).then(() => this.loadAttachedUsers());
        } else {
            return swal({
                type: "error",
                title: t("users:userAttach.attachError"),
                html: `${res.status}<br>${res.statusText}<br>`,
            });
        }
    }

    async fetchAttachedUsers(referent_user_id) {
        const res = await fetch(
            "/users/" + referent_user_id + "/get_attached_users"
        );
        const data = await res.json();
        return data.attached_users;
    }

    async loadAttachedUsers() {
        this.swalShowLoading();
        const attached_users = await this.fetchAttachedUsers(
            this.props.user.id
        );
        this.setState({ attached_users: attached_users });
        swal.close();
    }

    async fetchUsers(state) {
        // state transmis par reacttable
        const { t } = this.props;

        this.setState({ loading: true, filter: state });

        debounce(() => {
            requestData(
                state.pageSize,
                state.page,
                state.sorted,
                state.filtered
            )
                .then(response => response.json())
                .then(data => {
                    const res = {
                        data: data.users,
                        pages: data.pages,
                        total: data.total,
                    };

                    return res;
                })
                .then(res => {
                    if (state.filtered.length < 1) {
                        this.setState({
                            loading: false,
                            no_data_text: t("users:userAttach.searchPrompt"),
                            data: [],
                        });
                    } else {
                        this.setState({
                            ...res,
                            loading: false,
                            no_data_text: t("users:userAttach.noResults"),
                        });
                    }
                });
        }, 400);
    }

    componentDidMount() {
        this.loadAttachedUsers();
    }

    render() {
        const { t } = this.props;
        const events = [];

        const columns = [
            {
                Header: "ID",
                id: "id",
                accessor: d => (
                    <span className="w-100 d-flex text-dark">{d.id}</span>
                ),
                width: 75,
                sortable: false,
            },
            {
                id: "last_name",
                Header: t("users:list.table.headers.lastName"),
                sortable: false,
                accessor: d => (
                    <a
                        href={`/users/${d.id}`}
                        className="w-100 d-flex font-underlined"
                    >
                        {d.last_name}
                    </a>
                ),
            },
            {
                id: "first_name",
                Header: t("users:list.table.headers.firstName"),
                sortable: false,
                accessor: d => (
                    <a
                        href={`/users/${d.id}`}
                        className="w-100 d-flex font-underlined"
                    >
                        {d.first_name}
                    </a>
                ),
            },
            {
                Header: t("users:list.table.headers.birthday"),
                id: "birthday",
                accessor: "birthday",
                sortable: false,
                width: 150,
                Cell: props => {
                    if (props.original.birthday) {
                        return (
                            <div className="w-100 d-flex text-dark">
                                {moment(props.original.birthday).format(
                                    "DD/MM/YYYY"
                                )}
                            </div>
                        );
                    }

                    return <p />;
                },
                filterable: false,
            },
            {
                width: 200,
                id: "attached",
                Header: t("users:list.table.headers.accountType"),
                sortable: false,
                filterable: false,
                accessor: d =>
                    d.attached_to_id
                        ? t("users:list.table.accountType.attached")
                        : t("users:list.table.accountType.main"),
            },
            {
                id: "actions",
                Header: t("users:list.table.headers.actions"),
                Cell: props => {
                    let is_user = props.original.id == this.props.user.id; // si c'est l'utilisateur de la page actuelle
                    let is_attached_to_user = this.state.attached_users.find(
                        user => user.id == props.original.id
                    ); // si c'est un utilisateur déjà rattaché à celui de la page actuelle
                    return (
                        <div className="btn-wrapper">
                            <div
                                style={{
                                    display: "inline-block",
                                }}
                            >
                                {is_user || is_attached_to_user ? (
                                    <div>
                                        {is_user ? (
                                            <div>
                                                {t(
                                                    "users:userAttach.currentAccount"
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                {t(
                                                    "users:userAttach.alreadyAttachedToCurrent"
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() =>
                                            this.selectUserToAttach(
                                                props.original
                                            )
                                        }
                                        className="btn btn-xs btn-primary m-r-sm m-b-sm"
                                    >
                                        <i className="fas fa-user-friends" />
                                        &nbsp; {t("users:userAttach.attach")}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                },
                sortable: false,
                filterable: false,
            },
        ];

        return (
            <div>
                <div className="ibox">
                    <div className="ibox-title">
                        <h4>{t("users:userAttach.attachedAccountsTitle")}</h4>
                    </div>
                    <div className="ibox-content no-padding">
                        {this.state.attached_users.length > 0 ? (
                            <ul className="list-group">
                                {this.state.attached_users.map(user => (
                                    <li
                                        className="list-group-item row"
                                        key={user.id}
                                    >
                                        <div className="col-lg-4">
                                            <h4>
                                                <a href={"/users/" + user.id}>
                                                    {user.first_name}{" "}
                                                    {user.last_name}
                                                </a>
                                                &nbsp;&nbsp;
                                                <DetachAccount
                                                    user={user}
                                                    reload_data={
                                                        this.loadAttachedUsers
                                                    }
                                                ></DetachAccount>
                                            </h4>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p">
                                {t("users:userAttach.noAttachedAccounts")}
                            </div>
                        )}
                    </div>
                </div>

                <div className="ibox">
                    <div className="ibox-title">
                        <h4>{t("users:userAttach.attachAccountsTitle")}</h4>
                    </div>
                    <div className="row">
                        <div className="col-lg-12">
                            <ReactTable
                                events={events}
                                id="userTable"
                                data={this.state.data}
                                manual
                                pages={this.state.pages}
                                loading={this.state.loading}
                                onFetchData={this.fetchUsers}
                                columns={columns}
                                defaultSorted={[{ id: "id", desc: false }]}
                                filterable
                                defaultFilterMethod={(filter, row) => {
                                    if (row[filter.id] != null) {
                                        return row[filter.id]
                                            .toLowerCase()
                                            .startsWith(
                                                filter.value.toLowerCase()
                                            );
                                    }
                                }}
                                resizable={false}
                                previousText={t(
                                    "common:reactTable.previousText"
                                )}
                                nextText={t("common:reactTable.nextText")}
                                loadingText={t("common:reactTable.loadingText")}
                                noDataText={this.state.no_data_text}
                                pageText={t("common:reactTable.pageText")}
                                ofText={t("common:reactTable.ofText")}
                                rowsText={t("common:reactTable.rowsText")}
                                minRows={2}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default withTranslation("users")(UserAttach);
