import React, { Fragment } from "react";

import moment from "moment";

import _ from "lodash";
import { withTranslation } from "react-i18next";

import ButtonModal from "./common/ButtonModal";

class CommentSection extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            newComment: "",
            editedComment: null,
            comments: this.props.comments,
        };
    }

    render() {
        const { t } = this.props;
        return (
            <div>
                <div className="ibox">
                    <div className="ibox-title">
                        <h4>
                            {t("common:commentSection.title")}
                            <ButtonModal
                                modalProps={{
                                    style: { content: { position: "static" } },
                                }}
                                className="btn btn-xs btn-primary pull-right"
                                label={
                                    <Fragment>
                                        <i className="fas fa-plus m-r-sm" />{" "}
                                        {t("common:commentSection.addComment")}
                                    </Fragment>
                                }
                            >
                                {({ closeModal }) => (
                                    <div>
                                        <div className="modal-header">
                                            <p>
                                                {t(
                                                    "common:commentSection.addCommentTitle"
                                                )}
                                            </p>
                                        </div>
                                        <div className="modal-body">
                                            <input
                                                type="textarea"
                                                className="form-control"
                                                value={this.props.newComment}
                                                onChange={e =>
                                                    this.props.handleUpdateNewCommentContent(
                                                        e
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="modal-footer flex flex-space-between-justified">
                                            <button
                                                className="btn"
                                                style={{ marginRight: "auto" }}
                                                type="button"
                                                onClick={closeModal}
                                            >
                                                <i className="fas fa-times m-r-sm"></i>
                                                {t("common:actions.cancel")}
                                            </button>
                                            <button
                                                className="btn btn-primary pull-right"
                                                onClick={() => {
                                                    this.props.handleSaveComment();
                                                    closeModal();
                                                }}
                                            >
                                                <i className="fas fa-save m-r-sm"></i>
                                                {t(
                                                    "common:commentSection.save"
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </ButtonModal>
                        </h4>
                    </div>
                    {this.props.contextType && this.props.contextId ? (
                        <div className="ibox-content">
                            {_.chain(this.props.comments)
                                .orderBy(c => c.created_at)
                                .reverse()
                                .map((c, i) => (
                                    <div className="row" key={i}>
                                        <div className="col-lg-11">
                                            <p>
                                                {c.content} <br />
                                                <i>
                                                    <small>
                                                        {t(
                                                            "common:commentSection.byOn",
                                                            {
                                                                first:
                                                                    _.get(
                                                                        c,
                                                                        "user.first_name"
                                                                    ) ||
                                                                    t(
                                                                        "common:commentSection.unknownUser"
                                                                    ),
                                                                last:
                                                                    _.get(
                                                                        c,
                                                                        "user.last_name"
                                                                    ) ||
                                                                    t(
                                                                        "common:commentSection.unknownLast"
                                                                    ),
                                                                date: moment(
                                                                    c.created_at
                                                                ).format(
                                                                    "DD MMMM YYYY, à HH:mm"
                                                                ),
                                                            }
                                                        )}
                                                        {c.created_at ==
                                                        c.updated_at ? null : (
                                                            <span>
                                                                <br />
                                                                {t(
                                                                    "common:commentSection.modifiedOn",
                                                                    {
                                                                        date: moment(
                                                                            c.updated_at
                                                                        ).format(
                                                                            "DD MMMM YYYY, à HH:mm"
                                                                        ),
                                                                    }
                                                                )}
                                                            </span>
                                                        )}
                                                    </small>
                                                </i>
                                            </p>
                                            <hr />
                                        </div>
                                        <div className="col-lg-1">
                                            {this.props.userId == c.user_id ? (
                                                <ButtonModal
                                                    onClick={() =>
                                                        this.props.handleCommentEdition(
                                                            c.id
                                                        )
                                                    }
                                                    modalProps={{
                                                        style: {
                                                            content: {
                                                                position:
                                                                    "static",
                                                            },
                                                        },
                                                    }}
                                                    className="btn btn-xs btn-primary pull-right"
                                                    label={
                                                        <i className="fas  fa-edit" />
                                                    }
                                                >
                                                    {({ closeModal }) => (
                                                        <div className="modal-content animated">
                                                            <div className="modal-header">
                                                                <p>
                                                                    {t(
                                                                        "common:commentSection.editCommentTitle"
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <div className="modal-body">
                                                                <input
                                                                    type="textarea"
                                                                    className="form-control"
                                                                    value={
                                                                        this
                                                                            .props
                                                                            .editedComment
                                                                            ? this
                                                                                  .props
                                                                                  .editedComment
                                                                                  .content
                                                                            : ""
                                                                    }
                                                                    onChange={e =>
                                                                        this.props.handleUpdateEditedCommentContent(
                                                                            e
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                            <div className="modal-footer flex flex-space-between-justified">
                                                                <button
                                                                    className="btn"
                                                                    style={{
                                                                        marginRight:
                                                                            "auto",
                                                                    }}
                                                                    onClick={
                                                                        closeModal
                                                                    }
                                                                    type="button"
                                                                >
                                                                    <i className="fas fa-times m-r-sm"></i>
                                                                    {t(
                                                                        "common:actions.cancel"
                                                                    )}
                                                                </button>
                                                                <button
                                                                    className="btn btn-primary pull-right"
                                                                    onClick={() => {
                                                                        this.props.handleSaveCommentEdition();
                                                                        closeModal();
                                                                    }}
                                                                >
                                                                    <i className="fas fa-save m-r-sm"></i>
                                                                    {t(
                                                                        "common:commentSection.save"
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </ButtonModal>
                                            ) : null}
                                        </div>
                                    </div>
                                ))
                                .value()}
                        </div>
                    ) : (
                        <div className="ibox-content">
                            {t("common:commentSection.needSchedule")}
                        </div>
                    )}
                </div>
            </div>
        );
    }
}

export default withTranslation("common")(CommentSection);
