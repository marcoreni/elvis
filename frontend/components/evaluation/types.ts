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

export type Answers = Record<number, AnswerValue>;

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
    birthday: string;
    begin_at: string;
    stopped_at: string;
}
export interface Planning extends Entity {}

export interface ActivityInstrument extends Entity {
    user_id: number | undefined;
    is_validated: boolean;
}

export interface ActivityApplication extends Entity {
    user?: User;
}

export interface DesiredActivity extends Entity {
    activity_application?: ActivityApplication;
}

export interface Option extends Entity {
    user?: User;
    desired_activity?: DesiredActivity;
}

export interface TimeInterval {
    start: string;
    end: string;
}

export interface ActivityRef extends Entity {
    is_work_group: boolean;
    occupation_limit?: number;
}

export interface Activity extends Entity {
    users: User[];
    activities_instruments: ActivityInstrument[];
    options: Option[];
    time_interval: TimeInterval;
    activity_ref: ActivityRef;
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
