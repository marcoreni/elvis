import React from "react";
import PropTypes from "prop-types";
import _ from "lodash";
import { withTranslation } from "react-i18next";

import moment from "moment";

class StudentModal extends React.Component {
    constructor(props) {
        super(props);

        this.state = { kind: this.props.kind || "c" };
    }

    handleOptionChange(e) {
        this.setState({ kind: e.target.value });
    }

    handleSave() {
        this.props.onSave({ ...this.state });
    }

    handleRemove() {
        this.props.onRemove();
    }

    renderKindOption() {
        const { t } = this.props;
        return (
            <form>
                <div className="checkbox-custom">
                    <label for="c">
                        <input
                            id="c"
                            type="radio"
                            value="c"
                            checked={this.state.kind == "c"}
                            onChange={e => this.handleOptionChange(e)}
                        />
                        <span>{t("kinds.course")}</span>
                    </label>
                </div>
                <div className="checkbox-custom">
                    <label for="o">
                        <input
                            id="o"
                            type="radio"
                            value="o"
                            checked={this.state.kind == "o"}
                            onChange={e => this.handleOptionChange(e)}
                        />
                        <span>{t("kinds.option")}</span>
                    </label>
                </div>
            </form>
        );
    }

    render() {
        const { t } = this.props;
        return (
            <div>
                <h4>{t("studentModal.title")}</h4>
                {this.renderKindOption()}
                <button onClick={() => this.handleSave()}>{t("common:actions.save")}</button>
            </div>
        );
    }
}

export default withTranslation("planning")(StudentModal);
