import React from "react";
import { useTranslation } from "react-i18next";
import PaymentsMethods from "./PaymentsMethods";
import BaseParameters from "../BaseParameters";
import AdhesionSettings from "./AdhesionSettings";
import EditPaymentScheduleOptions from "./EditPaymentScheduleOptions";
import Coupons from "./Coupons";
import PricingCategoriesEdit from "../Activities/PricingCategoriesEdit";

// Used to `extends BaseParameters` purely to seed its state.tabsNames/divObjects in the
// constructor -- now that BaseParameters is a function component (can't be `extends`ed), pass
// them as props directly, matching PlanningsParameters/ActivitiesParameters/etc.
export default function PaymentsParameters() {
    const { t } = useTranslation("parameters");

    return (
        <BaseParameters
            tabsNames={[
                t("payments.tabs.adhesion"),
                /*'Statuts de paiements',*/
                t("payments.tabs.paymentMethods"),
                t("payments.tabs.pricingCategories"),
                t("payments.tabs.paymentTerms"),
                t("payments.tabs.discountRate"),
            ]}
            divObjects={[
                <AdhesionSettings />,
                // caché pour le moment, plus d'intérêt dans l'immédiat (05/07/2023)
                // <PaymentsStatus
                //     urlListData="/parameters/payment_parameters/list_status"
                //     urlNew="/payment_statuses/new"
                // />,
                <PaymentsMethods
                    urlListData="/parameters/payment_parameters/list_methods"
                    urlNew="/payment_method/new"
                />,
                <PricingCategoriesEdit />,
                <EditPaymentScheduleOptions />,
                <Coupons />,
            ]}
        />
    );
}
