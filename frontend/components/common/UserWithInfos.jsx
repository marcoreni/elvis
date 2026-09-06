import React, { useState, Fragment } from "react";
import * as api from "../../tools/api";
import Modal from "react-modal";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { toAge } from "../../tools/format";
import _ from "lodash";

const MODAL_STYLE = {
    content: {
        margin: "auto",
        maxWidth: "600px",
        height: "600px",
        maxHeight: "720px",
    },
};

export default function UserWithInfos({ userId, children }) {
    const { t } = useTranslation("common");
    const [isOpen, setIsOpen] = useState(false);
    const [infos, setInfos] = useState(null);

    const handleOpenInfos = () => {
        setIsOpen(true);

        api.set()
            .error(toast.error)
            .success(setInfos)
            .get(`/users/${userId}/infos`);
    };

    const payingForMembers =
        infos &&
        infos.family_links_with_user.filter(
            fm => fm.is_inverse && fm.is_paying_for
        );
    const legalReferentMembers =
        infos &&
        infos.family_links_with_user.filter(
            fm => fm.is_inverse && fm.is_legal_referent
        );
    const toCallMembers =
        infos &&
        infos.family_links_with_user.filter(
            fm => fm.is_inverse && fm.is_to_call
        );

    return (
        <Fragment>
            <a onClick={() => handleOpenInfos()}>{children}</a>
            <Modal
                ariaHideApp={false}
                onRequestClose={() => setIsOpen(false)}
                style={MODAL_STYLE}
                isOpen={isOpen}
            >
                {Boolean(infos) ? (
                    <div>
                        <div className="flex flex-space-between-justified">
                            <h2>
                                {infos.first_name}{" "}
                                <strong>{infos.last_name}</strong>, &nbsp;
                                {toAge(infos.birthday)}
                            </h2>
                            <div className="flex flex-end-aligned">
                                <a
                                    data-tippy-content={t(
                                        "common:userWithInfos.profile"
                                    )}
                                    href={`/users/${infos.id}`}
                                    className="btn btn-primary m-r-sm"
                                    target="_blank"
                                >
                                    <i className="fas fa-user" />
                                </a>
                                <a
                                    data-tippy-content={t(
                                        "common:userWithInfos.payments"
                                    )}
                                    href={`/payments/summary/${infos.id}`}
                                    className="btn btn-primary"
                                    target="_blank"
                                >
                                    <i className="fas fa-euro-sign" />
                                </a>
                            </div>
                        </div>
                        <hr />
                        <div className="row">
                            <div className="col-sm-6">
                                <h3>{t("common:userWithInfos.email")}</h3>
                                <a href={`mailto:${infos.email}`}>
                                    {infos.email}
                                </a>
                            </div>
                            <div className="col-sm-6">
                                <h3>{t("common:userWithInfos.phones")}</h3>
                                {Boolean(infos.telephones.length) ? (
                                    infos.telephones.map(phone => (
                                        <p key={phone.id}>
                                            {phone.label && (
                                                <strong>
                                                    {_.capitalize(phone.label)}{" "}
                                                    :
                                                </strong>
                                            )}{" "}
                                            <a href={`tel:${phone.number}`}>
                                                {phone.number}
                                            </a>
                                        </p>
                                    ))
                                ) : (
                                    <h5>{t("common:userWithInfos.none")}</h5>
                                )}
                            </div>
                        </div>

                        <div className="member-status-icons">
                            {Boolean(toCallMembers.length) && (
                                <div className="flex m-b">
                                    <span className="round-icon is-to-call m-r-sm">
                                        <i
                                            title={t(
                                                "common:userWithInfos.toCallFirst"
                                            )}
                                            className="fas fa-phone"
                                        />
                                    </span>
                                    <p>
                                        {toCallMembers
                                            .map(
                                                m =>
                                                    `${m.first_name} ${m.last_name}`
                                            )
                                            .join(", ")}
                                    </p>
                                </div>
                            )}
                            {Boolean(payingForMembers.length) && (
                                <div className="flex m-b">
                                    <span className="round-icon is-paying m-r-sm">
                                        <i
                                            title={t(
                                                "common:userWithInfos.payer"
                                            )}
                                            className="fas fa-euro-sign"
                                        />
                                    </span>
                                    <p>
                                        {payingForMembers
                                            .map(
                                                m =>
                                                    `${m.first_name} ${m.last_name}`
                                            )
                                            .join(", ")}
                                    </p>
                                </div>
                            )}
                            {Boolean(legalReferentMembers.length) && (
                                <div className="flex">
                                    <span className="round-icon is-legal-referent m-r-sm">
                                        <i
                                            title={t(
                                                "common:userWithInfos.legalGuardian"
                                            )}
                                            className="fas fa-balance-scale"
                                        />
                                    </span>
                                    <p>
                                        {legalReferentMembers
                                            .map(
                                                m =>
                                                    `${m.first_name} ${m.last_name}`
                                            )
                                            .join(", ")}
                                    </p>
                                </div>
                            )}
                        </div>

                        {Boolean(infos.family_links_with_user.length) && (
                            <h2>{t("common:userWithInfos.family")}</h2>
                        )}
                        {infos.family_links_with_user.map((fm, i) => {
                            return (
                                <div key={fm.id}>
                                    {i !== 0 && <hr />}
                                    <div className="row">
                                        <div className="col-sm-6">
                                            <p style={{ fontSize: "1.3em" }}>
                                                {fm.first_name}{" "}
                                                <strong>{fm.last_name}</strong>{" "}
                                                <a
                                                    href={`/users/${fm.id}`}
                                                    target="_blank"
                                                >
                                                    <i className="fas fa-external-link-alt"></i>
                                                </a>
                                            </p>
                                            {!fm.is_inverse && (
                                                <div className="member-status-icons flex">
                                                    <span
                                                        className={`round-icon is-to-call m-r-sm ${
                                                            !fm.is_to_call
                                                                ? "disabled"
                                                                : ""
                                                        }`}
                                                    >
                                                        <i
                                                            title={t(
                                                                "common:userWithInfos.toCallFirst"
                                                            )}
                                                            className={`fa fa-phone`}
                                                        />
                                                    </span>
                                                    <span
                                                        className={`round-icon m-r-sm is-paying ${
                                                            !fm.is_paying_for
                                                                ? "disabled"
                                                                : ""
                                                        }`}
                                                    >
                                                        <i
                                                            title={t(
                                                                "common:userWithInfos.payer"
                                                            )}
                                                            className={`fa fa-euro-sign`}
                                                        />
                                                    </span>
                                                    <span
                                                        className={`round-icon is-legal-referent ${
                                                            !fm.is_legal_referent
                                                                ? "disabled"
                                                                : ""
                                                        }`}
                                                    >
                                                        <i
                                                            title={t(
                                                                "common:userWithInfos.legalGuardian"
                                                            )}
                                                            className={`fa fa-balance-scale`}
                                                        />
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="col-sm-6">
                                            <h4>
                                                {t(
                                                    "common:userWithInfos.email"
                                                )}
                                            </h4>
                                            <a href={`mailto:${fm.email}`}>
                                                {fm.email}
                                            </a>
                                            <h4>
                                                {t(
                                                    "common:userWithInfos.phones"
                                                )}
                                            </h4>
                                            {Boolean(fm.telephones.length) ? (
                                                fm.telephones.map(phone => (
                                                    <p key={phone.id}>
                                                        {phone.label && (
                                                            <strong>
                                                                {_.capitalize(
                                                                    phone.label
                                                                )}{" "}
                                                                :
                                                            </strong>
                                                        )}{" "}
                                                        <a
                                                            href={`tel:${phone.number}`}
                                                        >
                                                            {phone.number}
                                                        </a>
                                                    </p>
                                                ))
                                            ) : (
                                                <h5>
                                                    {t(
                                                        "common:userWithInfos.none"
                                                    )}
                                                </h5>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <h3>{t("common:loading")}</h3>
                )}
            </Modal>
        </Fragment>
    );
}
