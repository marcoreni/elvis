import { MESSAGES } from "../../../tools/constants";
import { parseValues } from ".";
import type { AnswerValue, RadioQuestion as TRadioQuestion } from "../types";

export const radioValue = (
    { radio_values }: TRadioQuestion,
    value?: AnswerValue
) =>
    value
        ? parseValues(radio_values).find(([, val]) => val === value)?.[0]
        : MESSAGES.no_answer;

interface RadioQuestionProps {
    readOnly?: boolean;
    question: TRadioQuestion;
    onChange?: (value: string) => void;
    value?: AnswerValue;
}

export default function RadioQuestion({
    readOnly,
    question,
    onChange,
    value,
}: RadioQuestionProps) {
    if (readOnly) {
        return <p>{radioValue(question, value)}</p>;
    } else {
        const radioValues = parseValues(question.radio_values);

        return (
            <div>
                {radioValues.map(([lab, val]) => {
                    const inputId = `question${question.id}-${val}`;

                    return (
                        <div key={val} className="p-w-xs m-b-xs bg-muted">
                            <label className="full-width">
                                <input
                                    type="radio"
                                    id={inputId}
                                    name={question.name}
                                    defaultChecked={value === val}
                                    onChange={(e) => onChange?.(e.target.value)}
                                    value={val}
                                />

                                <span className="m-l-sm">{lab}</span>
                            </label>
                        </div>
                    );
                })}
            </div>
        );
    }
}
