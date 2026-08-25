import React, {Fragment, useEffect, useState} from "react";
import * as api from "../../../tools/api";
import swal from "sweetalert2";

const LOCALE_LABELS = {
    fr: "Français",
    en: "English",
};

export default function LocalizationParameters() {
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
                swal({
                    title: "Erreur lors du chargement des paramètres",
                    type: "error",
                });
            })
            .get("/parameters/localization_parameters/show", {});
    }, []);

    const toggleAvailableLanguage = (locale) => {
        setAvailableLanguages((current) =>
            current.includes(locale)
                ? current.filter((l) => l !== locale)
                : [...current, locale]
        );
    };

    const onSubmit = () => {
        if (!availableLanguages.includes(defaultLanguage)) {
            swal({
                title: "La langue par défaut doit faire partie des langues disponibles",
                type: "error",
            });
            return;
        }

        api.set()
            .useLoading()
            .success(() => {
                swal({title: "Sauvegarde effectuée", type: "success"});
            })
            .error(() => {
                swal({title: "Erreur lors de la sauvegarde", type: "error"});
            })
            .post(
                "/parameters/localization_parameters/update",
                {default_language: defaultLanguage, available_languages: availableLanguages},
                {}
            );
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <Fragment>
            <div className="row">
                <div className="col-md-5">
                    <h3>Langues disponibles</h3>
                    <p>Les langues proposées aux utilisateurs de cette installation.</p>
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
                    <h3>Langue par défaut</h3>
                    <div className="form-group mb-3">
                        <select
                            className="form-control"
                            value={defaultLanguage}
                            onChange={(event) => setDefaultLanguage(event.target.value)}
                        >
                            {supportedLocales.map((locale) => (
                                <option key={locale} value={locale}>
                                    {LOCALE_LABELS[locale] || locale.toUpperCase()}
                                </option>
                            ))}
                        </select>
                        <p className="mt-3">
                            Langue utilisée par défaut pour les invités et les nouveaux comptes.
                        </p>
                    </div>
                </div>
            </div>

            <div className="row mt-3">
                <div className="col-md-5 text-right">
                    <button className="btn btn-primary" onClick={onSubmit}>
                        Enregistrer
                    </button>
                </div>
            </div>
        </Fragment>
    );
}
