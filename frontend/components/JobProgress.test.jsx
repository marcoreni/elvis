// Regression coverage for JobProgress's self-poll loop under unmount.
//
// trackProgress() polls /jobs/:id/status via setTimeout, rescheduling itself from its own success
// handler until the job reaches a terminal status. componentWillUnmount only cleared a *pending*
// (already-scheduled) timeout -- if a status request was in flight when the modal closed and this
// component unmounted, the response still arrived, called setState() post-unmount, and
// rescheduled another setTimeout, restarting a poll loop nothing could ever clear again. Fixed by
// an `unmounted` instance flag, set in componentWillUnmount and checked at the top of both the
// success and error handlers before doing anything else.

import React from "react";
import { render } from "@testing-library/react";
import i18n from "../i18n";
import JobProgress from "./JobProgress";

const okJson = (body) =>
    Promise.resolve({
        ok: true,
        headers: {
            get: (h) => (h === "Content-type" ? "application/json" : null),
        },
        json: () => Promise.resolve(body),
    });

const makeProps = (overrides = {}) => ({
    jobId: 42,
    t: i18n.getFixedT(i18n.language, "common"),
    ...overrides,
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("JobProgress -- unmounting while a status request is in flight (regression)", () => {
    test("the poll loop actually stops: no further setTimeout/fetch calls after unmount", async () => {
        let resolveFetch;
        global.fetch = vi.fn(
            () =>
                new Promise((resolve) => {
                    resolveFetch = resolve;
                })
        );
        const consoleError = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        const setTimeoutSpy = vi.spyOn(global, "setTimeout");

        const { unmount } = render(<JobProgress {...makeProps()} />);

        // componentDidMount's first trackProgress() call issued the request; it's still pending.
        expect(global.fetch).toHaveBeenCalledTimes(1);

        unmount();
        setTimeoutSpy.mockClear();

        // The in-flight request resolves *after* unmount, with a non-terminal status -- the
        // pre-fix code would setState() here and schedule another poll via setTimeout(..., 1000).
        resolveFetch(
            await okJson({
                jobStatus: {
                    progress: 1,
                    total: 10,
                    step: "working",
                    status: "working",
                    errors: [],
                },
            })
        );

        // Flush the response's .then() chain (handleResponse -> response.json() -> success
        // callback) -- a macrotask reliably runs after all of it, whatever spied timers exist.
        await new Promise((resolve) => setTimeout(resolve, 0));

        const pollingTimeouts = setTimeoutSpy.mock.calls.filter(
            (call) => call[1] === 1000
        );
        expect(pollingTimeouts).toHaveLength(0);
        expect(global.fetch).toHaveBeenCalledTimes(1);

        // No "setState on an unmounted component" warning either -- the guard returns before that
        // call, not just before the setTimeout. (Other unrelated console.error noise, e.g. React's
        // own act() deprecation warning, is not what this assertion is about.)
        const unmountedWarnings = consoleError.mock.calls.filter((call) =>
            String(call[0]).includes("unmounted component")
        );
        expect(unmountedWarnings).toHaveLength(0);
    });

    test("an error response arriving after unmount doesn't show a swal or call onError", async () => {
        let resolveFetch;
        global.fetch = vi.fn(
            () =>
                new Promise((resolve) => {
                    resolveFetch = resolve;
                })
        );
        const onError = vi.fn();

        const { unmount } = render(<JobProgress {...makeProps({ onError })} />);
        unmount();

        resolveFetch({
            ok: false,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ errors: ["boom"] }),
        });

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(onError).not.toHaveBeenCalled();
    });
});
