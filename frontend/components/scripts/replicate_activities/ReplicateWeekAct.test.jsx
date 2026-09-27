// Regression coverage for ReplicateWeekAct's showJobProgressModal -- this file had a near-verbatim
// copy of ActivitiesApplicationsList.jsx's showJobProgressModal (same JobProgress + detached
// container + swal.fire({html: container}) shape) that was missed by the React 18 bump's original
// audit: it was still using the legacy `ReactDOM.render()` API, with no unmount on modal close.
// Migrated to react-dom/client's createRoot(), with the same two unmount paths as
// ActivitiesApplicationsList.jsx: the normal close (swal's didClose) and the self-superseding-modal
// case (JobProgress's own error handling calling this.props.onError, see JobProgress.jsx and
// ActivitiesApplicationsList.test.jsx for the full explanation of why didClose alone isn't enough).

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../../i18n";
import ReplicateWeekAct from "./ReplicateWeekAct";

vi.mock("../../JobProgress", () => {
    const state = { mounted: false, unmounted: false };
    class JobProgressStub extends React.Component {
        componentDidMount() {
            state.mounted = true;
        }
        componentWillUnmount() {
            state.unmounted = true;
        }
        render() {
            return (
                <div data-testid="job-progress-stub">
                    {/* Stands in for JobProgress's own trackProgress .error() handler calling
                        this.props.onError(res) -- see JobProgress.jsx. */}
                    <button
                        data-testid="job-progress-stub-trigger-error"
                        onClick={() => this.props.onError("boom")}
                    >
                        trigger error
                    </button>
                </div>
            );
        }
    }
    return { default: JobProgressStub, __jobProgressState: state };
});

import * as JobProgressModule from "../../JobProgress";

beforeEach(async () => {
    await i18n.changeLanguage("fr");
    JobProgressModule.__jobProgressState.mounted = false;
    JobProgressModule.__jobProgressState.unmounted = false;
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve({ jobId: 123 }),
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

// Fills the three required date fields and submits, up to (and including) the job-progress modal
// actually opening with the JobProgress stub mounted.
async function submitAndOpenJobProgressModal(container) {
    fireEvent.change(container.querySelector("#refWeekDate"), {
        target: { value: "2024-01-01" },
    });
    fireEvent.change(container.querySelector("#targetStartDate"), {
        target: { value: "2024-02-01" },
    });
    fireEvent.change(container.querySelector("#targetEndDate"), {
        target: { value: "2024-02-08" },
    });

    await userEvent.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
        expect(JobProgressModule.__jobProgressState.mounted).toBe(true)
    );
    expect(await screen.findByTestId("job-progress-stub")).toBeInTheDocument();
    expect(JobProgressModule.__jobProgressState.unmounted).toBe(false);
}

describe("ReplicateWeekAct — showJobProgressModal uses createRoot and unmounts on modal close (regression)", () => {
    test("closing the job-progress modal calls JobProgress's componentWillUnmount", async () => {
        const { container } = render(<ReplicateWeekAct />);

        await submitAndOpenJobProgressModal(container);

        await userEvent.click(screen.getByRole("button", { name: "Ok" }));

        await waitFor(() =>
            expect(JobProgressModule.__jobProgressState.unmounted).toBe(true)
        );
    });

    test("onError (self-superseding-modal case) unmounts the createRoot too, even without didClose firing", async () => {
        const { container } = render(<ReplicateWeekAct />);

        await submitAndOpenJobProgressModal(container);

        // Simulate JobProgress's own error handler calling this.props.onError(res) -- no "Ok"
        // click, no didClose: the original modal's own close path never runs.
        await userEvent.click(
            screen.getByTestId("job-progress-stub-trigger-error")
        );

        await waitFor(() =>
            expect(JobProgressModule.__jobProgressState.unmounted).toBe(true)
        );
    });
});
