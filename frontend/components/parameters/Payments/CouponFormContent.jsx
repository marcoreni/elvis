import React, {Fragment} from "react";
import {withTranslation} from "react-i18next";
import {Field} from "react-final-form";
import Input from "../../common/Input";
import {required, minLength, minValue, maxValue, composeValidators} from "../../../tools/validators";
import checkbox from "../../common/Checkbox";

class CouponFormContent extends React.Component {

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
                            label={t("payments.coupons.form.label")}
                            name="label"
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
                            label={t("payments.coupons.form.percentOff")}
                            name="percent_off"
                            type="number"
                            disabled={this.props.isUpdate}
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
                            label={t("payments.coupons.form.enabled")}
                            name="enabled"
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

export default withTranslation("parameters")(CouponFormContent);
