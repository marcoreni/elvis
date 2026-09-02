import React, {Fragment} from "react";
import {withTranslation} from "react-i18next";
import {Field} from "react-final-form";
import Input from "../../common/Input";
import {required, minLength, minValue, maxValue, composeValidators} from "../../../tools/validators";
import checkbox from "../../common/Checkbox";

class PricingCategoryFormContent extends React.Component {

    constructor(props) {
        super(props);
    }

    render() {
        const {t} = this.props;
        return (
            <Fragment>
                <div className="row">
                    <div className="col">
                        <Field
                            label={t("activities.pricing.categoryName")}
                            name="name"
                            type="text"
                            required
                            validate={composeValidators(required, minLength(3))}
                            render={Input}
                        />
                    </div>
                </div>

                <div className="row">
                    <div className="col">
                        <Field
                            label={t("activities.pricing.lessonsCount")}
                            name="number_lessons"
                            type="number"
                            required
                            validate={composeValidators(required, minValue(0), maxValue(100))}
                            render={Input}
                        />
                    </div>
                </div>

                <div className="row">
                    <div className="col">
                        <Field
                            id="enabled"
                            label={t("activities.pricing.isPack")}
                            name="is_a_pack"
                            type="checkbox"
                            required
                            render={checkbox}
                        />
                    </div>
                </div>
            </Fragment>
        );
    }
}

export default withTranslation("parameters")(PricingCategoryFormContent);
