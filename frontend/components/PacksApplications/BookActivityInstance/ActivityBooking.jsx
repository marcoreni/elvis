import React, { Fragment, useEffect, useState } from "react";
import * as api from "../../../tools/api";
import swal from "sweetalert2";
import { useTranslation } from "react-i18next";
import BookingCardsList from "./BookingCardsList";
import moment from "moment/moment";
import BookedCardsList from "./BookedCardsList";
import TabbedComponent from "../../utils/ui/tabs";

export default function ActivityBooking() {
    const { t } = useTranslation("activityApplications");
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [activities, setActivities] = useState(null);
    const [activity_ref, setActivityRef] = useState(null);
    const [wishList, setWishList] = useState([]);
    const [myActivities, setMyActivities] = useState([]);
    const [hoursBeforeCancelling, setHoursBeforeCancelling] = useState(0);
    const [activityRefPricing, setActivityRefPricing] = useState(null);
    const [pack, setPack] = useState(null);
    const [secondTabActive, setSecondTabActive] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

    const fetchData = async () => {
        try {
            await api
                .set()
                .useLoading()
                .success(res => {
                    setUser(res.user);
                    setActivities(sortActivitiesByMonth(res.availabilities));
                    setMyActivities(sortActivitiesByMonth(res.my_activities));
                    setActivityRef(res.activity_ref);
                    setHoursBeforeCancelling(res.hours_before_cancelling);
                    setActivityRefPricing(res.activity_ref_pricing);
                    setPack(res.pack);
                })
                .error(res => {
                    swal(
                        t("activityApplications:packs.fetchError"),
                        res.error,
                        "error"
                    );
                })
                .get(
                    `/get_bookings_and_availabilities` +
                        window.location.pathname,
                    {}
                );
        } catch (error) {
            swal(t("activityApplications:packs.fetchError"), error, "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    /**
     * trier les activités par mois
     * @param data
     */
    function sortActivitiesByMonth(data) {
        let sortedActivities = {};

        data.forEach(activity => {
            const month = moment(activity.time_interval.start).format("MMMM");
            if (sortedActivities[month] === undefined) {
                sortedActivities[month] = [];
            }
            sortedActivities[month].push(activity);
        });

        // retirer les doublons par date
        Object.keys(sortedActivities).forEach(month => {
            sortedActivities[month] = sortedActivities[month].filter(
                (thing, index, self) =>
                    index ===
                    self.findIndex(
                        t => t.time_interval.start === thing.time_interval.start
                    )
            );
        });

        return sortedActivities;
    }

    function addToWishList(activity) {
        wishList.length >= pack.lessons_remaining
            ? swal(
                  t("activityApplications:packs.booking.tooManySlotsTitle"),
                  t("activityApplications:packs.booking.tooManySlotsText"),
                  "error"
              )
            : !wishList.includes(activity) &&
              setWishList([...wishList, activity]);
    }

    function removeFromWishList(activity) {
        const index = wishList.indexOf(activity);
        if (index > -1) {
            setWishList(wishList.filter(item => item !== activity));
        }
    }

    function submitWishList() {
        if (wishList.length === 0) {
            swal(
                t("activityApplications:packs.booking.noneSelectedTitle"),
                t("activityApplications:packs.booking.noneSelectedText"),
                "error"
            );
            return;
        }

        api.set()
            .useLoading()
            .success(res => {
                swal(
                    t("activityApplications:packs.booking.wishesSaved"),
                    "",
                    "success"
                );
                setActiveTab(1);
            })
            .error(res => {
                swal(res.message, res.error, "error");
            })
            .post(`/submit_user_wish_list`, {
                user_id: user.id,
                wish_list: wishList,
                pack_id: pack.id,
            })
            .then(() => {
                fetchData();
            });
    }

    function removeAttendance(activity) {
        swal({
            title: t("activityApplications:packs.booking.unregisterTitle"),
            text: t("activityApplications:packs.booking.unregisterText"),
            type: "warning",
            buttons: true,
            showCancelButton: true,
            confirmButtonText: t("activityApplications:packs.booking.confirm"),
            cancelButtonText: t("common:actions.cancel"),
        })
            .then(willPost => {
                if (willPost.value) {
                    api.set()
                        .useLoading()
                        .success(res => {
                            swal(
                                t(
                                    "activityApplications:packs.booking.unregisterSuccess"
                                ),
                                res.message,
                                "success"
                            );
                        })
                        .error(res => {
                            swal(
                                t(
                                    "activityApplications:packs.booking.unregisterError"
                                ),
                                res.error,
                                "error"
                            );
                        })
                        .post(`/remove_wished_attendance`, {
                            activity_instance: activity,
                            user: user,
                            pack_id: pack.id,
                        });
                }
            })
            .then(() => {
                fetchData();
            });
    }

    function setSecondTab() {
        secondTabActive ? setSecondTabActive(false) : setSecondTabActive(true);
    }

    if (loading) return "Loading...";

    return (
        <Fragment>
            <div className="p-5">
                <div className="row">
                    <div className="col-md-12">
                        <h4 className="title font-bold">
                            {t("activityApplications:packs.booking.title")}
                        </h4>
                    </div>
                </div>

                <div className="row mt-2 ml-1">
                    <p>{t("activityApplications:packs.booking.selectSlots")}</p>
                </div>

                <TabbedComponent
                    tabs={[
                        {
                            id: "tab1",
                            header: t(
                                "activityApplications:packs.booking.tabUpcoming"
                            ),
                            active: activeTab === 0,
                            headerStyle: {
                                color: "inherit",
                                textDecoration: "none",
                            },
                            body: (
                                <BookingCardsList
                                    activities={activities}
                                    activity_ref={activity_ref}
                                    pack={pack}
                                    addToWishList={addToWishList}
                                    removeFromWishList={removeFromWishList}
                                    setSecondTab={setSecondTab}
                                />
                            ),
                        },
                        {
                            id: "tab2",
                            header: t(
                                "activityApplications:packs.booking.tabMySessions"
                            ),
                            active: activeTab === 1,
                            headerStyle: {
                                color: "inherit",
                                textDecoration: "none",
                            },
                            body: (
                                <BookedCardsList
                                    myActivities={myActivities}
                                    activity_ref={activity_ref}
                                    removeAttendance={removeAttendance}
                                    hoursBeforeCancelling={
                                        hoursBeforeCancelling
                                    }
                                    setSecondTab={setSecondTab}
                                />
                            ),
                        },
                    ]}
                    mode="buttons"
                />
            </div>

            {secondTabActive && (
                <div
                    className="app-footer"
                    style={{ zIndex: "1", position: "fixed" }}
                >
                    <button
                        className="btn btn-primary pull-right"
                        onClick={submitWishList}
                    >
                        {t("activityApplications:packs.booking.book")}
                    </button>
                </div>
            )}
        </Fragment>
    );
}
