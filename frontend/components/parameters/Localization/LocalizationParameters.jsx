import React, {Fragment, useEffect, useState} from "react";
import * as api from "../../../tools/api";
import swal from "sweetalert2";
import {useTranslation} from "react-i18next";

const LOCALE_LABELS = {
    fr: "Français",
    en: "English",
};

export default function LocalizationParameters() {
    const {t} = useTranslation("parameters");
    const [isLoading, setIsLoading] = useState(true);
    const [supportedLocales, setSupportedLocales] = useState([]);
    const [defaultLanguage, setDefaultLanguage] = useState("fr");
    const [availableLanguages, setAvailableLanguages] = useState([]);

    useEffect(() => {
        api.set()
            .success((data) => {
                setSupportedLocales(data.supportedLocales || []);
                setDefaultLanguage(data.defaultLanguage || "fr");
                setAvailableLanguages(data.availableLanguages || []);
                setIsLoading(false);
            })
            .error(() => {
                setIsLoading(false);
                swal({
                    title: t("shared.loadParamsError"),
                    type: "error",
                });
            })
            .get("/parameters/localization_parameters/show", {});
    }, []);

    const toggleAvailableLanguage = (locale) => {
        setAvailableLanguages((current) => {
            const next = current.includes(locale)
                ? current.filter((l) => l !== locale)
                : [...current, locale];

            // Keep the default-language select pointed at something still available, rather
            // than letting it silently end up on a locale the admin just unchecked.
            if (!next.includes(defaultLanguage)) {
                setDefaultLanguage(next[0] || "");
            }

            return next;
        });
    };

    const onSubmit = () => {
        if (!availableLanguages.includes(defaultLanguage)) {
            swal({
                title: t("localization.defaultMustBeAvailable"),
                type: "error",
            });
            return;
        }

        api.set()
            .useLoading()
            .success(() => {
                swal({title: t("shared.saveSuccess"), type: "success"});
            })
            .error(() => {
                swal({title: t("shared.saveError"), type: "error"});
            })
            .post(
                "/parameters/localization_parameters/update",
                {default_language: defaultLanguage, available_languages: availableLanguages},
                {}
            );
    };

    if (isLoading) {
        return <div>{t("common:loading")}</div>;
    }

    return (
        <Fragment>
            <div className="row">
                <div className="col-md-5">
                    <h3>{t("localization.availableHeading")}</h3>
                    <p>{t("localization.availableHint")}</p>
                    {supportedLocales.map((locale) => (
                        <div className="form-group form-check" key={locale}>
                            <input
                                type="checkbox"
                                className="form-check-input"
                                id={`available-language-${locale}`}
                                checked={availableLanguages.includes(locale)}
                                onChange={() => toggleAvailableLanguage(locale)}
                            />
                            <label
                                className="form-check-label"
                                htmlFor={`available-language-${locale}`}
                            >
                                {LOCALE_LABELS[locale] || locale.toUpperCase()}
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="row mt-3">
                <div className="col-md-5">
                    <h3>{t("localization.defaultHeading")}</h3>
                    <div className="form-group mb-3">
                        <select
                            className="form-control"
                            value={defaultLanguage}
                            onChange={(event) => setDefaultLanguage(event.target.value)}
                        >
                            {availableLanguages.map((locale) => (
                                <option key={locale} value={locale}>
                                    {LOCALE_LABELS[locale] || locale.toUpperCase()}
                                </option>
                            ))}
                        </select>
                        <p className="mt-3">
                            {t("localization.defaultHint")}
                        </p>
                    </div>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col-md-5 text-right">
                    <button className="btn btn-primary" onClick={onSubmit}>
                        {t("common:actions.save")}
                    </button>
                </div>
            </div>
        </Fragment>
    );
}
