import React, { Fragment } from "react";
import * as api from "../tools/api";
import swal from "sweetalert2";
import { useTranslation } from "react-i18next";

// Shape of the JSON returned by the `generic_destroy` route (app/controllers/remove_controller.rb
// #destroy): always `{ message, success }`, whether destruction succeeded or not.
export interface RemoveComponentResult {
    success: boolean;
    message?: string;
}

interface RemoveComponentProps {
    /** Ruby class name, used in the destroy URL (e.g. "User", "season", "activity_ref"). */
    classname: string;
    /** Id of the object to remove. */
    id: number;
    /** Text shown in the confirmation popup. */
    validationText?: string;
    /** Extra text shown under the confirmation popup's title. */
    additionalMessage?: string;
    /** Text shown in the button. Not used if `children` is set. */
    text?: string;
    /** Props to pass to the button. */
    btnProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
    /** Callback on success. Leave unset for the default redirect-with-swal behavior. */
    onSuccess?: (data: RemoveComponentResult) => void;
    /** Callback on failure. Leave unset to just show a swal. */
    onFailed?: (data: RemoveComponentResult) => void;
    /** Children to display in the button. */
    children?: React.ReactNode;
}

/**
 * Standard UI entry point for destroying a record with dependencies -- pairs with
 * app/jobs/destroy_job.rb and the `generic_destroy` route. See docs/RemoveController.md.
 */
export default function RemoveComponent({
    classname,
    id,
    validationText,
    text,
    btnProps,
    onSuccess,
    onFailed,
    children,
    additionalMessage,
}: RemoveComponentProps) {
    const { t } = useTranslation("common");

    const localOnSuccess = (data: RemoveComponentResult) => {
        if (typeof onSuccess === "function") {
            onSuccess(data);
        } else {
            swal.fire({
                title: t("common:removeComponent.successTitle"),
                html:
                    data.message || t("common:removeComponent.successMessage"),
                icon: "success",
            }).then(() => {
                // redirect to index of model or to root
                let tabParams = window.location.href.split("/");

                if (tabParams[tabParams.length - 1] === "edit") {
                    tabParams.pop(); // remove edit
                    tabParams.pop(); // remove id
                } else if (!isNaN(parseInt(tabParams[tabParams.length - 1]))) {
                    // if last part is an number
                    tabParams.pop(); // remove id
                }

                window.location.href = tabParams.join("/");
            });
        }
    };

    const localOnFailed = (data: RemoveComponentResult) => {
        if (typeof onFailed === "function") {
            onFailed(data);
        } else {
            swal.fire({
                title: t("common:removeComponent.errorTitle"),
                html: data.message || t("common:removeComponent.errorMessage"),
                icon: "error",
            });
        }
    };

    const onSubmit = () => {
        swal.fire({
            icon: "warning",
            title: validationText || t("common:removeComponent.confirmTitle"),
            text: additionalMessage,
            showCancelButton: true,
            confirmButtonText: t("common:yesNo.yes"),
            cancelButtonText: t("common:yesNo.no"),
        }).then((result) => {
            if (result.isConfirmed) {
                api.set()
                    .success((data: RemoveComponentResult) => {
                        if (data.success) {
                            localOnSuccess(data);
                        } else {
                            localOnFailed(data);
                        }
                    })
                    .error((data: RemoveComponentResult) => {
                        localOnFailed(data);
                    })
                    .del(`/destroy/${classname}/${id}`, undefined);
            }
        });
    };

    const resolvedBtnProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {
        ...btnProps,
        className: btnProps?.className || "btn btn-danger",
    };

    return (
        <button {...resolvedBtnProps} onClick={onSubmit}>
            {children ? (
                children
            ) : (
                <Fragment>
                    <i className="fas fa-trash m-r-sm" />{" "}
                    {text || t("common:actions.delete")}
                </Fragment>
            )}
        </button>
    );
}
