import BaseParameters from "../BaseParameters";
import EvaluationLevels from "./EvaluationLevels";
import React,{Component} from "react";
import {withTranslation} from "react-i18next";
import EvaluationSlot from "./EvaluationSlot"
import { xorBy } from "lodash";
xorBy

class EvaluationsParameters extends BaseParameters
{
    constructor(props)
    {
        super(props);

        this.state.tabsNames = [props.t("evaluations.tabs.levels"), props.t("evaluations.tabs.slot")];
        this.state.divObjects = [<EvaluationLevels urlListData="/parameters/evaluations_parameters/list_levels" urlNew="/evaluation_level_ref/new" />, <EvaluationSlot/>];
    }

}

export default withTranslation("parameters")(EvaluationsParameters);
