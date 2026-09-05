import React from "react";
import Switch from "react-switch";

export default class SeasonSwitch extends React.Component {
    constructor(props) {
        super(props);

        this.state = { checked: this.props.checked };

        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(checked) {
        this.setState({ checked: checked });
        this.props.handleSwitch(this.props.season_id);
    }

    render() {
        return (
            <label>

                <Switch
                    checked={this.state.checked}
                    disabled={this.props.disabled}
                    onChange={
                        this.props.disabled
                            ? () => { }
                            : this.handleChange}
                />
            </label>
        )
    }
}
