import type { EntityName } from "../utils/entities";

export type Condition = "!=" | "=";

export interface BaseQuestion {
    id: number;
    name: string;
    label: string;
    is_required: boolean;
    condition?: Condition;
    field_type: string;
    defaultValue: string | undefined;
    order: number;
    placeholder?: string;
}
export type RadioQuestion = BaseQuestion & {
    field_type: "radio";
    radio_values: string;
};

export type SelectQuestion = BaseQuestion & {
    field_type: "select";
    select_target: EntityName;
    select_values: string;
    is_multiple_select?: boolean;
};

export type Question = RadioQuestion | BaseQuestion | SelectQuestion;

export type AnswerValue = string | number | boolean | string[];

export type Answers = Record<string, AnswerValue>;
