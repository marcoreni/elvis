import React, { useEffect } from "react";
import * as api from "../../../tools/api";
import swal from "sweetalert2";
import {useTranslation} from "react-i18next";

export default function PlanningDisplayParameters() {
    const {t} = useTranslation("parameters");
    const [showActivityCode, setShowActivityCode] = React.useState(false);
    const [recurrenceActivated, setRecurrenceActivated] = React.useState(false);
    const [availabilityMessage, setAvailabilityMessage] = React.useState("");

    useEffect(() => {
        api.set()
            .success((data) => {
                setShowActivityCode(data.show_activity_code);
                setRecurrenceActivated(data.recurrence_activated);
                setAvailabilityMessage(data.availability_message || "");
            })
            .error(() => {
                swal({
                    title: t("shared.loadParamsError"),
                    type: "error",
                });
            })
            .get("/parameters/planning/school_planning_params", {});
    }, []);

    const onSubmit = (e) => {
        api.set()
            .success(() => {
                swal({
                    title: t("plannings.displayParams.saveSuccess"),
                    type: "success",
                });
            })
            .error(() => {
                swal({
                    title: t("plannings.displayParams.saveError"),
                    type: "error",
                });
            })
            .post("/parameters/planning/school_planning_params", {
                show_activity_code: showActivityCode,
                recurrence_activated: recurrenceActivated,
                availability_message: availabilityMessage
            });
    };

    return (
        <div className="row">
            <div className="col-md-5">
                <h3>{t("plannings.displayParams.heading")}</h3>

                <div className="form-group mb-3">
                    <input
                        id="show_activity_code"
                        type="checkbox"
                        checked={showActivityCode}
                        onChange={() => setShowActivityCode(!showActivityCode)}
                    />
                    <label htmlFor="show_activity_code" className="ml-2 font-normal">
                        {t("plannings.displayParams.showActivityCodeLabel")}
                    </label>
                </div>

                <div className="form-group mb-3">
                    <input
                        id="recurrence_activated"
                        type="checkbox"
                        checked={recurrenceActivated}
                        onChange={() => setRecurrenceActivated(!recurrenceActivated)}
                    />
                    <label htmlFor="recurrence_activated" className="ml-2 font-normal">
                        {t("plannings.displayParams.recurrenceLabel")}
                    </label>
                </div>

                <div className="form-group mb-3">
                    <label htmlFor="availability_message" className="font-normal">
                        {t("plannings.displayParams.availabilityMessageLabel")}
                    </label>
                    <input
                        id="availability_message"
                        type="text"
                        className="form-control"
                        value={availabilityMessage}
                        onChange={(e) => setAvailabilityMessage(e.target.value)}
                    />
                </div>

                <button className="btn btn-success pull-right mt-5" onClick={onSubmit}>
                    {t("common:actions.validate")}
                </button>
            </div>
        </div>
    );
}
