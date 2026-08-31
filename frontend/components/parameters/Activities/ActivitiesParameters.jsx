import BaseParameters from "../BaseParameters";
import React, {Fragment} from "react";
import {useTranslation} from "react-i18next";
import PricingCategoriesEdit from "./PricingCategoriesEdit";

export default function ActivitiesParameters()
{
    const {t} = useTranslation("parameters");

    return (
        <Fragment>
            <div className="row wrapper border-bottom white-bg page-heading m-b-md">
                <h2>
                    {t("activities.heading")}
                </h2>
            </div>

            <BaseParameters
                tabsNames={[t("activities.tabs.pricingCategories")]}
                divObjects={[
                    <PricingCategoriesEdit />
                ]}
            />
        </Fragment>
    );
}


/*****************************************************
* DEPRECATED / Moved to PaymentsParameters.js
*****************************************************/
