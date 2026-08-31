import BaseParameters from "../BaseParameters";
import Localisations from "./Localisations";
import React from "react";
import {withTranslation} from "react-i18next";
import swal from "sweetalert2";
import {csrfToken} from "../../utils";

class RoomsParameters extends BaseParameters
{
    constructor(props)
    {
        super(props);

        this.state.tabsNames = [props.t("rooms.tabs.siteList")];
        this.state.divObjects = [<Localisations
            urlListData="/parameters/rooms_parameters/list"
            urlNew="/locations/new"
            rooms={props.rooms}/>]
    }
}

export default withTranslation("parameters")(RoomsParameters);
