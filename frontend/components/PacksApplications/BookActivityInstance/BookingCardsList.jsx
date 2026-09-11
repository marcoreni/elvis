import React, { Fragment, useEffect, useState } from "react";
import BookingCard from "./bookingCards";
import { Trans, useTranslation } from "react-i18next";

export default function BookingCardsList(props) {
    const { t } = useTranslation("activityApplications");

    const activities = props.activities;
    useEffect(() => {
        props.setSecondTab();
    }, []);

    if (Object.keys(activities).length === 0) {
        return (
            <div className="col-md-12">
                <div className="ibox">
                    <div className="ibox-content text-center">
                        <h3 className="font-bold">
                            {t(
                                "activityApplications:packs.bookingList.noActivitiesTitle"
                            )}
                        </h3>
                        <p>
                            {t(
                                "activityApplications:packs.bookingList.noActivitiesText"
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
            <div className="div-scrollable">
                {props.pack.lessons_remaining > 0 ? (
                    <div className="row mt-2 ml-1">
                        <p>
                            <Trans
                                t={t}
                                i18nKey="activityApplications:packs.bookingList.remainingReminder"
                                count={props.pack.lessons_remaining}
                                values={{ label: props.activity_ref.label }}
                                components={{
                                    bold: <span className="font-bold" />,
                                }}
                            />
                        </p>
                    </div>
                ) : (
                    <div className="row mt-2 ml-1">
                        <p>
                            <Trans
                                t={t}
                                i18nKey="activityApplications:packs.bookingList.allBooked"
                                values={{ label: props.activity_ref.label }}
                                components={{
                                    bold: <span className="font-bold" />,
                                }}
                            />
                        </p>
                    </div>
                )}

                {Object.keys(activities).map(
                    (month, index) =>
                        activities[month].length > 0 && (
                            <div key={index}>
                                <h3 className="animated fadeInRight">
                                    {month}
                                </h3>
                                {activities[month].map((item, itemIndex) => (
                                    <div key={itemIndex}>
                                        <BookingCard
                                            key={index}
                                            activity={item}
                                            activity_ref={props.activity_ref}
                                            addToWishList={props.addToWishList}
                                            removeFromWishList={
                                                props.removeFromWishList
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        )
                )}
            </div>
        </Fragment>
    );
}
