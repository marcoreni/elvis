import React from "react";
import placeholderPack from "../../../images/placeholder_pack.png";
import { useTranslation } from "react-i18next";

export default function placeholderCard({ user }) {
    const { t } = useTranslation("activityApplications");

    return (
        <div className="card placeholder-card my-3 mx-3">
            <img
                className="img-fluid"
                style={{ height: "100%", width: "100%", borderRadius: "5px" }}
                src={placeholderPack}
                alt={t("activityApplications:packs.card.cardImageAlt")}
            />
            <div className="image-overlay">
                <div className="overlay-text-container">
                    <h2 className="overlay-text font-bold">
                        {t(
                            "activityApplications:packs.placeholder.notEnrolledYet"
                        )}
                    </h2>
                    <p className="overlay-text">
                        {t(
                            "activityApplications:packs.placeholder.description"
                        )}
                    </p>
                </div>
                <a
                    className="card-banner-bottom background-lightred animated fadeIn"
                    style={{ borderRadius: "0 0 5px 5px" }}
                    href={"/inscriptions/new?user_id=" + user.id}
                >
                    <div className="text-white font-bold pl-4">
                        {t("activityApplications:packs.placeholder.enrolCta")}
                        <span className="pull-right pr-3"> &gt; </span>
                    </div>
                </a>
            </div>
        </div>
    );
}
