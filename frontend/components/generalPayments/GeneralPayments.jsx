import React from "react";

import { withTranslation } from "react-i18next";

import DuePaymentList from "./DuePaymentList";
import PaymentList from "./PaymentList";
import PaymentScheduleList from "./PaymentScheduleList";
import CheckList from "./CheckList";
import TabbedComponent from "../utils/ui/tabs";

class GeneralPayments extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            mode: "DUE_PAYMENTS",
            failedCount: this.props.failedCount,
        };
    }

    render() {
        const { t } = this.props;

        return (
            <div className="col-lg-12 page-reglement">
                <TabbedComponent tabs={[
                    {
                        id: "due_payments",
                        header: t("general.tabs.dueDates"),
                        body: <DuePaymentList
                            paymentMethods={this.props.paymentMethods}
                            locations={this.props.locations}
                            minYear={this.props.minYear}
                            maxYear={this.props.maxYear}
                            statuses={this.props.duePaymentStatuses}
                            seasons={this.props.seasons}
                            paymentStatuses={this.props.paymentStatuses}
                        />,
                        active: true,
                    },
                    {
                        id: "payments",
                        header: t("general.tabs.payments"),
                        body: <PaymentList
                            paymentMethods={this.props.paymentMethods}
                            locations={this.props.locations}
                            minYear={this.props.minYear}
                            maxYear={this.props.maxYear}
                            statuses={this.props.duePaymentStatuses}
                            seasons={this.props.seasons}
                            paymentStatuses={this.props.paymentStatuses}
                        />,
                    },
                    {
                        id: "schedules_without_payer",
                        header: t("general.tabs.schedulesWithoutPayer"),
                        body: <PaymentScheduleList seasons={this.props.seasons} />,
                    },
                    {
                        id: "checks",
                        header: t("general.tabs.checks"),
                        body: <CheckList/>,
                    },
                ]}>

                </TabbedComponent>
            </div>
        );
    }
}

export default withTranslation("payments")(GeneralPayments);
