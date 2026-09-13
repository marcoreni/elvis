// FIXME: move elsewhere

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

export interface Room extends Entity {
    kind?: string;
    location_id?: number;
}

export interface Location extends Entity {}

export interface EvaluationLevelRef extends Entity {
    value?: number;
}

export interface Level {
    id?: number;
    user_id?: number;
    activity_ref_id?: number;
    activity_ref?: ActivityRef;
    season_id?: number;
    evaluation_level_ref?: EvaluationLevelRef;
}

export interface Comment extends Entity {
    content: string;
    user_id?: number;
    commentable_id?: number;
    commentable_type?: string;
}

export interface Availability extends Entity {
    comment?: Comment | null;
}

// CHECK: begin_at/stopped_at are only sent by ActivityController#activities_list_json
// (LessonList.jsx, format.tsx's occupationInfos) -- absent from UserSerializer's shape
// (users_controller.rb#season_activities/#evaluate). `planning` is a real association but not in
// either season_activities/evaluate's include tree, so undefined there in practice.
export interface User extends Entity {
    first_name: string;
    last_name: string;
    birthday: string;
    is_teacher?: boolean;
    adherent_number?: number;
    begin_at?: string;
    stopped_at?: string;
    planning?: Planning;
    levels: Level[];
    activity_refs?: UserActivityRefSummary[];
}
export interface Teacher extends User {}

export interface UserActivityRefSummary {
    id: number;
    label: string;
    kind?: string;
    duration?: number;
}

// CHECK: `hours_count` is a real column but not in the serializer's attributes list -- don't add
// it here, it won't actually be sent.
export interface Planning extends Entity {
    is_locked?: boolean;
}

// UNVERIFIED: no serializer/model named ActivityInstrument found; ActivitySerializer's matching
// association (`activity_instances`) is commented out, so it's never sent on that path either.
// Confirm the real source or drop this interface.
export interface ActivityInstrument extends Entity {
    user_id: number | undefined;
    is_validated: boolean;
}

// UNVERIFIED: no call site in this file's import graph was found producing this shape.
export interface ActivityApplication extends Entity {
    user?: User;
}

export interface DesiredActivity extends Entity {
    activity_application?: ActivityApplication;
}

// UNRESOLVED: OptionSerializer only sends `id` -- `user`/`desired_activity` aren't in it and no
// producing call site was found. `user` is marked required but format.tsx defends against it
// being absent -- confirm the real call site before trusting this.
export interface Option extends Entity {
    user: User;
    desired_activity?: DesiredActivity;
}

export interface TimeInterval {
    id?: number;
    start: string;
    end: string;
    is_validated?: boolean;
    kind?: string;
    updated_at?: string;
}

export interface ActivityRefKind extends Entity {
    name: string;
}

export interface ActivityRef extends Entity {
    is_work_group: boolean;
    occupation_limit?: number;
    activity_ref_kind_id: number;
    activity_ref_kind: ActivityRefKind;
}

export interface StudentEvaluation extends Entity {
    activity_id?: number;
    teacher_id?: number;
    student_id: number;
    season_id?: number;
    answers: Answer[];
}

export interface Answer extends Entity {
    question_id: string | number;
    value: any;
}

export interface School {
    id: number;
    academy: string;
    zone: string;
    name: string;
    email: string;
    phone_number: string;
    logo?: string | null;
    activities_not_subject_to_vat: boolean;
    siret_rna: string;
    rcs?: string;
    entity_subject_to_vat?: boolean;
}

export interface Address extends Entity {
    street_address?: string;
    postcode?: string;
    city?: string;
    department?: string;
    country?: string;
}

export interface Activity extends Entity {
    group_name: string;
    users: User[];
    activities_instruments?: ActivityInstrument[];
    options?: Option[];
    time_interval: TimeInterval;
    activity_ref_id: number;
    activity_ref: ActivityRef;
    student_evaluations: StudentEvaluation[];
    teacher?: Teacher;
}

export interface Season extends Entity {
    start?: string;
    end?: string;
    is_current?: boolean;
    is_off?: boolean;
    nb_lessons?: number;
    next_season_id?: number;
    previous?: Season;
}

export type ReferenceData = {
    id: number;
    group_name: string;
} & EntityData;

// season_activities.html.erb includes `activity_refs` in its referenceData; evaluate.html.erb
// does not -- kept optional to reflect the split.
export type EntityData = {
    teachers: Teacher[];
    users: User[];
    payment_methods: Entity[];
    rooms: Entity[];
    locations: Entity[];
    seasons: Season[];
    activities: Activity[];
    evaluation_level_refs: Entity[];
    activity_refs?: ActivityRef[];
};

export type EntityName =
    | "teachers"
    | "payment_methods"
    | "rooms"
    | "locations"
    | "seasons"
    | "activities"
    | "evaluation_level_refs"
    | "activity_refs";
