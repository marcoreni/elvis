import React from "react";
import InputSelect from "../common/InputSelect";
import { toast } from "react-toastify";
import { MESSAGES } from "../../tools/constants";
import * as api from "../../tools/api";
import AddCourseSummary from "./AddCourseSummary";

export default class AddLocationForCourse extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            roomId: this.props.initialValues.roomId,
            locationId: this.props.initialValues.locationId,
            rooms: undefined,
            locationOptions: undefined,
            roomsOptions: undefined,
            href_path: this.props.href_path,
            summary: this.props.summary,
        };
        this.handleChange = this.handleChange.bind(this);
    }

    componentDidMount() {
        api.get(`/locations`).then(({ data, error }) => {
            if (error) {
                console.log(error);
            } else {
                const locationOptions = data.map((location) => ({
                    label: location.label,
                    value: location.id,
                }));

                // newValues is itself derived from prevState (the `|| default` pick) and applied
                // through applyChange's functional setState updater: this fetch and the sibling
                // /rooms/index_with_overlap one below are independent and may resolve in the same
                // React 18 batch, so neither can read `this.state` directly without risking a
                // stale value if the other's update hasn't committed yet.
                this.applyChange(
                    (prevState) => ({
                        locationId:
                            prevState.locationId ||
                            ((data || []).at(0) || {}).id,
                        locationOptions,
                    }),
                    { locationOptions }
                );
            }
        });

        const {
            fromDate,
            toDate,
            firstDayStartTime,
            firstDayEndTime,
            activityRefId,
        } = this.props.initialValues;
        api.get(
            `/rooms/index_with_overlap?fromDate=${fromDate}&toDate=${toDate}&startTime=${firstDayStartTime}&endTime=${firstDayEndTime}&activityRefId=${activityRefId}`
        ).then(({ data, error }) => {
            if (error) {
                console.log(error);
            } else {
                const roomsOptions = data.map((room) => ({
                    label: room.label,
                    value: room.id,
                }));

                this.applyChange(
                    (prevState) => ({
                        roomId:
                            prevState.roomId || ((data || []).at(0) || {}).id,
                        rooms: data,
                        roomsOptions,
                    }),
                    { rooms: data }
                );
            }
        });
    }

    // Pure computation of the next state slice plus the derived room/location/summary values --
    // shared by handleChange and applyChange below. Has no side effects: it must stay safe to
    // call from inside a setState updater (see applyChange), which React does not guarantee runs
    // exactly once per update.
    computeStateSlice(
        base,
        newValues,
        { rooms = base.rooms, locationOptions = base.locationOptions } = {}
    ) {
        const update = { ...base, ...newValues };

        let selectedRoom;
        if (rooms && update.roomId) {
            selectedRoom = rooms.find((room) => update.roomId === room.id);
        }

        let selectedLocation;
        if (locationOptions && update.locationId) {
            selectedLocation = locationOptions.find(
                (location) => location.value === update.locationId
            );
        }

        const summary = {
            ...update.summary,
            location: selectedLocation ? selectedLocation.label : undefined,
            room: selectedRoom ? selectedRoom.label : undefined,
        };

        return {
            // Only the fields that actually changed (not the full `update` snapshot) -- this can
            // run concurrently with the sibling /locations and /rooms componentDidMount fetches
            // under React 18 automatic batching, and merging a full `...base` spread captured
            // before those siblings' updates land would clobber them.
            stateSlice: { ...newValues, summary },
            selectedRoom,
            selectedLocation,
            summary,
        };
    }

    // Applies newValues (or a prevState => newValues function, for the componentDidMount fetch
    // callbacks) via the functional setState-updater form, immune to batching order regardless of
    // which async source resolves first or if several resolve together. `this.props.onChange` is
    // fired from setState's own completion callback -- after the update has actually committed --
    // rather than from inside the updater itself, since an updater isn't guaranteed to run
    // exactly once for a given update.
    applyChange(newValuesOrFn, options) {
        let derived;
        this.setState(
            (prevState) => {
                const newValues =
                    typeof newValuesOrFn === "function"
                        ? newValuesOrFn(prevState)
                        : newValuesOrFn;
                derived = this.computeStateSlice(prevState, newValues, options);
                return derived.stateSlice;
            },
            () => {
                this.props.onChange({
                    room: {
                        id: (derived.selectedRoom || {}).id,
                        label: (derived.selectedRoom || {}).label,
                    },
                    location: {
                        id: (derived.selectedLocation || {}).value,
                        label: (derived.selectedLocation || {}).label,
                    },
                    summary: { ...derived.summary },
                });
            }
        );
    }

    handleChange(newValues, options) {
        this.applyChange(newValues, options);
    }

    isValidated() {
        if (!this.state.roomId) {
            toast.error(MESSAGES.err_must_choose_room, { autoClose: 3000 });
            return false;
        }
        return true;
    }

    render() {
        const { t } = this.props;
        const {
            roomId,
            locationId,
            rooms,
            locationOptions,
            roomsOptions,
            summary,
        } = this.state;
        return (
            <div className="row">
                <div className="col-md-8">
                    <div className="ibox">
                        <div className="ibox-title flex">
                            <i className="fa fa-map-marker m-sm"></i>
                            <h3>{t("addLocation.stepName")}</h3>
                        </div>
                        <div className="ibox-content">
                            <div className="row">
                                <div className="col-md-6">
                                    {locationOptions && (
                                        <InputSelect
                                            input={{
                                                name: "location",
                                                onChange: e => {
                                                    let newOptions = [];

                                                    if (
                                                        e.target.value.length ==
                                                        0
                                                    ) {
                                                        newOptions = rooms.map(
                                                            room => {
                                                                return {
                                                                    label:
                                                                        room.label,
                                                                    value:
                                                                        room.id,
                                                                };
                                                            }
                                                        );
                                                    } else {
                                                        newOptions = rooms
                                                            .filter(
                                                                room =>
                                                                    room.location_id ==
                                                                    e.target
                                                                        .value
                                                            )
                                                            .map(room => {
                                                                return {
                                                                    value:
                                                                        room.id,
                                                                    label:
                                                                        room.label,
                                                                };
                                                            });
                                                    }

                                                    const roomsAvailable =
                                                        newOptions.length > 0 &&
                                                        e.target.value.length >
                                                            0;

                                                    this.handleChange({
                                                        roomsOptions: newOptions,
                                                        locationId:
                                                            e.target.value,
                                                        roomId: roomsAvailable
                                                            ? newOptions[0]
                                                                  .value
                                                            : "",
                                                    });
                                                },
                                                value: locationId,
                                            }}
                                            meta={{}}
                                            label={t("addLocation.filterBySite")}
                                            options={locationOptions}
                                            button={{
                                                icon: "fa fa-plus-circle",
                                                // Relative path (not `${href_path}/...`) --
                                                // see AddActivityForCourse.jsx for why.
                                                href_path: "/locations/new",
                                                text: "",
                                                tooltip: t("addLocation.addLocationTooltip"),
                                            }}
                                        />
                                    )}

                                    {roomsOptions && (
                                        <InputSelect
                                            input={{
                                                name: "room",
                                                onChange: e =>
                                                    this.handleChange({
                                                        roomId: parseInt(e.target.value),
                                                    }),
                                                value: roomId,
                                            }}
                                            meta={{}}
                                            label={t("addLocation.room")}
                                            required={true}
                                            options={roomsOptions}
                                            button={{
                                                icon: "fa fa-plus-circle",
                                                href_path: "/rooms/new",
                                                text: "",
                                                tooltip: t("addLocation.addRoomTooltip"),
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <AddCourseSummary
                        summary={summary}
                        handleSubmit={this.handleSubmit}
                    />
                </div>
                <button className="btn btn-primary btn-md submit-activity">
                    {t("common:actions.validate")}
                </button>
            </div>
        );
    }
}
