/**
 * @param {{defaultStart: Date, defaultEnd: Date, onChange: ({start: Date, end: Date}) => void}} props
 *        onChange is called only when start AND end are set, or when both are cleared
 * @returns {JSX.Element}
 * @constructor
 */
export default function DateRangePicker({
    defaultStart,
    defaultEnd,
    onChange,
}) {
    let start = defaultStart;
    let end = defaultEnd;

    const handleStart = e => {
        const value = e.target.value; // "yyyy-MM-dd" or ""

        if (!value) start = undefined;
        else start = new Date(value);

        emit();
    };

    const handleEnd = e => {
        const value = e.target.value; // "yyyy-MM-dd" or ""

        if (!value) end = undefined;
        else end = new Date(value);

        emit();
    };

    const emit = () => {
        if (!onChange) return;

        if (start && end) onChange({ start: start, end: end });
        else if (!start && !end) onChange({ start: undefined, end: undefined });
    };

    return (
        <span
            style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}
        >
            <input
                type="date"
                className="form-control"
                value={toInputValue(start)}
                onChange={handleStart}
            />
            {" → "}
            <input
                type="date"
                className="form-control"
                value={toInputValue(end)}
                onChange={handleEnd}
            />
        </span>
    );
}

function toInputValue(date) {
    if (!date) return "";

    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return d.toISOString().slice(0, 10);
}
