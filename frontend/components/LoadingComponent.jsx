import React from "react";
import { Audio } from "react-loader-spinner";

export default function LoadingComponent() {
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        const loadingStartFunc = () => {
            setLoading(true);
        };

        const loadingEndFunc = () => {
            setLoading(false);
        };

        window.addEventListener("loadingStart", loadingStartFunc);
        window.addEventListener("loadingEnd", loadingEndFunc);

        return () => {
            window.removeEventListener("loadingStart", loadingStartFunc);
            window.removeEventListener("loadingEnd", loadingEndFunc);
        };
    }, []);

    return (
        loading && (
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 9999,
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                    }}
                >
                    {/* This overlay has always visually been the Audio equalizer spinner,
                        never Bars -- v3's default `Loader` export was imported here as `Bars`
                        but no `type` prop was ever passed, so its `defaultProps.type = "Audio"`
                        silently won. */}
                    <Audio
                        height="100"
                        width="100"
                        color="#0079BF"
                        ariaLabel="audio-loading"
                        wrapperClass=""
                        visible={true}
                    />
                </div>
            </div>
        )
    );
}
