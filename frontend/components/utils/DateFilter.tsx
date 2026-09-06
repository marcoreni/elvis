import React, { useState } from "react";

import moment from "moment";

interface DateParts {
    d: number | null;
    m: number | null;
    y: number | null;
}

interface DateFilterProps {
    minYear: string | number | Date;
    maxYear: string | number | Date;
    onChange: (date: DateParts | "") => void;
}

const DateFilter: React.FC<DateFilterProps> = (props) => {
    const [date, setDate] = useState<DateParts>({
        d: null,
        m: null,
        y: null,
    });

    const handleDateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const name = event.target.name as keyof DateParts;
        const newDate: DateParts = { ...date };
        newDate[name] =
            event.target.value === "" ? null : parseInt(event.target.value);

        if (event.target.value === "") {
            if (name === "y") {
                newDate.m = null;
                newDate.d = null;
            } else if (name === "m") {
                newDate.d = null;
            }
        }

        if (!newDate.y && !newDate.m && !newDate.d) props.onChange("");
        else props.onChange(newDate);

        setDate(newDate);
    };

    const minYear = moment(props.minYear).year();
    const maxYear = moment(props.maxYear).year();

    return (
        <div>
            <RangedSelect
                min={minYear}
                max={maxYear + 3}
                name="y"
                value={date.y}
                onChange={handleDateChange}
                placeholder="Année"
            />
            <RangedSelect
                min={1}
                max={13}
                name="m"
                value={date.m}
                onChange={handleDateChange}
                placeholder="Mois"
                enabled={!!date.y}
            />
            <RangedSelect
                min={1}
                max={32}
                name="d"
                value={date.d}
                onChange={handleDateChange}
                placeholder="Jour"
                enabled={!!date.y && !!date.m}
            />
        </div>
    );
};

export interface RangedSelectProps {
    min: number;
    max: number;
    name: string;
    value?: number | null;
    placeholder?: string;
    enabled?: boolean;
    style?: React.CSSProperties;
    className?: string;
    defaultDisabled?: boolean;
    cell?: (i: number) => React.ReactNode;
    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

/**
 * Returns a ranged select.
 *
 * @param props
 *      min : minimum of ranged select
 *      max : maximum of ranged select
 *      name : name of the field
 *      value : value of the field
 *      placeholder : placeholder value text
 *      enabled : whether the field is enabled or not
 *      onChange : handler of change event on field
 */
export function RangedSelect(props: RangedSelectProps) {
    const {
        min,
        max,
        name,
        value,
        placeholder,
        enabled,
        style,
        className,
        defaultDisabled,
        cell,
        onChange,
    } = props;

    if (typeof min !== "number" || typeof max !== "number")
        throw new Error("the arguments need to be integers");

    return (
        <select
            name={name}
            style={style}
            className={className}
            value={value || ""}
            disabled={enabled === false}
            onChange={onChange}
        >
            <option key="default" disabled={defaultDisabled} value="">
                {placeholder}
            </option>
            {Array.from({ length: max - min }, (_, i) => i + min).map((i) => (
                <option key={i} value={i}>
                    {cell && typeof cell === "function" ? cell(i) : i}
                </option>
            ))}
        </select>
    );
}

export default DateFilter;
