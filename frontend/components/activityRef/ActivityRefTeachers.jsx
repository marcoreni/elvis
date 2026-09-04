import React, { Fragment } from "react";
import {withTranslation} from "react-i18next";
import {csrfToken} from "../utils";
import Select from "react-select";
import { Field } from "react-final-form";
import { required } from "../../tools/validators";
import SelectMultiple from "../common/SelectMultiple";

class ActivityRefTeachers extends React.Component
{
    constructor(props)
    {
        super(props);

        this.state = {
            teachers: props.teachers,
            all_teachers: []
        }
    }

    componentDidMount()
    {
        fetch("/teachers/index", {
            method: "get",
            credentials: "same-origin",
            headers: {
                "X-CSRF-Token": csrfToken,
                "Accept": "application/json"
            }
        })
            .then(res => res.json())
            .then(json =>
            {
                this.setState({ all_teachers: json.map(teacher => ({ id: teacher.id, last_name: teacher.last_name, first_name: teacher.first_name})) });
            });
    }

    render()
    {
        const {t} = this.props;
        return <div>
            {this.state.all_teachers.length > 0 && <SelectMultiple
                title={t("activityRef.teachers.title")}
                name="teachers"
                isMulti
                all_features={this.state.all_teachers.map(teacher => [`${teacher.last_name} ${teacher.first_name}`, teacher.id])}
                features={this.state.teachers}
                mutators={this.props.mutators}
            />}


        </div>
    }
}

export default withTranslation("activities")(ActivityRefTeachers);