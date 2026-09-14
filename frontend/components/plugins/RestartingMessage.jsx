import React from "react";
import { useTranslation } from "react-i18next";

export default function RestartingMessage() {
    const { t } = useTranslation("plugins");

    return (
        <div className="w-100">
            <h1 className="text-center">
                {t("restarting.title")}
                <div
                    className="sk-spinner sk-spinner-fading-circle m-n"
                    style={{
                        display: "inline-block",
                    }}
                >
                    <div className="sk-circle1 sk-circle"></div>
                    <div className="sk-circle3 sk-circle"></div>
                    <div className="sk-circle4 sk-circle"></div>
                    <div className="sk-circle5 sk-circle"></div>
                    <div className="sk-circle6 sk-circle"></div>
                    <div className="sk-circle7 sk-circle"></div>
                    <div className="sk-circle8 sk-circle"></div>
                    <div className="sk-circle9 sk-circle"></div>
                    <div className="sk-circle10 sk-circle"></div>
                    <div className="sk-circle11 sk-circle"></div>
                    <div className="sk-circle12 sk-circle"></div>
                </div>
            </h1>
            <p>{t("restarting.duration")}</p>
            <p>{t("restarting.autoReload")}</p>
        </div>
    );
}
