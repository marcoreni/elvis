import React, { useState } from "react";
import Modal from "react-modal";
import { useTranslation } from "react-i18next";
import * as api from "../../tools/api";
import { toast } from "react-toastify";
import { Availability, User, Comment } from "../utils/entities";

// --- Types ---

export interface AvailabilityCommentModalProps {
    availability: Availability;
    user: User;
    onSaved: (interval: Availability) => void;
    onClose: () => void;
}

// --- Component ---

const AvailabilityCommentModal: React.FC<AvailabilityCommentModalProps> = ({
    availability,
    user,
    onSaved,
    onClose,
}) => {
    const { t } = useTranslation(["planning", "common"]);

    // Initialize state with optional chaining instead of lodash
    const [commentValue, setCommentValue] = useState<string>(
        availability?.comment?.content || ""
    );

    const handleSaveComment = () => {
        const commentId = availability?.comment?.id;

        const body = {
            comment: {
                content: commentValue,
                user_id: user.id,
                commentable_id: availability.id,
                commentable_type: "TimeInterval",
            },
        };

        const request = api
            .set()
            .success((comment: Comment) => {
                const newInterval = {
                    ...availability,
                    comment,
                };

                onSaved(newInterval);
            })
            .error(toast.error);

        // Update or create comment
        if (commentId) {
            request.patch(`/comments/${commentId}`, body);
        } else {
            request.post("/comments", body);
        }
    };

    const handleDeleteComment = () => {
        const commentId = availability?.comment?.id;

        if (!commentId) return;

        api.set()
            .success(() =>
                onSaved({
                    ...availability,
                    comment: null,
                })
            )
            .error(toast.error)
            .del(`/comments/${commentId}`);
    };

    const commentExists = !!availability?.comment?.id;

    return (
        <Modal
            isOpen
            ariaHideApp={false}
            className="col-xs-12 col-lg-3 flex-column"
            onRequestClose={onClose}
        >
            <h3>{t("planning:availabilityCommentModal.title")}</h3>
            <textarea
                className="form-control"
                placeholder={t("planning:availabilityInput.commentPlaceholder")}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setCommentValue(e.target.value)
                }
                value={commentValue}
            />
            <div className="flex flex-space-between-justified m-t">
                <button
                    className="btn"
                    style={{ marginRight: "auto" }}
                    type="button"
                    onClick={onClose}
                >
                    <i className="fas fa-times m-r-sm"></i>
                    {t("common:actions.cancel")}
                </button>
                <div>
                    {commentExists && (
                        <button
                            onClick={handleDeleteComment}
                            className="btn btn-warning m-r-sm"
                            type="button"
                        >
                            <i className="fas fa-trash"></i>
                        </button>
                    )}
                    <button
                        className="btn btn-primary"
                        onClick={handleSaveComment}
                        type="button"
                    >
                        <i className="fas fa-save"></i>{" "}
                        {t("common:actions.save")}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AvailabilityCommentModal;
