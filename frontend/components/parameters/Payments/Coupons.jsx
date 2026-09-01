import React, {Fragment} from 'react';
import {useTranslation} from "react-i18next";
import BaseDataTable from '../../common/baseDataTable/BaseDataTable';
import DefaultCreateButton from "../../common/baseDataTable/DefaultCreateButton";
import CouponsActionButtons from "./CouponsActionButtons";
import DataService from "../../common/baseDataTable/DataService";
import CouponFormContent from './CouponFormContent';

function CreateButton({onCreate}) {
    const {t} = useTranslation("parameters");
    return (
        <DefaultCreateButton
            label={t("payments.coupons.createButton")}
            onCreate={onCreate}
        />
    );
}

export default function Coupons() {
    const {t} = useTranslation("parameters");
    const columns = [
        {
            id: "id",
            Header: t("payments.coupons.cols.id"),
            accessor: "id",
        },
        {
            id: "label",
            Header: t("payments.coupons.cols.label"),
            accessor: "label",
        },
        {
            id: "percent_off",
            Header: t("payments.coupons.cols.percentOff"),
            accessor: "percent_off",
        },
        {
            id: "enabled",
            Header: t("payments.coupons.cols.enabled"),
            accessor: "enabled",
            Cell: ({value}) => value ? t("shared.yes") : t("shared.no")
        }
    ];

    return (
        <Fragment>
            <div className="row m-xs">
                <div className="col-lg-12">
                    <div className="ibox">
                        <div className="ibox-content">
                            <BaseDataTable
                                dataService={new DataService("/coupons")}
                                columns={columns}
                                actionButtons={CouponsActionButtons}
                                createButton={CreateButton}
                                formContentComponent={CouponFormContent}
                                showFullScreenButton={false}
                                labellizer={coupon => `${coupon.label} (-${coupon.percent_off}%)`}
                                oneResourceTypeName={t("payments.coupons.oneResourceTypeName")}
                                thisResourceTypeName={t("payments.coupons.thisResourceTypeName")}
                                defaultSorted={[{id: "label", asc: true}]}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    );

}