import React from "react";
import { withTranslation } from "react-i18next";
import _ from "lodash";
import * as api from "../../../tools/api";
import swal from "sweetalert2";
import { toLocaleDate } from "../../../tools/format";

class ReplicateAct extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            selectedDate: [],
            tmpDate: undefined,
            scriptToUse: false,
            replicateOnVac: false,
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleAddDate = this.handleAddDate.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    render() {
        const { t } = this.props;

        const dateElements = _.map(this.state.selectedDate, (date, i) => (
            <div key={i} className="list-group-item flex flex-center-aligned">
                {toLocaleDate(date)}
                <button
                    className="btn btn-danger"
                    style={{ marginLeft: "auto" }}
                    onClick={() =>
                        this.setState({
                            selectedDate: this.state.selectedDate.filter(
                                (d, i2) => i2 !== i
                            ),
                        })
                    }
                >
                    {t("courses:replicateActivities.delete")}
                </button>
            </div>
        ));

        return (
            <div className="col-md-8">
                <div className="row flex flex-end-aligned">
                    <div className="col-sm-6">
                        <div>
                            <label htmlFor="date">
                                {t("courses:replicateActivities.selectDate")}
                                <span className="text-danger"> *</span>
                            </label>

                            <input
                                className="form-control"
                                type="date"
                                name="date"
                                id="date"
                                onChange={this.handleChange}
                                onKeyPress={({ key }) => {
                                    if (key === "Enter") this.handleAddDate();
                                }}
                            />
                        </div>
                    </div>

                    <div className="col-sm-4">
                        {this.state.tmpDate !== undefined ? (
                            <button
                                className="form-group btn btn-primary"
                                onClick={this.handleAddDate}
                            >
                                {t("courses:replicateActivities.add")}
                            </button>
                        ) : (
                            ""
                        )}
                    </div>
                </div>

                <div className="row">
                    <div className="col-sm-7">
                        <div className="m-t-md">
                            <h4>
                                {t("courses:replicateActivities.selectedDates")}
                            </h4>
                            <div className="list-group">
                                {dateElements.length > 0
                                    ? dateElements
                                    : t(
                                          "courses:replicateActivities.noDatesSelected"
                                      )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-1">
                    <input
                        type="radio"
                        name="script"
                        id="script1"
                        defaultChecked={true}
                        onChange={({ target }) =>
                            this.setState({ scriptToUse: target["selected"] })
                        }
                    />{" "}
                    <label htmlFor="script1">
                        {t("courses:replicateActivities.byPreviousWeek")}
                    </label>{" "}
                    <br />
                    <input
                        type="radio"
                        name="script"
                        id="script2"
                        onChange={({ target }) =>
                            this.setState({ scriptToUse: !target["selected"] })
                        }
                    />{" "}
                    <label htmlFor="script2">
                        {t("courses:replicateActivities.byFirstWeek")}
                    </label>
                </div>

                <div>
                    <input
                        type="checkbox"
                        name="rov"
                        id="rov"
                        defaultChecked={false}
                        onChange={({ target }) =>
                            this.setState({ replicateOnVac: target["checked"] })
                        }
                    />{" "}
                    <label htmlFor="rov">
                        {t("courses:replicateActivities.replicateOnHolidays")}
                    </label>
                </div>

                {this.state.selectedDate.length > 0 ? (
                    <button
                        className="btn btn-success"
                        onClick={this.handleSubmit}
                    >
                        {t("common:actions.validate")}
                    </button>
                ) : (
                    ""
                )}
            </div>
        );
    }

    handleAddDate() {
        if (this.state.tmpDate !== undefined)
            this.setState({
                selectedDate: [...this.state.selectedDate, this.state.tmpDate],
                tmpDate: undefined,
            });
    }

    handleChange({ target }) {
        let date = new Date(target.value);

        if (
            date
                .toString()
                .toLowerCase()
                .includes("invalid")
        )
            date = undefined;

        if (
            this.state.selectedDate
                .map(d => d.valueOf())
                .includes(date.valueOf())
        )
            date = undefined;

        this.setState({ tmpDate: date });
    }

    handleSubmit() {
        const { t } = this.props;

        api.set()
            .success(res => {
                swal({
                    title: t("courses:replicateActivities.doneTitle"),
                    type: "success",
                    confirmButtonText: t("courses:replicateActivities.ok"),
                }).then(r => this.setState({ dates: [] }));
            })
            .error(res =>
                swal({
                    title: t("courses:replicateActivities.errorTitle"),
                    text: res,
                    type: "error",
                })
            )
            .post("/scripts/replicate_activities/execute", {
                dates: this.state.selectedDate,
                stu: this.state.scriptToUse,
                rov: this.state.replicateOnVac,
            });
    }
}

export default withTranslation("courses")(ReplicateAct);
