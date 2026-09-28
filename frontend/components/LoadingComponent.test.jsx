// Regression coverage added alongside the react-loader-spinner 3.1.14 -> 8.0.2 bump
// (chore/bump-react-loader-spinner). v8 dropped the single default-exported `Loader`
// component with a `type` prop in favor of one named component per spinner style
// (`import { Audio } from "react-loader-spinner"`). This component previously imported
// the v3 default export under the local name `Bars` but never passed a `type` prop, so
// v3's `defaultProps.type = "Audio"` meant it actually rendered the Audio spinner, not
// Bars — the v8 migration keeps that real (Audio) visual, now under an accurate import
// name, and this test locks the swapped-in behavior down: hidden by default, shown with
// the Audio spinner on the `loadingStart` window event, hidden again on `loadingEnd`.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import LoadingComponent from "./LoadingComponent";

test("renders nothing until a loadingStart event fires", () => {
    render(<LoadingComponent />);

    expect(screen.queryByLabelText("audio-loading")).not.toBeInTheDocument();
});

test("shows the Audio spinner on loadingStart and hides it again on loadingEnd", async () => {
    render(<LoadingComponent />);

    window.dispatchEvent(new Event("loadingStart"));
    await waitFor(() =>
        expect(screen.getByLabelText("audio-loading")).toBeInTheDocument()
    );

    window.dispatchEvent(new Event("loadingEnd"));
    await waitFor(() =>
        expect(screen.queryByLabelText("audio-loading")).not.toBeInTheDocument()
    );
});

test("removes its window listeners on unmount", () => {
    const { unmount } = render(<LoadingComponent />);

    unmount();
    window.dispatchEvent(new Event("loadingStart"));

    expect(screen.queryByLabelText("audio-loading")).not.toBeInTheDocument();
});
