import React from "react";
import {withTranslation} from "react-i18next";
import PaymentsMethods from "./PaymentsMethods";
import BaseParameters from "../BaseParameters";
import AdhesionSettings from './AdhesionSettings';
import EditPaymentScheduleOptions from "./EditPaymentScheduleOptions";
import Coupons from "./Coupons";
import PricingCategoriesEdit from "../Activities/PricingCategoriesEdit";

class PaymentsParameters extends BaseParameters {
    constructor(props) {
        super(props);

        this.state.tabsNames = [
            props.t("payments.tabs.adhesion"),
            /*'Statuts de paiements',*/
            props.t("payments.tabs.paymentMethods"),
            props.t("payments.tabs.pricingCategories"),
            props.t("payments.tabs.paymentTerms"),
            props.t("payments.tabs.discountRate")
        ];

        this.state.divObjects = [
            <AdhesionSettings/>,
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
            <Coupons />
        ];
    }
}

export default withTranslation("parameters")(PaymentsParameters);
