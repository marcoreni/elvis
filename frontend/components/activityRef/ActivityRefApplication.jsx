import React from "react";
import {Field} from "react-final-form";
import {withTranslation, useTranslation, Trans} from "react-i18next";

import Checkbox from "../common/Checkbox";
import Radio from "../common/Radio";
import {FormSpy} from "react-final-form";

const AllowsTimeslotSelectionButtonGroup = ({forcedValue}) => {
    const {t} = useTranslation("activities");
    return (
        <div className="btn-group pl-4" data-toggle="buttons">
            <Field
                id="allows_timeslot_selection"
                label={t("activityRefApplication.timeslot.proposeSlots")}
                name="allowsTimeslotSelection"
                value={"true"}
                disabled={forcedValue === "false"}
                type="radio"
                render={Radio}
            />
            <Field
                id="ask_availabilities"
                label={t("activityRefApplication.timeslot.askAvailabilities")}
                name="allowsTimeslotSelection"
                value={"false"}
                disabled={forcedValue === "true"}
                type="radio"
                render={Radio}
            />
        </div>
    );
}

class ActivityRefApplication extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            tabs: []
        }
    }

    onSubmit() {
        alert("on submit");
    }

    render() {
        const {t} = this.props;
        return (
            <div>
                <hr/>

                <div className="row-sm">
                    <h3>{t("activityRefApplication.reenrollment.title")}</h3>
                    <label>{t("activityRefApplication.reenrollment.label")}
                        <br/>
                        <Field

                            component="select"
                            multiple size="10"
                            name="nextCycles"
                            style={{width: '50%'}}>

                            {this.props.activityRefs.map((kind) => {
                                return <optgroup key={kind[0].id} label={kind[0].name}>
                                    {kind[1].map((actRef) => {
                                        return <option key={actRef.id} value={actRef.id}>{actRef.label}</option>
                                    })}
                                </optgroup>
                            })}
                        </Field>
                    </label>
                </div>

                <p className="row-sm text-muted">
                    <Trans ns="activities" i18nKey="activityRefApplication.help.multiSelect">Sélectionner plusieurs activités avec <strong>CTRL</strong>.</Trans>
                    <br/>
                    <Trans ns="activities" i18nKey="activityRefApplication.help.rangeSelect">Sélectionner la totalité entre deux activités avec <strong>MAJ/SHIFT</strong>.</Trans>
                    <br/>
                    <Trans ns="activities" i18nKey="activityRefApplication.help.combine">Vous pouvez combiner <strong>CTRL</strong> et <strong>MAJ/SHIFT</strong>.</Trans>
                </p>

                <div className="row-sm">
                    <h3>{t("activityRefApplication.visibility.title")}</h3>
                    <Field
                        id="is_lesson"
                        label={t("activityRefApplication.visibility.isLesson")}
                        name="applicationOptions"
                        value="is_lesson"
                        type="checkbox"
                        render={Checkbox}
                    />
                    <Field
                        id="is_visible_to_admin"
                        label={t("activityRefApplication.visibility.isVisibleToAdmin")}
                        name="applicationOptions"
                        value="is_visible_to_admin"
                        type="checkbox"
                        render={Checkbox}
                    />
                    <Field
                        id="is_unpopular"
                        label={t("activityRefApplication.visibility.isUnpopular")}
                        name="applicationOptions"
                        value="is_unpopular"
                        type="checkbox"
                        render={Checkbox}
                    />
                </div>


                <div className="row-sm">
                    <h3>{t("activityRefApplication.familyChoice.title")}</h3>

                    <Field
                        id="substitutable-true"
                        label={t("activityRefApplication.familyChoice.attach")}
                        name="substitutable"
                        type="radio"
                        value="true"
                        render={Radio}
                    />

                    <FormSpy subscription={{values: true}}>
                        {({values}) => {
                            if (values.substitutable === "true") {
                                return <AllowsTimeslotSelectionButtonGroup forcedValue={"false"}/>
                            }
                            return null
                        }}
                    </FormSpy>

                    <Field
                        id="substitutable-false"
                        label={t("activityRefApplication.familyChoice.detach")}
                        name="substitutable"
                        type="radio"
                        value="false"
                        render={Radio}
                    />

                    <FormSpy subscription={{values: true}}>
                        {({values}) => {
                            if (values.substitutable === "false") {
                                return <AllowsTimeslotSelectionButtonGroup/>
                            }
                            return null
                        }}
                    </FormSpy>
                </div>


                <div className="row-sm">
                    <h3>{t("activityRefApplication.evaluation.title")}</h3>
                    <Field
                        id="is_evaluable"
                        label={t("activityRefApplication.evaluation.isEvaluable")}
                        name="applicationOptions"
                        value="is_evaluable"
                        type="checkbox"
                        render={Checkbox}
                    />
                </div>


            </div>
        );
    }
}

export default withTranslation("activities")(ActivityRefApplication);
