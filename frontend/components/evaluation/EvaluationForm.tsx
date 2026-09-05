import type React from "react";
import { useState } from "react";

import { useTranslation } from "react-i18next";
import Question, { checkCondition } from "./question";
import type {
    Answers,
    AnswerValue,
    ReferenceData,
    Question as TQuestion,
} from "./types";

export function filterQuestionsByCondition(
    questions: TQuestion[],
    answers: Answers
): TQuestion[] {
    return questions.filter(
        (q) => !q.condition || checkCondition(q.condition, questions, answers)
    );
}

export function checkRequiredQuestions(
    questions: TQuestion[],
    answers?: Answers
) {
    const requiredQuestions = questions
        .filter((q) => q.is_required)
        .map((q) => q.id.toString());

    return requiredQuestions.every((rq) => !!answers?.[rq]);
}

export function validateQuestions(questions: TQuestion[], answers: Answers) {
    return (
        Object.values(answers).length > 0 &&
        checkRequiredQuestions(
            filterQuestionsByCondition(questions, answers),
            answers
        )
    );
}

interface EvaluationFormProps {
    questions: TQuestion[];
    answers?: Answers;
    referenceData: ReferenceData;
    submitLabel?: string;
    className?: string;
    readOnly?: boolean;
    onChange?: (answers: Record<number, AnswerValue>) => void;
    onSubmit?: (answers: Record<number, AnswerValue>) => void;
}

export default function EvaluationForm(
    props: EvaluationFormProps
): React.ReactNode {
    const {
        referenceData,
        submitLabel,
        questions,
        className = "",
        readOnly,
        onSubmit,
    } = props;
    const { t } = useTranslation("evaluation");

    // replaces `this.state = { answers: { ...this.props.answers } }`
    const [answers, setAnswers] = useState<Record<number, AnswerValue>>({
        ...props.answers,
    });

    const handleAnswer = (questionId: number, answerValue: AnswerValue) => {
        const newAnswers: Record<number, AnswerValue> = {
            ...answers,
            [questionId]: answerValue,
        };

        const questionsToDisplay = filterQuestionsByCondition(
            questions,
            newAnswers
        ).map((q) => q.id);

        // Remove answers for questions that
        // are not displayed anymore because their
        // condition isn't met.
        const filteredAnswers = Object.entries(newAnswers).reduce<
            Record<number, AnswerValue>
        >((acc, [qId, v]) => {
            if (questionsToDisplay.includes(parseInt(qId)))
                return {
                    ...acc,
                    [qId]: v,
                };
            else return acc;
        }, {});

        props.onChange?.(filteredAnswers);

        setAnswers(filteredAnswers);
    };

    const questionsToDisplay = filterQuestionsByCondition(questions, answers);

    const areAllQuestionsAnswered = checkRequiredQuestions(
        questionsToDisplay,
        answers
    );

    const renderedQuestions = questionsToDisplay
        .sort((a, b) => a.order - b.order)
        .map((q, i) => (
            <div key={q.id}>
                {!!i && <div className="hr-line-dashed"></div>}
                <Question
                    question={q}
                    answer={answers[q.id]}
                    referenceData={referenceData}
                    readOnly={readOnly ?? false}
                    onChange={(v) => handleAnswer(q.id, v)}
                />
            </div>
        ));

    return (
        <div className={className + " flex-column"}>
            {renderedQuestions}
            {readOnly || !onSubmit || (
                <button
                    className="btn btn-primary"
                    style={{ alignSelf: "end" }}
                    disabled={!areAllQuestionsAnswered}
                    onClick={() => onSubmit(answers)}
                >
                    {submitLabel || t("form.defaultSubmitLabel")}
                </button>
            )}
        </div>
    );
}
