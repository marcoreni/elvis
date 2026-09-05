import type { EntityName, Entity, Activity, User } from "../types";

const DEFAULT_VALUE_ACCESSOR = (d: Entity) => d.id;
const DEFAULT_LABEL_ACCESSOR = (d: Entity) => d.label;

function targetFactory<T extends Entity>({
    label = "NOM",
    setName,
    valueAccessor = DEFAULT_VALUE_ACCESSOR,
    labelAccessor = DEFAULT_LABEL_ACCESSOR,
}: {
    label?: string;
    setName: EntityName;
    valueAccessor?: (d: T) => number;
    labelAccessor?: (d: T) => string;
}): {
    setName: EntityName;
    label?: string;
    valueAccessor: (d: T) => number;
    labelAccessor: (d: T) => string;
} {
    return {
        label,
        setName,
        valueAccessor,
        labelAccessor,
    };
}

const LEVELS_TARGET = targetFactory({
    label: "Niveaux",
    setName: "evaluation_level_refs",
});

const ACTIVITIES_TARGET = targetFactory<Activity>({
    label: "Cours du prof sur la saison",
    setName: "activities",
    labelAccessor: (d) => {
        const studentsList = d.users
            .slice(0, 3)
            .map((u) => `${u.first_name} ${u.last_name}`)
            .join(", ");

        const studentsHint =
            (d.users.length &&
                `(${studentsList}${(d.users.length > 3 && "...") || ""})`) ||
            "";

        return `${d.group_name} ${studentsHint}`;
    },
});

const SEASONS_TARGET = targetFactory({
    label: "Saisons",
    setName: "seasons",
});

const LOCATIONS_TARGET = targetFactory({
    label: "Emplacements",
    setName: "locations",
});

const ROOMS_TARGET = targetFactory({
    label: "Salles",
    setName: "rooms",
});

const PAYMENT_METHODS = targetFactory({
    label: "Moyens de paiement",
    setName: "payment_methods",
});

const TEACHERS_TARGET = targetFactory<User>({
    label: "Professeurs",
    setName: "teachers",
    labelAccessor: (d) => `${d.first_name} ${d.last_name}`,
});

export default {
    evaluation_level_refs: LEVELS_TARGET,
    payment_methods: PAYMENT_METHODS,
    activities: ACTIVITIES_TARGET,
    locations: LOCATIONS_TARGET,
    teachers: TEACHERS_TARGET,
    seasons: SEASONS_TARGET,
    rooms: ROOMS_TARGET,
} as Record<EntityName, ReturnType<typeof targetFactory>>;
