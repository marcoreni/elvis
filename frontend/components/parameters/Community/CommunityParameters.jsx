import React from "react";
import {withTranslation} from "react-i18next";
import MergeUsers from "../../scripts/mergeUsers/MergeUsers";
import BaseParameters from "../BaseParameters";

class CommunityParameters extends BaseParameters
{
    constructor(props)
    {
        super(props);

        this.state.tabsNames = [props.t("community.tabs.mergeUsers")];
        this.state.divObjects = [<MergeUsers season={this.props.season} />];
    }
}

export default withTranslation("parameters")(CommunityParameters);
