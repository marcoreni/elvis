import { useTranslation } from "react-i18next";
import EvaluationForm from "../evaluation/EvaluationForm";
import Modal from "react-modal";
import { getAnswersObject } from "../evaluation/Evaluation";
import { fullname } from "../../tools/format";
import type { Question, ReferenceData, User } from "../evaluation/types";

const QuestionnaireModal = ({
    student,
    questions,
    questionnaire,
    referenceData,
    toggleModal,
    isOpen,
}: {
    student?: User;
    questions?: Question[];
    questionnaire?: { answers: any };
    referenceData: ReferenceData;
    toggleModal: () => void;
    isOpen: boolean;
}) => {
    const { t } = useTranslation("planning");
    const isLoading = !student || !questions || !questionnaire;

    return (
        <Modal
            ariaHideApp={false}
            isOpen={isOpen}
            className="test2"
            onRequestClose={toggleModal}
            style={{ content: { overflow: "auto" } }}
        >
            <div>
                <button
                    className="btn btn-default pull-right"
                    onClick={toggleModal}
                >
                    <i className="fas fa-times" />
                </button>

                {isLoading ? (
                    <p>{t("common:reactTable.loadingText")}</p>
                ) : (
                    <div>
                        <h3>{fullname(student)}</h3>
                        <EvaluationForm
                            readOnly
                            className="p"
                            questions={questions}
                            referenceData={referenceData}
                            answers={getAnswersObject(questionnaire.answers)}
                        />
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default QuestionnaireModal;
