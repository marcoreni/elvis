import React, {Fragment} from "react";
import {useTranslation} from "react-i18next";
import BaseDataTable from "../../common/baseDataTable/BaseDataTable";
import DataService from "../../common/baseDataTable/DataService";
import DefaultCreateButton from "../../common/baseDataTable/DefaultCreateButton";
import DefaultActionButtons from "../../common/baseDataTable/DefaultActionButtons";
import PricingCategoryFormContent from "./PricingCategoryFormContent";

function CreateButton({onCreate}) {
    const {t} = useTranslation("parameters");
    return (
        <DefaultCreateButton
            label={t("activities.pricing.createButton")}
            onCreate={onCreate}
        />
    );
}

export default function PricingCategoriesEdit()
{
    const {t} = useTranslation("parameters");
    const columns = [
        {
            id: "name",
            Header: t("activities.pricing.categoryName"),
            accessor: "name",
        },
        {
            id: "number_lesson",
            Header: t("activities.pricing.lessonsCount"),
            accessor: "number_lessons",
        },
        {
            id: "is_pack",
            Header: t("activities.pricing.isPack"),
            accessor: "is_a_pack",
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
                                dataService={new DataService("/pricing_categories")}
                                columns={columns}
                                actionButtons={DefaultActionButtons}
                                createButton={CreateButton}
                                formContentComponent={PricingCategoryFormContent}
                                showFullScreenButton={false}
                                oneResourceTypeName={t("activities.pricing.oneResourceTypeName")}
                                thisResourceTypeName={t("activities.pricing.thisResourceTypeName")}
                                defaultSorted={[{id: "name", asc: true}]}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Fragment>
    )
}