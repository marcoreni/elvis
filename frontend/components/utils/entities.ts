// FIXME: move elsewhere
// Only `id` is truly universal across every entity below; `label` is present
// on most but not all (see DEFAULT_LABEL_ACCESSOR's optional chaining), and
// `group_name` only exists on the `activities` table (see `Activity` below) —
// don't re-add it here even if narrowing surfaces a type error, fix the
// interface that needs it instead.
export interface Entity {
    id: number;
    label?: string;
}

export interface StudentEvaluationStat {
    teacher: Teacher;
    nb_students: number;
    nb_evaluated_students: number;
    nb_redirections: number;
    nb_informed_redirections: number;
    evaluations_completion_rate: number;
    evaluations_completion_rate_level: string;
    redirection_information_rate_level: string;
}

export interface Room extends Entity {}

export interface Level {
    activity_ref_id?: number;
    activity_ref?: ActivityRef;
    season_id?: number;
    evaluation_level_ref?: {
        label: string;
    };
}

export interface User extends Entity {
    first_name: string;
    last_name: string;
    planning: Planning;
    birthday: string;
    begin_at: string;
    stopped_at: string;
    levels: Level[];
}
export interface Teacher extends User {}

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
    user: User;
    desired_activity?: DesiredActivity;
}

export interface TimeInterval {
    start: string;
    end: string;
}

export interface ActivityRefKind extends Entity {
    name: string;
}

export interface ActivityRef extends Entity {
    is_work_group: boolean;
    occupation_limit?: number;
    activity_ref_kind_id?: number;
    activity_ref_kind: ActivityRefKind;
}
export interface StudentEvaluation extends Entity {
    student_id: number;
    answers: Answer[];
}

export interface Answer {
    question_id: string | number;
    value: any;
}

export interface School {
    academy: string;
    zone: string;
    name: string;
    email: string;
    phone_number: string;
    activities_not_subject_to_vat: boolean;
    siret_rna: string;
    rcs?: string;
    entity_subject_to_vat?: boolean;
}

export interface Activity extends Entity {
    group_name: string;
    users: User[];
    activities_instruments: ActivityInstrument[];
    options: Option[];
    time_interval_id: number;
    time_interval: TimeInterval;
    activity_ref_id: number;
    activity_ref: ActivityRef;
    student_evaluations: StudentEvaluation[];
    teacher: Teacher;
}

export interface Season extends Entity {
    previous?: Season;
}

export type ReferenceData = {
    id: number;
    group_name: string;
} & EntityData;

export type EntityData = {
    teachers: Teacher[];
    users: User[];
    payment_methods: Entity[];
    rooms: Entity[];
    locations: Entity[];
    seasons: Season[];
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
