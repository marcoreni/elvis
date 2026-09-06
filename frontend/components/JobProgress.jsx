import React from "react";
import { withTranslation } from "react-i18next";
import * as api from "../tools/api";
import swal from "sweetalert2";
import ProgressBar from "@ramonak/react-progress-bar";

class JobProgress extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            progressValue: 0,
            progressText: "",
        };
        this.trackProgress = this.trackProgress.bind(this);
    }

    componentDidMount() {
        this.trackProgress(this.props.jobId);
    }

    componentWillUnmount() {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
    }

    trackProgress(jobId) {
        const { t } = this.props;
        api.set()
            .success(({ jobStatus }) => {
                this.setState({
                    progressValue: Math.round(
                        (jobStatus.progress / jobStatus.total) * 100
                    ),
                    progressText: jobStatus.step,
                    status: jobStatus.status,
                    errors: jobStatus.errors || [],
                });
                if (
                    jobStatus.status !== "completed" &&
                    jobStatus.status !== "failed"
                ) {
                    this.timeout = setTimeout(
                        () => this.trackProgress(jobId),
                        1000
                    );
                }
            })
            .error(res => {
                swal({
                    title: t("common:jobProgress.errorTitle"),
                    text: res,
                    type: "error",
                });
                if (this.props.onError) {
                    this.props.onError(res);
                }
            })
            .get(`/jobs/${jobId}/status`, {});
    }

    render() {
        const { t } = this.props;
        const { status, progressValue, progressText, errors } = this.state;
        const statusText =
            status === "working"
                ? t("common:jobProgress.inProgress")
                : status === "completed"
                ? t("common:jobProgress.completed")
                : t("common:jobProgress.failed");

        return (
            <div>
                <ProgressBar completed={progressValue} />
                <p>
                    {statusText} - {progressText}
                </p>
                {(errors || []).length > 0 && (
                    <details>
                        <summary
                            style={{ color: "inherit", cursor: "pointer" }}
                        >
                            &#9654;{" "}
                            {t("common:jobProgress.errorCount", {
                                count: errors.length,
                            })}
                        </summary>
                        <ul>
                            {errors.map((error, index) => (
                                <li key={index}>
                                    {t("common:jobProgress.errorLine", {
                                        line: error.line,
                                        message: error.message,
                                    })}
                                </li>
                            ))}
                        </ul>
                    </details>
                )}
            </div>
        );
    }
}

export default withTranslation("common")(JobProgress);
