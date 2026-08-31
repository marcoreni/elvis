import React, { Fragment } from "react";
import { withTranslation } from "react-i18next";
import Input from "../common/Input";
import { required } from "../../tools/validators";
import { Field } from "react-final-form";
import Select from "react-select";

class ActivityRefPricingModal extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            pricingCategories: [],
            seasons: [],
            selectedPricingCategory: null,
            selectedFrom: null,
            selectedTo: null,
        }
    }

    componentDidMount() {
        const { seasons, pricingCategories, isUpdate, item } = this.props;

        const mappedSeasons = seasons
            .map(season => ({ value: season.id, label: season.label }))
            .sort((a, b) => a.label.localeCompare(b.label));
        const mappedPricingCategories = pricingCategories.map(pricingCategory => ({
            value: pricingCategory.id,
            label: pricingCategory.name
        }));

        this.setState({ seasons: mappedSeasons, pricingCategories: mappedPricingCategories });

        if (isUpdate) {
            const selectedPricingCategory = this.findSelectedOption(mappedPricingCategories, item.pricing_category.id);
            const selectedFrom = this.findSelectedOption(mappedSeasons, item.from_season_id);
            const selectedTo = this.findSelectedOption(mappedSeasons, item.to_season_id);

            this.setState({ selectedPricingCategory, selectedFrom, selectedTo });
        }
    }


    ReactSelectAdapter = ({ input, ...rest }) => (
        <Select {...input} {...rest} searchable required />
    );

    findSelectedOption = (options, value) => {
        return options.find(option => option.value === value) || null;
    };

    render() {
        const { t } = this.props;
        const { pricingCategories, seasons, selectedPricingCategory, selectedFrom, selectedTo} = this.state;
        const { isUpdate } = this.props;

        if (isUpdate) {
            if (!selectedPricingCategory || !selectedFrom) {
                return t("common:loading");
            }
        }

        return (
            <Fragment>
                <div className="mt-3">
                    <label className="ml-4">{t("activityRefPricingModal.pricingType")}</label>
                    <Field
                        label={t("activityRefPricingModal.chooseCategory")}
                        name="name"
                        type="text"
                        component={this.ReactSelectAdapter}
                        render={Input}
                        className="col-12"
                        isDisabled={this.props.isUpdate}
                        options={pricingCategories}
                        defaultValue={selectedPricingCategory}
                        placeholder={t("activityRefPricingModal.placeholderCategory")}
                    />
                </div>

                <div className="pl-4 col-12 mt-3">
                    <label>{t("activityRefPricingModal.price")}</label>
                    <Field
                        name="price"
                        type="text"
                        validate={required}
                        render={Input}
                    />
                </div>

                <div className="mt-3">
                    <label className="ml-4">{t("activityRefPricingModal.from")}</label>
                    <Field
                        className="col-12"
                        name="fromSeason"
                        component={this.ReactSelectAdapter}
                        options={seasons}
                        required
                        isDisabled={this.props.isUpdate}
                        defaultValue={selectedFrom}
                        maxMenuHeight={100}
                        placeholder={t("activityRefPricingModal.placeholderSeason")}
                    />
                </div>

                <div className="mt-3 mb-5">
                    <label className="ml-4">{t("activityRefPricingModal.to")}</label>
                    <Field
                        className="col-12"
                        name="toSeason"
                        component={this.ReactSelectAdapter}
                        options={seasons}
                        defaultValue={selectedTo}
                        maxMenuHeight={100}
                        placeholder={t("activityRefPricingModal.placeholderSeason")}
                    />
                </div>
            </Fragment>
        );
    }
}

export default withTranslation("activities")(ActivityRefPricingModal);
