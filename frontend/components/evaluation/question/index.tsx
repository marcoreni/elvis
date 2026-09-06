import SelectQuestion from "./select_question";
import RadioQuestion from "./radio_question";
import { MESSAGES } from "../../../tools/constants";
import type {
    Answers,
    AnswerValue,
    Condition,
    RadioQuestion as TRadioQuestion,
    Question as TQuestion,
    SelectQuestion as TSelectQuestion,
    ReferenceData,
} from "../types";

const VALUES_SEPARATOR = ";";
const PROPS_SEPARATOR = ":";

const CONDITION_OPS: Record<string, Condition> = {
    NEQ_SYM: "!=",
    EQ_SYM: "=",
};

export function parseValues(radioValues: string): string[][] {
    const parsed = radioValues
        .split(VALUES_SEPARATOR)
        .map((v) => v.split(PROPS_SEPARATOR));

    return parsed;
}

export function checkCondition(
    condition: `${string}${"!=" | "="}${string}`,
    questions: TQuestion[],
    answers: Answers
): boolean | undefined {
    const op = Object.entries(CONDITION_OPS).find(
        ([_, op]) => condition.indexOf(op) !== -1
    )?.[0];

    if (!op) {
        return undefined;
    }

    const [questionName, questionExpectedValue] = condition
        .split(CONDITION_OPS[op])
        .map((q) => q.trim());

    const question = questions.find((q) => q.name === questionName);

    if (!question) {
        console.error("question with name %s not found", questionName);
        return false;
    }

    const answer = answers[question.id];

    if (answer === undefined) {
        return false;
    }

    switch (op) {
        case "EQ_SYM":
            return answer === questionExpectedValue;
        case "NEQ_SYM":
            return answer !== questionExpectedValue;
    }
}

export default function Question({
    answer,
    readOnly,
    question,
    referenceData,
    onChange,
}: {
    answer?: AnswerValue;
    readOnly: boolean;
    question: TQuestion;
    referenceData: ReferenceData;
    onChange: (value: string) => void;
}) {
    let questionField = null;
    const answerValue = answer === undefined ? question.defaultValue : answer;

    switch (question.field_type.toLowerCase()) {
        case "select":
            questionField = (
                <SelectQuestion
                    readOnly={readOnly}
                    question={question as TSelectQuestion}
                    referenceData={referenceData}
                    value={answerValue}
                    onChange={onChange}
                />
            );
            break;
        case "radio":
            questionField = (
                <RadioQuestion
                    readOnly={readOnly}
                    question={question as TRadioQuestion}
                    value={answerValue}
                    onChange={onChange}
                />
            );
            break;
        case "text":
        default:
            questionField = readOnly ? (
                <p>{answerValue || MESSAGES.no_answer}</p>
            ) : (
                <textarea
                    cols={32}
                    defaultValue={answerValue?.toString() ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                />
            );
            break;
    }

    return (
        <div className="form-group row">
            <label className="col-xs-6 col-form-label">
                {question.label}{" "}
                {question.is_required && (
                    <strong className="text-danger">*</strong>
                )}
            </label>
            <div className="col-xs-6">{questionField}</div>
        </div>
    );
}
