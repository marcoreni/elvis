import { reactOptionMapper } from "../../utils";
import TARGETS from "./select_targets";
import Select from "react-select";
import { MESSAGES } from "../../../tools/constants";
import { parseValues } from ".";
import { fullname } from "../../../tools/format";
import type {
    Activity,
    AnswerValue,
    Entity,
    EntityName,
    ReferenceData,
    SelectQuestion as TSelectQuestion,
} from "../types";

function createTargetOptions(
    selectTarget: EntityName,
    referenceData: ReferenceData
): Option[] {
    const target = TARGETS[selectTarget];

    try {
        return referenceData[target.setName].map(
            reactOptionMapper({
                id: target.valueAccessor,
                label: target.labelAccessor,
            })
        );
    } catch (err) {
        console.error(
            "Target %s is not supported, please add it to select_question source"
        );
        return [{ label: `TARGET ${selectTarget} NOT SUPPORTED` }];
    }
}

interface Option {
    value?: string;
    label: string;
}
function createStaticOptions(options: string): Option[] {
    return parseValues(options).map(([label, value]) => ({
        value,
        label,
    }));
}

function createOptions(
    selectValues: string,
    selectTarget: EntityName,
    referenceData: ReferenceData
) {
    const result: Option[] = [];

    if (selectValues !== null)
        result.push(...createStaticOptions(selectValues));

    if (selectTarget !== null)
        result.push(...createTargetOptions(selectTarget, referenceData));

    return result;
}

function formatActivities(
    activities: string[],
    activityEntityList: Activity[]
): JSX.Element | undefined {
    const groups = activities.map((a, i) => {
        const ref = activityEntityList.find((r) => r.id === parseInt(a));

        if (ref) {
            return (
                <li key={i}>
                    <span className="label label-primary">
                        {ref.group_name}
                    </span>
                    <ul>
                        {ref.users.slice(0, 3).map((u, j) => (
                            <li key={j}>{fullname(u)}</li>
                        ))}
                        <li key={ref.users.length}>{"..."}</li>
                    </ul>
                </li>
            );
        }

        return null;
    });

    if (!groups.filter(Boolean).length) {
        return undefined;
    }

    return <ul>{groups}</ul>;
}

export default function SelectQuestion({
    value,
    question,
    readOnly,
    onChange,
    referenceData,
}: {
    value?: AnswerValue;
    question: TSelectQuestion;
    readOnly: boolean;
    onChange: (value: string) => void;
    referenceData: ReferenceData;
}) {
    const {
        select_target,
        select_values,
        is_multiple_select: isMulti = false,
        name,
    } = question;

    const values =
        (value && typeof value === "string" ? value.split(",") : []) || [];

    const options: Option[] = [
        { value: "", label: question.placeholder || "" },
        ...createOptions(select_values, select_target, referenceData),
    ];

    const selectValues = options.filter(
        (o) => o.value && values.includes(o.value.toString())
    );

    if (readOnly) {
        if (select_target === "activities") {
            const formatedActs = formatActivities(
                values,
                referenceData[select_target]
            );

            if (formatedActs) return formatedActs;
        }

        return selectValues.length ? (
            <div className="flex-column">
                {selectValues.map(({ value, label }) => (
                    <span key={value}>
                        {selectValues.length > 1 && "- "}
                        {label}
                    </span>
                ))}
            </div>
        ) : (
            question.placeholder || MESSAGES.no_answer
        );
    } else {
        // FIXME: change type after react-select upgrade
        const onChangeValue = (val: any) => {
            const values = isMulti
                ? Array.isArray(val)
                    ? val.map((v) => v.value)
                    : []
                : [val.value];
            onChange(values.join(","));
        };

        return (
            <Select
                name={name}
                options={options}
                defaultValue={selectValues}
                isMulti={isMulti}
                onChange={onChangeValue}
            />
        );
    }
}
