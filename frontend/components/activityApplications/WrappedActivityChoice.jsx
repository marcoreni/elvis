import React from "react";
import ActivityChoice from "./ActivityChoice";
import {toast} from "react-toastify";
import i18n from "../../i18n";


class WrappedActivityChoice extends React.Component {
    constructor(props) {
        super(props);

    }

    isValidated() {
        const { selectedActivities, selectedFormulas, selectedPacks } = this.props;

        if (Object.keys(selectedFormulas).length === 0 && selectedActivities.length === 0 && Object.keys(selectedPacks).length === 0) {
            toast.error(i18n.t("activityApplications:wrappedActivityChoice.noActivityError"), { autoClose: 3000 });
            return false;
        }

        return true;
    }


    render() {
        return (
            <ActivityChoice
                {...this.props}
            />
        );
    }

}

export default WrappedActivityChoice;