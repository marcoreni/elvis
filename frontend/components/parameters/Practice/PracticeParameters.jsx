import BaseParameters from "../BaseParameters";
import React from "react";
import { useTranslation } from "react-i18next";
import Groups from "./Groups";
import BandsType from "./BandsType";
import MusicGenres from "./MusicGenres";
import Materials from "./Materials";
import FlatRate from "./FlatRate";
import Features from "./Features";
import Instruments from "./Instruments";

// Used to `extends BaseParameters` purely to seed its state.tabsNames/divObjects in the
// constructor -- now that BaseParameters is a function component (can't be `extends`ed), pass
// them as props directly, matching PlanningsParameters/ActivitiesParameters/etc.
export default function PracticeParameters() {
    const { t } = useTranslation("parameters");

    return (
        <BaseParameters
            tabsNames={[
                t("practice.tabs.bandTypes"),
                t("practice.tabs.musicGenre"),
                t("practice.tabs.manageBands"),
                t("practice.tabs.materials"),
                t("practice.tabs.flatRates"),
                t("practice.tabs.roomOptions"),
                t("practice.tabs.instruments"),
            ]}
            divObjects={[
                <BandsType
                    urlListData="/parameters/practice_parameters/list_band_types"
                    urlNew="/practice/band_types/new"
                />,
                <MusicGenres
                    urlListData="/parameters/practice_parameters/list_music_genres"
                    urlNew="/practice/music_genres/new"
                />,
                <Groups
                    urlListData="/parameters/practice_parameters/list_bands"
                    urlNew="/practice/bands/new"
                />,
                <Materials
                    urlListData="/parameters/practice_parameters/list_materials"
                    urlNew="/practice/materials/new"
                />,
                <FlatRate
                    urlListData="/parameters/practice_parameters/list_flat_rates"
                    urlNew="/practice/flat_rates/new"
                />,
                <Features
                    urlListData="/parameters/practice_parameters/list_features"
                    urlNew="/practice/room_features/new"
                />,
                <Instruments
                    urlListData="/parameters/practice_parameters/list_instruments"
                    urlNew="/instruments/new"
                />,
            ]}
        />
    );
}
