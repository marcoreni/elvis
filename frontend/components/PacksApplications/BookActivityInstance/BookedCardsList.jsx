import React, { Fragment, useEffect, useState } from "react";
import BookingCard from "./bookingCards";
import BookedCard from "./bookedCards";
import { useTranslation } from "react-i18next";

export default function BookedCardsList(props) {
    const { t } = useTranslation("activityApplications");

    const myActivities = props.myActivities;
    useEffect(() => {
        props.setSecondTab();
    }, []);

    if (Object.keys(myActivities).length === 0) {
        return (
            <div className="col-md-12">
                <div className="ibox">
                    <div className="ibox-content text-center">
                        <h3 className="font-bold">
                            {t(
                                "activityApplications:packs.bookedList.noneTitle"
                            )}
                        </h3>
                        <p>
                            {t(
                                "activityApplications:packs.bookedList.noneText"
                            )}
                        </p>
                        <i className="fa fa-pause" aria-hidden="true"></i>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Fragment>
            <h1>{t("activityApplications:packs.bookedList.title")}</h1>
            <div>
                {Object.keys(myActivities).map((month, index) => (
                    <div key={index}>
                        {myActivities[month].map((item, itemIndex) => (
                            <div key={itemIndex}>
                                <BookedCard
                                    key={itemIndex}
                                    activity={item}
                                    activity_ref={props.activity_ref}
                                    removeAttendance={props.removeAttendance}
                                    hoursBeforeCancelling={
                                        props.hoursBeforeCancelling
                                    }
                                />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </Fragment>
    );
}
