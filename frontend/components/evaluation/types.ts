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

// FIXME: move elsewhere
export interface Entity {
    id: number;
    label: string;
    group_name: string;
}

export interface User extends Entity {
    first_name: string;
    last_name: string;
    planning: Planning;
}
export interface Planning extends Entity {}

export interface Activity extends Entity {
    users: User[];
}

export type ReferenceData = {
    id: number;
    group_name: string;
} & EntityData;

export type EntityData = {
    teachers: User[];
    users: User[];
    payment_methods: Entity[];
    rooms: Entity[];
    locations: Entity[];
    seasons: Entity[];
    activities: Activity[];
    evaluation_level_refs: Entity[];
};

export type EntityName =
    | "teachers"
    | "payment_methods"
    | "rooms"
    | "locations"
    | "seasons"
    | "activities"
    | "evaluation_level_refs";
